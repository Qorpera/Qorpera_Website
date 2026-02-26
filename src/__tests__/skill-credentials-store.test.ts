import { describe, it, expect, vi, beforeEach } from "vitest";
import os from "node:os";
import path from "node:path";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockUpsert, mockDeleteMany, mockFindMany, mockFindUnique,
  mockAccess, mockReadFile, mockRename,
} = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockAccess: vi.fn(),
  mockReadFile: vi.fn(),
  mockRename: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    skillCredential: {
      upsert: mockUpsert,
      deleteMany: mockDeleteMany,
      findMany: mockFindMany,
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("node:fs/promises", () => ({
  default: {
    access: mockAccess,
    readFile: mockReadFile,
    rename: mockRename,
  },
  access: mockAccess,
  readFile: mockReadFile,
  rename: mockRename,
}));

// Use real crypto-secrets (dev key, no env dep)
vi.stubEnv("APP_SECRET", "test-secret-long-enough-32chars!!");

import {
  setSkillCredential,
  deleteSkillCredential,
  getSkillCredentialStatus,
  getDecryptedSkillEnvVars,
  getDecryptedSkillEnvVar,
  buildSkillEnvForJob,
  migrateSkillEnvFileToDb,
} from "@/lib/skill-credentials-store";
import { encryptSecret, decryptSecret } from "@/lib/crypto-secrets";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER = "user-abc";
const VAR = "OPENAI_API_KEY";
const VALUE = "sk-test-1234567890";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: fs.access throws (file not found)
  mockAccess.mockRejectedValue(new Error("ENOENT"));
});

// ---------------------------------------------------------------------------
// setSkillCredential
// ---------------------------------------------------------------------------

describe("setSkillCredential", () => {
  it("upserts with encrypted key and keyLast4", async () => {
    mockUpsert.mockResolvedValue({});
    await setSkillCredential(USER, VAR, VALUE);

    expect(mockUpsert).toHaveBeenCalledOnce();
    const call = mockUpsert.mock.calls[0][0];
    expect(call.where).toEqual({ userId_varName: { userId: USER, varName: VAR } });
    expect(call.create.userId).toBe(USER);
    expect(call.create.varName).toBe(VAR);
    expect(call.create.keyLast4).toBe(VALUE.slice(-4));

    // Encrypted key round-trips
    const decrypted = decryptSecret(call.create.encryptedKey);
    expect(decrypted).toBe(VALUE);
  });

  it("sets keyLast4 to null for very short values", async () => {
    mockUpsert.mockResolvedValue({});
    await setSkillCredential(USER, VAR, "ab");
    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.keyLast4).toBeNull();
  });

  it("update payload mirrors create payload", async () => {
    mockUpsert.mockResolvedValue({});
    await setSkillCredential(USER, VAR, VALUE);
    const call = mockUpsert.mock.calls[0][0];
    expect(call.update.encryptedKey).toBe(call.create.encryptedKey);
    expect(call.update.keyLast4).toBe(call.create.keyLast4);
  });
});

// ---------------------------------------------------------------------------
// deleteSkillCredential
// ---------------------------------------------------------------------------

describe("deleteSkillCredential", () => {
  it("calls deleteMany with userId and varName", async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });
    await deleteSkillCredential(USER, VAR);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: USER, varName: VAR } });
  });
});

// ---------------------------------------------------------------------------
// getSkillCredentialStatus
// ---------------------------------------------------------------------------

