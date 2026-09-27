#!/usr/bin/env bash
# ShoppingList — Build, Push, and Deploy to UnRAID
#
# Rebuilds Docker image (using layer cache — fast for code-only changes),
# pushes to registry, and restarts container on UnRAID via SSH.
#
# Prerequisites:
#   - docker engine running; user in the docker group (no sudo needed)
#   - registry.tomaz.xyz reachable
#   - SSH access to root@192.168.1.20 (key-based auth recommended; with
#     password auth you are asked once per ssh/scp call, ~5-6 times)
#   - docker/.env.unraid filled in
#
# Usage:
#   ./docker/deploy-unraid.sh              # Build, push, and deploy
#   ./docker/deploy-unraid.sh --no-deploy  # Build and push only
#   ./docker/deploy-unraid.sh --no-cache   # Force clean rebuild
#   ./docker/deploy-unraid.sh -h | --help  # Show this help

set -euo pipefail

usage() { awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "${BASH_SOURCE[0]}"; }

NO_DEPLOY=0; NO_CACHE=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-deploy)     NO_DEPLOY=1 ;;
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

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

UNRAID_HOST="root@192.168.1.20"
COMPOSE_DIR="/mnt/user/appdata/compose"
COMPOSE_FILE="shoppinglist.yml"

# -------------------------------------------
# Step 1: Build and push via existing script
# -------------------------------------------
build_args=()
if [[ $NO_CACHE -eq 1 ]]; then build_args+=(--no-cache); fi

say "$C_CYAN" "========================================"
say "$C_CYAN" "  ShoppingList — Deploy to UnRAID"
say "$C_CYAN" "========================================"
echo

say "$C_YELLOW" "[1/4] Building and pushing image..."
if ! "$SCRIPT_DIR/build-unraid.sh" ${build_args[@]+"${build_args[@]}"}; then
    say "$C_RED" "Build/push failed. Aborting deploy."
    exit 1
fi

if [[ $NO_DEPLOY -eq 1 ]]; then
    echo
    say "$C_GREEN" "Build and push complete. Skipping deploy (--no-deploy)."
    exit 0
fi

# -------------------------------------------
# Step 2: Sync compose file to UnRAID (added 2026-09-27)
# -------------------------------------------
# The compose file on UnRAID was copied there by hand once; until now compose changes never
# reached production. Compare first: identical → skip; different → show the diff and ask,
# because a hand edit made on the server would otherwise be overwritten silently.
echo
say "$C_YELLOW" "[2/4] Syncing compose file to UnRAID..."

remote_copy="$(mktemp)"
trap 'rm -f "$remote_copy"' EXIT
if ! ssh "$UNRAID_HOST" "cat $COMPOSE_DIR/$COMPOSE_FILE" > "$remote_copy"; then
    say "$C_RED" "Could not read $COMPOSE_DIR/$COMPOSE_FILE on UnRAID."
    exit 1
fi
if cmp -s "$remote_copy" "$SCRIPT_DIR/$COMPOSE_FILE"; then
    say "$C_GREEN" "Compose file unchanged — nothing to copy."
else
    say "$C_YELLOW" "The compose file differs from UnRAID's copy (- UnRAID, + this repo):"
    diff -u --label "UnRAID:$COMPOSE_FILE" --label "repo:$COMPOSE_FILE" "$remote_copy" "$SCRIPT_DIR/$COMPOSE_FILE" || true
    read -rp "Overwrite UnRAID's copy with the repo version? [y/N] " answer
    if [[ ! $answer =~ ^[Yy]$ ]]; then
        say "$C_RED" "Deploy stopped — nothing on UnRAID was changed. Bring the two files in line first."
        exit 1
    fi
    if ! scp "$SCRIPT_DIR/$COMPOSE_FILE" "${UNRAID_HOST}:${COMPOSE_DIR}/${COMPOSE_FILE}"; then
        say "$C_RED" "Failed to copy compose file to UnRAID."
        exit 1
    fi
    say "$C_GREEN" "Compose file synced."
fi

# -------------------------------------------
# Step 3: Pull new image on UnRAID
# -------------------------------------------
echo
say "$C_YELLOW" "[3/4] Pulling new image on UnRAID..."

if ! ssh "$UNRAID_HOST" "cd $COMPOSE_DIR && docker compose -f $COMPOSE_FILE pull"; then
    say "$C_RED" "Failed to pull image on UnRAID."
    exit 1
fi
say "$C_GREEN" "Pull complete."

# -------------------------------------------
# Step 4: Restart container
# -------------------------------------------
echo
say "$C_YELLOW" "[4/4] Restarting container on UnRAID..."

if ! ssh "$UNRAID_HOST" "cd $COMPOSE_DIR && docker compose -f $COMPOSE_FILE up -d"; then
    say "$C_RED" "Failed to restart container."
    exit 1
fi

# -------------------------------------------
# Health check
# -------------------------------------------
echo
say "$C_YELLOW" "Waiting for health check..."
sleep 15

if health=$(ssh "$UNRAID_HOST" "curl -sf http://localhost:8230/healthz"); then
    say "$C_GREEN" "Healthy: $health"
else
    say "$C_YELLOW" "Warning: Health check failed. Check logs:"
    say "$C_GRAY" "  ssh $UNRAID_HOST docker logs shoppinglist --tail 30"
fi

echo
ssh "$UNRAID_HOST" "docker ps --filter name=shoppinglist --format 'table {{.Names}}\t{{.Status}}'" || true
echo

say "$C_CYAN" "========================================"
say "$C_CYAN" "  Deploy Complete!"
say "$C_CYAN" "========================================"
say "$C_GRAY" "  https://shopping.tomaz.xyz"
