# ShoppingList — Build and Push to UnRAID Registry
#
# Builds Docker image for UnRAID production deployment and pushes
# to the private registry at registry.tomaz.xyz.
#
# Prerequisites:
#   - Docker Desktop running
#   - registry.tomaz.xyz reachable from this machine
#
# Usage:
#   .\docker\build-unraid.ps1              # Build and push
#   .\docker\build-unraid.ps1 -NoPush      # Build only (don't push)
#   .\docker\build-unraid.ps1 -NoBuild     # Push only (image must exist)
#   .\docker\build-unraid.ps1 -NoCache     # Clean rebuild

param(
    [switch]$NoBuild,
    [switch]$NoPush,
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"

# Resolve paths relative to project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$envFile = Join-Path $scriptDir ".env.unraid"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ShoppingList — UnRAID Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# -------------------------------------------
# Load .env.unraid
# -------------------------------------------
if (-not (Test-Path $envFile)) {
    Write-Host "Error: $envFile not found." -ForegroundColor Red
    exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            $envVars[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
}

$registry = $envVars["REGISTRY"]
$version = $envVars["IMAGE_VERSION"]

# Validate required values
$missing = @()
if (-not $registry) { $missing += "REGISTRY" }
if (-not $version) { $missing += "IMAGE_VERSION" }

if ($missing.Count -gt 0) {
    Write-Host "Error: Missing values in .env.unraid:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

$image = "$registry/shoppinglist:$version"

Write-Host "Configuration:" -ForegroundColor White
Write-Host "  Registry:  $registry" -ForegroundColor Gray
Write-Host "  Version:   $version" -ForegroundColor Gray
Write-Host "  Image:     $image" -ForegroundColor Gray
Write-Host ""

# -------------------------------------------
# Verify registry access
# -------------------------------------------
Write-Host "Checking registry access..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://$registry/v2/_catalog" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "Registry reachable." -ForegroundColor Green
} catch {
    Write-Host "Warning: Cannot reach https://$registry/v2/_catalog" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  Push may fail. Continue? (Ctrl+C to abort)" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}
Write-Host ""

# -------------------------------------------
# Build
# -------------------------------------------
if (-not $NoBuild) {
    $cacheFlag = if ($NoCache) { "--no-cache" } else { "" }

    Write-Host "[BUILD] ShoppingList image..." -ForegroundColor Yellow
    $buildCmd = "docker build -t $image -f `"$scriptDir\shoppinglist.Dockerfile`" $cacheFlag `"$projectRoot`""
    Write-Host "  $buildCmd" -ForegroundColor Gray
    Invoke-Expression $buildCmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Build complete." -ForegroundColor Green
    Write-Host ""

    # Show image size
    Write-Host "Image size:" -ForegroundColor White
    docker image inspect $image --format "  {{.Size}}" 2>$null | ForEach-Object {
        $sizeBytes = ($_ -replace "[^\d]", "")
        $sizeMB = [math]::Round([long]$sizeBytes / 1MB, 0)
        Write-Host "  ShoppingList: ${sizeMB} MB" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "[BUILD] Skipped (-NoBuild flag set)" -ForegroundColor Gray
    Write-Host ""
}

# -------------------------------------------
# Push
# -------------------------------------------
if (-not $NoPush) {
    Write-Host "[PUSH] ShoppingList image..." -ForegroundColor Yellow
    docker push $image
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Push failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Push complete." -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[PUSH] Skipped (-NoPush flag set)" -ForegroundColor Gray
    Write-Host ""
}

# -------------------------------------------
# Done
# -------------------------------------------
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. On UnRAID, copy docker/shoppinglist.yml to /mnt/user/appdata/compose/" -ForegroundColor Gray
Write-Host "  2. Ensure /mnt/user/appdata/compose/.env has all SL_* variables" -ForegroundColor Gray
Write-Host "  3. Run: docker compose -f shoppinglist.yml up -d" -ForegroundColor Gray
Write-Host "  4. Verify: curl http://192.168.1.20:8230/healthz" -ForegroundColor Gray
