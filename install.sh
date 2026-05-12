#!/usr/bin/env sh
set -eu

REPOSITORY="${ZEROSHOT_REPOSITORY:-keonho-kim/zeroShot}"
VERSION="${ZEROSHOT_VERSION:-dev.1}"
case "$VERSION" in
  dev.*)
    TAG="${ZEROSHOT_TAG:-v.${VERSION}}"
    ;;
  *)
    TAG="${ZEROSHOT_TAG:-v${VERSION}}"
    ;;
esac

fail() {
  echo "$1" >&2
  exit 1
}

detect_arch() {
  case "$(uname -m)" in
    x86_64 | amd64)
      echo "x64"
      ;;
    arm64 | aarch64)
      echo "arm64"
      ;;
    *)
      fail "Unsupported architecture: $(uname -m). ZeroShot supports arm64 and x64."
      ;;
  esac
}

is_termux() {
  case "${PREFIX:-}" in
    *com.termux*)
      return 0
      ;;
  esac

  [ -d /data/data/com.termux/files/usr ]
}

is_wsl() {
  if [ -r /proc/sys/kernel/osrelease ] && grep -qi "microsoft\\|wsl" /proc/sys/kernel/osrelease; then
    return 0
  fi

  [ -r /proc/version ] && grep -qi "microsoft\\|wsl" /proc/version
}

is_proot() {
  [ -n "${PROOT_TMP_DIR:-}" ] || [ -n "${PROOT_LOADER:-}" ] || [ -n "${PROOT_NO_SECCOMP:-}" ]
}

detect_platform() {
  if is_termux; then
    echo "termux"
    return
  fi

  case "$(uname -s)" in
    Darwin)
      echo "macos"
      ;;
    Linux)
      if is_wsl; then
        echo "wsl"
      elif is_proot; then
        echo "proot"
      else
        echo "linux"
      fi
      ;;
    *)
      fail "Unsupported platform: $(uname -s). ZeroShot supports Termux, Linux, WSL, proot, and macOS."
      ;;
  esac
}

ensure_bun() {
  platform="$1"

  if command -v bun >/dev/null 2>&1; then
    return
  fi

  if [ "$platform" = "termux" ]; then
    fail "Bun is required on Termux. Install Bun first, then rerun this installer."
  fi

  if ! command -v curl >/dev/null 2>&1; then
    fail "curl is required to install Bun."
  fi

  if ! command -v bash >/dev/null 2>&1; then
    fail "bash is required to run the official Bun installer."
  fi

  curl -fsSL https://bun.sh/install | bash

  if [ -x "$HOME/.bun/bin/bun" ]; then
    PATH="$HOME/.bun/bin:$PATH"
    export PATH
  fi

  command -v bun >/dev/null 2>&1 || fail "Bun installation finished, but bun was not found on PATH."
}

ARCH="$(detect_arch)"
PLATFORM="$(detect_platform)"

case "$PLATFORM:$ARCH" in
  termux:arm64 | termux:x64 | linux:arm64 | linux:x64 | wsl:arm64 | wsl:x64 | proot:arm64 | proot:x64 | macos:arm64 | macos:x64)
    ;;
  *)
    fail "Unsupported platform or architecture: $PLATFORM/$ARCH."
    ;;
esac

ensure_bun "$PLATFORM"

bun install -g "https://github.com/${REPOSITORY}/releases/download/${TAG}/zeroShot-${VERSION}.tgz"
