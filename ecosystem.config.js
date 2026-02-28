/**
 * PM2 process configuration for bare-metal deployments.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup   # generates the init script to survive reboots
 *
 * Environment variables are read from the shell environment or a .env file
 * loaded before calling pm2. Do NOT put secrets in this file.
 */

module.exports = {
  apps: [
    // ── Next.js app server ──────────────────────────────────────────
    {
      name: "qorpera-web",
      script: "node_modules/.bin/next",
      args: "start",
      instances: "max",          // one per CPU core
      exec_mode: "cluster",
      max_memory_restart: "512M",
      restart_delay: 2000,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },

    // ── Background task scheduler ───────────────────────────────────
    {
      name: "qorpera-scheduler",
      script: "runner/scheduler.mjs",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "256M",
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },

    // ── Runner daemon (tool execution) ──────────────────────────────
    {
      name: "qorpera-runner",
      script: "runner/daemon.mjs",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
