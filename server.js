/**
 * server.js — DirectAdmin Node.js Selector entry point
 *
 * HOW IT WORKS
 * ─────────────
 * Next.js `output: "standalone"` produces a self-contained server at
 * .next/standalone/server.js that already handles HTTP.
 *
 * This file simply delegates to it after:
 *   1. Ensuring NODE_ENV is "production"
 *   2. Setting PORT / HOSTNAME from the hosting environment
 *   3. Changing cwd so the standalone server can find its files
 *
 * DEPLOY CHECKLIST (run these after every `npm run build`)
 * ────────────────────────────────────────────────────────
 *   cp -r public .next/standalone/public
 *   cp -r .next/static .next/standalone/.next/static
 *
 * Then in DirectAdmin Node.js Selector, set:
 *   Application root : /home/<user>/domains/<domain>/
 *   Startup file     : server.js          ← this file
 *   Node.js version  : 18+ (LTS)
 *   Environment vars : (set via DirectAdmin UI — see .env.local.example)
 */

"use strict";

const path = require("path");

// ── Environment ───────────────────────────────────────────────────────────────
process.env.NODE_ENV  = "production";

// DirectAdmin injects PORT automatically; fall back to 3000 for local testing
process.env.PORT      = process.env.PORT     || "3000";
process.env.HOSTNAME  = process.env.HOSTNAME || "0.0.0.0";

// ── Working directory ─────────────────────────────────────────────────────────
// The standalone server resolves assets relative to its own directory.
const standaloneDir = path.join(__dirname, ".next", "standalone");
process.chdir(standaloneDir);

// ── Start ─────────────────────────────────────────────────────────────────────
// The standalone server.js is NOT a module — it starts an HTTP server
// when executed. We simply require it.
require(path.join(standaloneDir, "server.js"));
