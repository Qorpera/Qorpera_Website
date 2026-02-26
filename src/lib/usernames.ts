export function normalizeUsernameInput(input: string) {
  return input.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return /^[a-z0-9_]{3,24}$/.test(username);
}

export function deriveUsernameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "owner";
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return (cleaned || "owner").slice(0, 24);
}

export function getPreferredUsername(profile: { username?: string | null; email?: string | null }) {
  const username = normalizeUsernameInput(profile.username ?? "");
  if (isValidUsername(username)) return username;
  const email = profile.email?.trim();
  if (email) return deriveUsernameFromEmail(email);
  return "owner";
}
