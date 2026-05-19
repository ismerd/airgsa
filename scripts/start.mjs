import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";

const port = process.env.PORT || "3000";
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

if (process.env.NODE_ENV === "production") {
  const preflight = spawnSync(process.execPath, [join(process.cwd(), "scripts", "check-production-env.mjs")], {
    stdio: "inherit",
    env: process.env,
  });
  if (preflight.status !== 0) process.exit(preflight.status ?? 1);
}

const child = spawn(process.execPath, [nextBin, "start", "-H", "0.0.0.0", "-p", port], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
