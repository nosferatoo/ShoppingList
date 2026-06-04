# ShoppingList — Build, Push, and Deploy to UnRAID
#
# Rebuilds Docker image (using layer cache — fast for code-only changes),
# pushes to registry, and restarts container on UnRAID via SSH.
#
# Prerequisites:
#   - Docker Desktop running
#   - registry.tomaz.xyz reachable
#   - SSH access to root@192.168.1.20 (key-based auth recommended)
#   - docker/.env.unraid filled in
#
# Usage:
#   .\docker\deploy-unraid.ps1              # Build, push, and deploy
#   .\docker\deploy-unraid.ps1 -NoDeploy    # Build and push only
#   .\docker\deploy-unraid.ps1 -NoCache     # Force clean rebuild

param(
    [switch]$NoDeploy,
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$UNRAID_HOST = "root@192.168.1.20"
$COMPOSE_DIR = "/mnt/user/appdata/compose"
$COMPOSE_FILE = "shoppinglist.yml"

# -------------------------------------------
# Step 1: Build and push via existing script
# -------------------------------------------
$buildArgs = @()
if ($NoCache) { $buildArgs += "-NoCache" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ShoppingList — Deploy to UnRAID" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Building and pushing image..." -ForegroundColor Yellow
& "$scriptDir\build-unraid.ps1" @buildArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build/push failed. Aborting deploy." -ForegroundColor Red
    exit 1
}

if ($NoDeploy) {
    Write-Host ""
    Write-Host "Build and push complete. Skipping deploy (-NoDeploy)." -ForegroundColor Green
    exit 0
}

# -------------------------------------------
# Step 2: Pull new image on UnRAID
# -------------------------------------------
Write-Host ""
Write-Host "[2/3] Pulling new image on UnRAID..." -ForegroundColor Yellow

ssh $UNRAID_HOST "cd $COMPOSE_DIR && docker compose -f $COMPOSE_FILE pull"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to pull image on UnRAID." -ForegroundColor Red
    exit 1
}
Write-Host "Pull complete." -ForegroundColor Green

# -------------------------------------------
# Step 3: Restart container
# -------------------------------------------
Write-Host ""
Write-Host "[3/3] Restarting container on UnRAID..." -ForegroundColor Yellow

ssh $UNRAID_HOST "cd $COMPOSE_DIR && docker compose -f $COMPOSE_FILE up -d"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to restart container." -ForegroundColor Red
    exit 1
}

# -------------------------------------------
# Health check
# -------------------------------------------
Write-Host ""
Write-Host "Waiting for health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

$health = ssh $UNRAID_HOST "curl -sf http://localhost:8230/healthz"
if ($LASTEXITCODE -eq 0) {
    Write-Host "Healthy: $health" -ForegroundColor Green
} else {
    Write-Host "Warning: Health check failed. Check logs:" -ForegroundColor Yellow
    Write-Host "  ssh $UNRAID_HOST docker logs shoppinglist --tail 30" -ForegroundColor Gray
}

$status = ssh $UNRAID_HOST "docker ps --filter name=shoppinglist --format 'table {{.Names}}\t{{.Status}}'"
Write-Host ""
Write-Host $status
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploy Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  https://shopping.tomaz.xyz" -ForegroundColor Gray
