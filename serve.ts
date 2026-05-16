#!/usr/bin/env bun
import { spawn } from "node:child_process";

const child = spawn("bun", ["./src/backend/dist/server.js"], {
  stdio: "inherit",
  env: process.env
});

child.on("close", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`[serve] ${error.message}`);
  process.exit(1);
});
