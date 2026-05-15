#!/usr/bin/env sh
set -eu

REPOSITORY="${ZEROSHOT_REPOSITORY:-keonho-kim/zeroShot}"
VERSION="${ZEROSHOT_VERSION:-latest}"

fail() {
  echo "$1" >&2
  exit 1
}

resolve_latest_tag() {
  if ! command -v curl >/dev/null 2>&1; then
    fail "curl is required to resolve the latest ZeroShot release."
  fi

  curl -fsSL "https://api.github.com/repos/${REPOSITORY}/releases/latest" \
    | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' \
    | head -n 1
}

version_from_tag() {
  tag="$1"

  case "$tag" in
    v.dev.*)
      echo "${tag#v.}"
      ;;
    v*)
      echo "${tag#v}"
      ;;
    *)
      fail "Unsupported ZeroShot release tag: $tag"
      ;;
  esac
}

if [ "$VERSION" = "latest" ]; then
  TAG="${ZEROSHOT_TAG:-$(resolve_latest_tag)}"
  [ -n "$TAG" ] || fail "Could not resolve the latest ZeroShot release."
  VERSION="$(version_from_tag "$TAG")"
else
  case "$VERSION" in
    dev.*)
      TAG="${ZEROSHOT_TAG:-v.${VERSION}}"
      ;;
    *)
      TAG="${ZEROSHOT_TAG:-v${VERSION}}"
      ;;
  esac
fi

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
