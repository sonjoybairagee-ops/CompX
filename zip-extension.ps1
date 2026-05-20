# zip-extension.ps1 - Auto-packages the extension directory into public/compx-extension.zip
$sourcePath = Join-Path $PSScriptRoot "extension"
$destinationPath = Join-Path $PSScriptRoot "public\compx-extension.zip"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " COMPX SCRAEPING EXTENSION PACKAGER TOOL  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Source directory: $sourcePath" -ForegroundColor Gray

# Ensure target public folder exists
$publicDir = Join-Path $PSScriptRoot "public"
if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir -Force | Out-Null
    Write-Host "Created public/ directory." -ForegroundColor Yellow
}

# Delete old compiled zip if it exists
if (Test-Path $destinationPath) {
    Remove-Item $destinationPath -Force
    Write-Host "Pruned obsolete extension zip package." -ForegroundColor Yellow
}

# Perform native PowerShell Compress-Archive action
try {
    Compress-Archive -Path "$sourcePath\*" -DestinationPath $destinationPath -Force
    Write-Host "[SUCCESS] Extension compressed and saved to:" -ForegroundColor Green
    Write-Host "          $destinationPath" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Archiving failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host "==========================================" -ForegroundColor Cyan
