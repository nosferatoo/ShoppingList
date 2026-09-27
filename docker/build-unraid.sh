#!/usr/bin/env bash
# ShoppingList — Build and Push to UnRAID Registry
#
# Builds Docker image for UnRAID production deployment and pushes
# to the private registry at registry.tomaz.xyz.
#
# Prerequisites:
#   - docker engine running; user in the docker group (no sudo needed)
#   - curl (registry reachability check)
#   - registry.tomaz.xyz reachable from this machine
#
# Usage:
#   ./docker/build-unraid.sh              # Build and push
#   ./docker/build-unraid.sh --no-push    # Build only (don't push)
#   ./docker/build-unraid.sh --no-build   # Push only (image must exist)
#   ./docker/build-unraid.sh --no-cache   # Clean rebuild
#   ./docker/build-unraid.sh -h | --help  # Show this help

set -euo pipefail

usage() { awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "${BASH_SOURCE[0]}"; }

NO_BUILD=0; NO_PUSH=0; NO_CACHE=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-build)      NO_BUILD=1 ;;
        --no-push)       NO_PUSH=1 ;;
        --no-cache)      NO_CACHE=1 ;;
        -h|--help)       usage; exit 0 ;;
        *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
    esac
    shift
done

# Colours only on a terminal (and not when NO_COLOR is set)
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
    C_CYAN=$'\e[36m'; C_YELLOW=$'\e[33m'; C_GREEN=$'\e[32m'; C_RED=$'\e[31m'; C_GRAY=$'\e[90m'; C_OFF=$'\e[0m'
else
    C_CYAN=''; C_YELLOW=''; C_GREEN=''; C_RED=''; C_GRAY=''; C_OFF=''
fi
say() { local c=$1; shift; printf '%s%s%s\n' "$c" "$*" "$C_OFF"; }

# Resolve paths relative to project root
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
ENV_FILE="$SCRIPT_DIR/.env.unraid"

say "$C_CYAN" "========================================"
say "$C_CYAN" "  ShoppingList — UnRAID Build"
say "$C_CYAN" "========================================"
echo

# -------------------------------------------
# Load .env.unraid
# -------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
    say "$C_RED" "Error: $ENV_FILE not found."
    exit 1
fi

# Line parser, same rules as the .ps1: trim, skip blank/# lines, split on the
# first '=', trim key and value, last occurrence wins. CRLF-tolerant. Nothing
# is sourced or eval'd.
env_get() {
    awk -v k="$1" '
        { sub(/\r$/, ""); line = $0; gsub(/^[ \t]+|[ \t]+$/, "", line) }
        line == "" || substr(line, 1, 1) == "#" { next }
        { i = index(line, "="); if (!i) next
          key = substr(line, 1, i - 1); gsub(/[ \t]+$/, "", key)
          if (key == k) { v = substr(line, i + 1); gsub(/^[ \t]+/, "", v); val = v } }
        END { printf "%s", val }' "$ENV_FILE"
}

REGISTRY=$(env_get REGISTRY)
VERSION=$(env_get IMAGE_VERSION)

# Validate required values
missing=()
[[ -n "$REGISTRY" ]] || missing+=("REGISTRY")
[[ -n "$VERSION" ]]  || missing+=("IMAGE_VERSION")

if [[ ${#missing[@]} -gt 0 ]]; then
    say "$C_RED" "Error: Missing values in .env.unraid:"
    for m in "${missing[@]}"; do say "$C_RED" "  - $m"; done
    exit 1
fi

IMAGE="$REGISTRY/shoppinglist:$VERSION"

echo "Configuration:"
say "$C_GRAY" "  Registry:  $REGISTRY"
say "$C_GRAY" "  Version:   $VERSION"
say "$C_GRAY" "  Image:     $IMAGE"
echo

# -------------------------------------------
# Verify registry access
# -------------------------------------------
say "$C_YELLOW" "Checking registry access..."
if curl_err=$(curl -fsS --max-time 10 -o /dev/null "https://$REGISTRY/v2/_catalog" 2>&1); then
    say "$C_GREEN" "Registry reachable."
else
    say "$C_YELLOW" "Warning: Cannot reach https://$REGISTRY/v2/_catalog"
    say "$C_YELLOW" "  Error: $curl_err"
    say "$C_YELLOW" "  Push may fail. Continue? (Ctrl+C to abort)"
    sleep 3
fi
echo

# Prints the image size in MB (rounded), or nothing if the image is missing
image_mb() {
    docker image inspect "$1" --format '{{.Size}}' 2>/dev/null \
        | awk '{ printf "%d", ($1 / 1048576) + 0.5 }' || true
}

# -------------------------------------------
# Build
# -------------------------------------------
if [[ $NO_BUILD -eq 0 ]]; then
    cache_flag=()
    if [[ $NO_CACHE -eq 1 ]]; then cache_flag=(--no-cache); fi

    say "$C_YELLOW" "[BUILD] ShoppingList image..."
    build_cmd=(docker build -t "$IMAGE" -f "$SCRIPT_DIR/shoppinglist.Dockerfile" ${cache_flag[@]+"${cache_flag[@]}"} "$PROJECT_ROOT")
    say "$C_GRAY" "  ${build_cmd[*]}"
    if ! "${build_cmd[@]}"; then
        say "$C_RED" "Error: Build failed!"
        exit 1
    fi
    say "$C_GREEN" "Build complete."
    echo

    # Show image size
    echo "Image size:"
    mb=$(image_mb "$IMAGE")
    if [[ -n "$mb" ]]; then say "$C_GRAY" "  ShoppingList: ${mb} MB"; fi
    echo
else
    say "$C_GRAY" "[BUILD] Skipped (--no-build flag set)"
    echo
fi

# -------------------------------------------
# Push
# -------------------------------------------
if [[ $NO_PUSH -eq 0 ]]; then
    say "$C_YELLOW" "[PUSH] ShoppingList image..."
    if ! docker push "$IMAGE"; then
        say "$C_RED" "Error: Push failed!"
        exit 1
    fi
    say "$C_GREEN" "Push complete."
    echo
else
    say "$C_GRAY" "[PUSH] Skipped (--no-push flag set)"
    echo
fi

# -------------------------------------------
# Done
# -------------------------------------------
say "$C_CYAN" "========================================"
say "$C_CYAN" "  Build Complete!"
say "$C_CYAN" "========================================"
echo
echo "Next steps:"
say "$C_GRAY" "  1. On UnRAID, copy docker/shoppinglist.yml to /mnt/user/appdata/compose/"
say "$C_GRAY" "  2. Ensure /mnt/user/appdata/compose/.env has all SL_* variables"
say "$C_GRAY" "  3. Run: docker compose -f shoppinglist.yml up -d"
say "$C_GRAY" "  4. Verify: curl http://192.168.1.20:8230/healthz"
