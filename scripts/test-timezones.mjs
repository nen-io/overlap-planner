import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const require = createRequire(import.meta.url);
const manifestPath = require.resolve("vitest/package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const cli = resolve(
  dirname(manifestPath),
  typeof manifest.bin === "string" ? manifest.bin : manifest.bin.vitest,
);
for (const timezone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
  console.log(`\nVerifying host time zone: ${timezone}`);
  const result = spawnSync(process.execPath, [cli, "run"], {
    env: { ...process.env, TZ: timezone },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
