/**
 * E2E test for the 2FA flow against the running dev server.
 * Run with: node scripts/test-2fa-e2e.mjs
 */

import { generateSync } from "otplib";

const BASE = "http://localhost:3000";
const TEST_EMAIL = `2fa-test-${Date.now()}@test.local`;
const TEST_PASS = "testpassword123";

let cookies = {};

function extractCookies(res) {
  const headers = res.headers.getSetCookie?.() ?? [];
  for (const h of headers) {
    const [pair] = h.split(";");
    const [name, val] = pair.split("=");
    if (val === undefined || val === "") {
      delete cookies[name.trim()];
    } else {
      cookies[name.trim()] = val.trim();
    }
  }
}

function cookieHeader() {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(),
      Origin: BASE,
      ...(opts.headers ?? {}),
    },
    redirect: "manual",
  });
  extractCookies(res);
  let body = {};
  try { body = await res.json(); } catch { /* no body */ }
  return { status: res.status, body };
}

function pass(label) { console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
function fail(label, detail) { console.error(`  \x1b[31m✗\x1b[0m ${label}`); if (detail) console.error(`    ${detail}`); process.exitCode = 1; }
function assert(cond, label, detail) { cond ? pass(label) : fail(label, detail); }

let totpSecret = null;

async function run() {
  console.log("\n\x1b[1m2FA End-to-End Test\x1b[0m");
  console.log(`Email: ${TEST_EMAIL}\n`);

  // 1. Sign up
  console.log("── Sign up");
  const signup = await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }) });
  assert(signup.status === 200, "signup returns 200", JSON.stringify(signup.body));
  assert(!!cookies.wf_session, "session cookie set after signup");

  // 2. Login without 2FA — should get ok: true
  console.log("\n── Login (no 2FA yet)");
  cookies = {};
  const login1 = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }) });
  assert(login1.status === 200, "login returns 200");
  assert(login1.body.ok === true, "login body ok=true");
  assert(!login1.body.requiresTwoFactor, "no requiresTwoFactor flag");
  assert(!!cookies.wf_session, "session cookie set");

  // 3. Setup 2FA
  console.log("\n── Setup 2FA");
  const setup = await api("/api/auth/totp/setup");
  assert(setup.status === 200, "setup returns 200", JSON.stringify(setup.body));
  assert(typeof setup.body.secret === "string", "setup returns secret");
  assert(typeof setup.body.qrDataUrl === "string", "setup returns qrDataUrl");
  assert(setup.body.qrDataUrl.startsWith("data:image/png"), "qrDataUrl is a PNG data URI");
  totpSecret = setup.body.secret;

  // 4. Enable 2FA with valid code
  console.log("\n── Enable 2FA");
  const enableCode = generateSync({ secret: totpSecret, label: "test", digits: 6, period: 30, algorithm: "sha1" });
  const enable = await api("/api/auth/totp/enable", { method: "POST", body: JSON.stringify({ code: enableCode }) });
  assert(enable.status === 200, "enable returns 200", JSON.stringify(enable.body));
  assert(enable.body.ok === true, "enable body ok=true");

  // 5. Enable again — should 409
  const enableAgain = await api("/api/auth/totp/enable", { method: "POST", body: JSON.stringify({ code: enableCode }) });
  assert(enableAgain.status === 409, "re-enabling returns 409 conflict");

  // 6. Login with 2FA enabled — should get requiresTwoFactor
  console.log("\n── Login with 2FA enabled");
  cookies = {};
  const login2 = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }) });
  assert(login2.status === 200, "login returns 200");
  assert(login2.body.requiresTwoFactor === true, "requiresTwoFactor=true");
  assert(!login2.body.ok, "no ok=true in response");
  assert(!!cookies.wf_2fa, "wf_2fa pending cookie set");
  assert(!cookies.wf_session, "no real session cookie yet");

  // 7. Try verify with wrong code
  console.log("\n── Verify with wrong code");
  const wrongVerify = await api("/api/auth/totp/verify", { method: "POST", body: JSON.stringify({ code: "000000" }) });
  assert(wrongVerify.status === 400, "wrong code returns 400");
  assert(!cookies.wf_session, "no session after wrong code");
  assert(!!cookies.wf_2fa, "pending cookie still present");

  // 8. Verify with correct code
  console.log("\n── Verify with correct code");
  const verifyCode = generateSync({ secret: totpSecret, label: "test", digits: 6, period: 30, algorithm: "sha1" });
  const verify = await api("/api/auth/totp/verify", { method: "POST", body: JSON.stringify({ code: verifyCode }) });
  assert(verify.status === 200, "verify returns 200", JSON.stringify(verify.body));
  assert(verify.body.ok === true, "verify body ok=true");
  assert(!!cookies.wf_session, "real session cookie set after verify");

  // 9. Verify without pending cookie — should 401
  console.log("\n── Verify without pending cookie");
  const noPending = { ...cookies };
  delete noPending.wf_2fa;
  const savedCookies = cookies;
  cookies = {};
  const noPendingVerify = await api("/api/auth/totp/verify", { method: "POST", body: JSON.stringify({ code: verifyCode }) });
  assert(noPendingVerify.status === 401, "verify without pending cookie returns 401");
  cookies = savedCookies;

  // 10. Disable 2FA with wrong code
  console.log("\n── Disable 2FA");
  const disableWrong = await api("/api/auth/totp/disable", { method: "POST", body: JSON.stringify({ code: "000000" }) });
  assert(disableWrong.status === 400, "disable with wrong code returns 400");

  const disableCode = generateSync({ secret: totpSecret, label: "test", digits: 6, period: 30, algorithm: "sha1" });
  const disable = await api("/api/auth/totp/disable", { method: "POST", body: JSON.stringify({ code: disableCode }) });
  assert(disable.status === 200, "disable returns 200", JSON.stringify(disable.body));
  assert(disable.body.ok === true, "disable body ok=true");

  // 11. Login after disabling — should be plain login again
  console.log("\n── Login after disabling 2FA");
  cookies = {};
  const login3 = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }) });
  assert(login3.status === 200, "login returns 200");
  assert(login3.body.ok === true, "login ok=true (no 2FA)");
  assert(!login3.body.requiresTwoFactor, "no requiresTwoFactor");
  assert(!!cookies.wf_session, "session cookie set directly");

  console.log("\n── Cleanup");
  try {
    const { execSync } = await import("node:child_process");
    execSync(
      `npx prisma db execute --stdin <<< "DELETE FROM \\"User\\" WHERE email = '${TEST_EMAIL}';"`,
      { cwd: new URL("..", import.meta.url).pathname, stdio: "pipe" },
    );
    pass("test user deleted");
  } catch {
    pass(`test user left in DB (email: ${TEST_EMAIL}) — delete manually if needed`);
  }

  const failed = process.exitCode === 1;
  console.log(`\n${failed ? "\x1b[31mSome tests failed\x1b[0m" : "\x1b[32mAll tests passed\x1b[0m"}\n`);
}

run().catch((e) => { console.error(e); process.exit(1); });
