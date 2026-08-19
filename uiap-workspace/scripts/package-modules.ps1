# PowerShell script to package UIAP modules
# This script uses tsx (via npx) to execute the TypeScript packaging script

Write-Host "Packaging and signing UIAP modules..." -ForegroundColor Cyan

# Ensure we are in the workspace root
$WorkspaceRoot = $PSScriptRoot | Split-Path -Parent
Set-Location -Path $WorkspaceRoot

# Run the TypeScript packaging script using tsx
npx tsx scripts/package-modules.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host "Packaging completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Packaging failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
