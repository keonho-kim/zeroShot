#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CLI_PACKAGE="$ROOT/cli"
OUT_DIR="$CLI_PACKAGE/dist/bin"

mkdir -p "$OUT_DIR"

build_binary() {
  goos="$1"
  goarch="$2"
  suffix="$3"
  (cd "$ROOT/src/cli" && GOOS="$goos" GOARCH="$goarch" CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o "$OUT_DIR/zeroshot-$suffix" .)
  chmod +x "$OUT_DIR/zeroshot-$suffix"
}

build_binary darwin arm64 darwin-arm64
build_binary darwin amd64 darwin-x64
build_binary linux arm64 linux-arm64
build_binary linux amd64 linux-x64

cat > "$CLI_PACKAGE/dist/index.js" <<'EOF'
#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const platformMap = {
  darwin: "darwin",
  linux: "linux"
};

const archMap = {
  arm64: "arm64",
  x64: "x64"
};

const platform = platformMap[process.platform];
const arch = archMap[process.arch];

if (!platform || !arch) {
  console.error(`[zeroshot-cli] unsupported platform: ${process.platform}/${process.arch}`);
  process.exit(1);
}

const distDir = dirname(fileURLToPath(import.meta.url));
const binary = join(distDir, "bin", `zeroshot-${platform}-${arch}`);
const child = spawn(binary, process.argv.slice(2), {
  stdio: "inherit",
  env: process.env
});

child.on("close", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`[zeroshot-cli] ${error.message}`);
  process.exit(1);
});
EOF

chmod +x "$CLI_PACKAGE/dist/index.js"
