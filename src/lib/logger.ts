/**
 * Minimal structured JSON logger.
 * In production, outputs newline-delimited JSON for log aggregators.
 * In development, pretty-prints with a timestamp prefix.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const IS_PROD = process.env.NODE_ENV === "production";

function log(level: LogLevel, message: string, ctx?: LogContext): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...ctx,
  };

  if (IS_PROD) {
    const line = JSON.stringify(entry);
    if (level === "error" || level === "warn") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  } else {
    const prefix = `[${entry.ts}] ${level.toUpperCase()}`;
    const rest = ctx && Object.keys(ctx).length ? " " + JSON.stringify(ctx) : "";
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`${prefix} ${message}${rest}`);
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log("debug", msg, ctx),
  info:  (msg: string, ctx?: LogContext) => log("info",  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => log("warn",  msg, ctx),
  error: (msg: string, ctx?: LogContext) => log("error", msg, ctx),
};
