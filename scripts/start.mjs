import { spawn } from "node:child_process";
import { join } from "node:path";

const port = process.env.PORT || "3000";
const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

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