describe("getSkillCredentialStatus", () => {
  it("returns empty array for empty varNames", async () => {
    const result = await getSkillCredentialStatus(USER, []);
    expect(result).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("marks DB-stored var as isSet=true, isManaged=false", async () => {
    mockFindMany.mockResolvedValue([{ varName: VAR, keyLast4: "7890" }]);
    const result = await getSkillCredentialStatus(USER, [VAR]);
    expect(result).toEqual([{ varName: VAR, isSet: true, keyLast4: "7890", isManaged: false }]);
  });

  it("marks process.env var as isSet=true, isManaged=true", async () => {
    mockFindMany.mockResolvedValue([]);
    vi.stubEnv(VAR, "sk-env-value-xyz");
    const result = await getSkillCredentialStatus(USER, [VAR]);
    expect(result[0].isSet).toBe(true);
    expect(result[0].isManaged).toBe(true);
    vi.unstubAllEnvs();
  });

  it("marks missing var as isSet=false", async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getSkillCredentialStatus(USER, ["MISSING_VAR"]);
    expect(result).toEqual([{ varName: "MISSING_VAR", isSet: false, keyLast4: null, isManaged: false }]);
  });

  it("prefers DB over process.env", async () => {
    mockFindMany.mockResolvedValue([{ varName: VAR, keyLast4: "dbk4" }]);
    vi.stubEnv(VAR, "sk-env-value");
    const result = await getSkillCredentialStatus(USER, [VAR]);
    expect(result[0].isManaged).toBe(false);
    expect(result[0].keyLast4).toBe("dbk4");
    vi.unstubAllEnvs();
  });

  it("handles multiple vars with mixed sources", async () => {
    const VAR2 = "SENTRY_AUTH_TOKEN";
    mockFindMany.mockResolvedValue([{ varName: VAR, keyLast4: "1234" }]);
    vi.stubEnv(VAR2, "sntryu_env");
    const result = await getSkillCredentialStatus(USER, [VAR, VAR2, "UNSET_VAR"]);
    expect(result).toHaveLength(3);
    expect(result.find((r) => r.varName === VAR)?.isManaged).toBe(false);
    expect(result.find((r) => r.varName === VAR2)?.isManaged).toBe(true);
    expect(result.find((r) => r.varName === "UNSET_VAR")?.isSet).toBe(false);
    vi.unstubAllEnvs();
  });
});

// ---------------------------------------------------------------------------
// getDecryptedSkillEnvVars
// ---------------------------------------------------------------------------

describe("getDecryptedSkillEnvVars", () => {
  it("returns decrypted values for all DB rows", async () => {
    const encrypted = encryptSecret(VALUE);
    mockFindMany.mockResolvedValue([{ varName: VAR, encryptedKey: encrypted }]);
    const result = await getDecryptedSkillEnvVars(USER);
    expect(result[VAR]).toBe(VALUE);
  });

  it("returns empty object when no rows", async () => {
    mockFindMany.mockResolvedValue([]);
    expect(await getDecryptedSkillEnvVars(USER)).toEqual({});
  });

  it("silently skips corrupted credentials", async () => {
    mockFindMany.mockResolvedValue([
      { varName: VAR, encryptedKey: "not-valid-json" },
      { varName: "SENTRY_AUTH_TOKEN", encryptedKey: encryptSecret("real-token") },
    ]);
    const result = await getDecryptedSkillEnvVars(USER);
    expect(result[VAR]).toBeUndefined();
    expect(result["SENTRY_AUTH_TOKEN"]).toBe("real-token");
  });
});

// ---------------------------------------------------------------------------
// getDecryptedSkillEnvVar
// ---------------------------------------------------------------------------

describe("getDecryptedSkillEnvVar", () => {
  it("returns decrypted value from DB", async () => {
    const encrypted = encryptSecret(VALUE);
    mockFindUnique.mockResolvedValue({ encryptedKey: encrypted });
    expect(await getDecryptedSkillEnvVar(USER, VAR)).toBe(VALUE);
  });

  it("falls back to process.env when not in DB", async () => {
    mockFindUnique.mockResolvedValue(null);
    vi.stubEnv(VAR, "sk-from-env");
    expect(await getDecryptedSkillEnvVar(USER, VAR)).toBe("sk-from-env");
    vi.unstubAllEnvs();
  });

  it("returns null when not in DB or process.env", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await getDecryptedSkillEnvVar(USER, "TOTALLY_MISSING")).toBeNull();
  });

  it("returns null for corrupted DB record", async () => {
    mockFindUnique.mockResolvedValue({ encryptedKey: "bad-json" });
    expect(await getDecryptedSkillEnvVar(USER, VAR)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildSkillEnvForJob
// ---------------------------------------------------------------------------

describe("buildSkillEnvForJob", () => {
  it("returns empty object for empty requiredVars", async () => {
    expect(await buildSkillEnvForJob(USER, [])).toEqual({});
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns only the requested vars", async () => {
    const encrypted = encryptSecret(VALUE);
    mockFindMany.mockResolvedValue([
      { varName: VAR, encryptedKey: encrypted },
      { varName: "SENTRY_AUTH_TOKEN", encryptedKey: encryptSecret("sentry-tok") },
    ]);
    const result = await buildSkillEnvForJob(USER, [VAR]);
    expect(result).toEqual({ [VAR]: VALUE });
    expect(result["SENTRY_AUTH_TOKEN"]).toBeUndefined();
  });

  it("falls back to process.env for vars not in DB", async () => {
    mockFindMany.mockResolvedValue([]);
    vi.stubEnv("SENTRY_AUTH_TOKEN", "env-sentry");
    const result = await buildSkillEnvForJob(USER, ["SENTRY_AUTH_TOKEN"]);
    expect(result["SENTRY_AUTH_TOKEN"]).toBe("env-sentry");
    vi.unstubAllEnvs();
  });

  it("omits vars that are not set anywhere", async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await buildSkillEnvForJob(USER, ["NOT_SET_ANYWHERE"]);
    expect(result["NOT_SET_ANYWHERE"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// migrateSkillEnvFileToDb
// ---------------------------------------------------------------------------

describe("migrateSkillEnvFileToDb", () => {
  const legacyPath = path.join(os.homedir(), ".openclaw", "skill-env.json");
  const migratedPath = path.join(os.homedir(), ".openclaw", "skill-env.migrated.json");

  it("returns { migrated: 0 } when legacy file does not exist", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"));
    const result = await migrateSkillEnvFileToDb(USER);
    expect(result).toEqual({ migrated: 0 });
    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("migrates keys not yet in DB and renames file", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify({ [VAR]: VALUE, SENTRY_AUTH_TOKEN: "sentry-tok" }));
    mockFindMany.mockResolvedValue([]); // nothing in DB yet
    mockUpsert.mockResolvedValue({});
    mockRename.mockResolvedValue(undefined);

    const result = await migrateSkillEnvFileToDb(USER);

    expect(result.migrated).toBe(2);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockRename).toHaveBeenCalledWith(legacyPath, migratedPath);
  });

  it("skips vars already in DB", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify({ [VAR]: VALUE, SENTRY_AUTH_TOKEN: "tok" }));
    mockFindMany.mockResolvedValue([{ varName: VAR }]); // VAR already exists
    mockUpsert.mockResolvedValue({});
    mockRename.mockResolvedValue(undefined);

    const result = await migrateSkillEnvFileToDb(USER);

    expect(result.migrated).toBe(1);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.varName).toBe("SENTRY_AUTH_TOKEN");
  });

  it("handles empty legacy file gracefully", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify({}));
    mockRename.mockResolvedValue(undefined);

    const result = await migrateSkillEnvFileToDb(USER);

    expect(result.migrated).toBe(0);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockRename).toHaveBeenCalledWith(legacyPath, migratedPath);
  });

  it("handles corrupt JSON by renaming and returning 0", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue("not valid json {{{");
    mockRename.mockResolvedValue(undefined);

    const result = await migrateSkillEnvFileToDb(USER);

    expect(result.migrated).toBe(0);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockRename).toHaveBeenCalledWith(legacyPath, migratedPath);
  });

  it("continues migrating remaining keys if one upsert fails", async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify({ [VAR]: VALUE, SENTRY_AUTH_TOKEN: "tok" }));
    mockFindMany.mockResolvedValue([]);
    mockUpsert
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce({});
    mockRename.mockResolvedValue(undefined);

    const result = await migrateSkillEnvFileToDb(USER);

    expect(result.migrated).toBe(1);
    expect(mockRename).toHaveBeenCalled();
  });
});
