import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted above imports, so they can't reference top-level vars.
// Use vi.hoisted to define the mock functions.
const { mockPrismaExtends } = vi.hoisted(() => {
  const mockPrismaExtends = vi.fn((config: unknown) => ({ _extensionConfig: config }));
  return { mockPrismaExtends };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    $extends: mockPrismaExtends,
  },
}));

import { scopedPrisma } from "@/lib/scoped-db";

describe("scopedPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an extended Prisma client", () => {
    const db = scopedPrisma("user-123");
    expect(mockPrismaExtends).toHaveBeenCalledOnce();
  });

  it("passes an extension config with $allModels query hooks", () => {
    scopedPrisma("user-456");
    const config = mockPrismaExtends.mock.calls[0][0] as {
      query: { $allModels: Record<string, unknown> };
    };
    expect(config.query.$allModels).toBeDefined();
    expect(typeof config.query.$allModels.findMany).toBe("function");
    expect(typeof config.query.$allModels.findFirst).toBe("function");
    expect(typeof config.query.$allModels.create).toBe("function");
    expect(typeof config.query.$allModels.count).toBe("function");
  });

  it("findMany injects userId for scoped models", async () => {
    scopedPrisma("user-789");
    const config = mockPrismaExtends.mock.calls[0][0] as {
      query: {
        $allModels: {
          findMany: (params: {
            model: string;
            args: { where?: Record<string, unknown> };
            query: (args: unknown) => Promise<unknown>;
          }) => Promise<unknown>;
        };
      };
    };

    const mockInnerQuery = vi.fn(async (args: unknown) => []);
    const args = { where: { status: "QUEUED" } };

    await config.query.$allModels.findMany({
      model: "delegatedTask",
      args,
      query: mockInnerQuery,
    });

    expect(mockInnerQuery).toHaveBeenCalledWith({
      where: { status: "QUEUED", userId: "user-789" },
    });
  });

  it("findMany does NOT inject userId for unscoped models", async () => {
    scopedPrisma("user-789");
    const config = mockPrismaExtends.mock.calls[0][0] as {
      query: {
        $allModels: {
          findMany: (params: {
            model: string;
            args: { where?: Record<string, unknown> };
            query: (args: unknown) => Promise<unknown>;
          }) => Promise<unknown>;
        };
      };
    };

    const mockInnerQuery = vi.fn(async (args: unknown) => []);
    const args = { where: { kind: "ASSISTANT" } };

    await config.query.$allModels.findMany({
      model: "agent",
      args,
      query: mockInnerQuery,
    });

    expect(mockInnerQuery).toHaveBeenCalledWith({
      where: { kind: "ASSISTANT" },
    });
  });

  it("create injects userId for scoped models", async () => {
    scopedPrisma("user-create-test");
    const config = mockPrismaExtends.mock.calls[0][0] as {
      query: {
        $allModels: {
          create: (params: {
            model: string;
            args: { data: Record<string, unknown> };
            query: (args: unknown) => Promise<unknown>;
          }) => Promise<unknown>;
        };
      };
    };

    const mockInnerQuery = vi.fn(async (args: unknown) => ({}));
    const args = { data: { title: "Test" } };

    await config.query.$allModels.create({
      model: "businessLogEntry",
      args,
      query: mockInnerQuery,
    });

    expect(mockInnerQuery).toHaveBeenCalledWith({
      data: { title: "Test", userId: "user-create-test" },
    });
  });
});
