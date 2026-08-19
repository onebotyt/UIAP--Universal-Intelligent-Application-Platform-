$ErrorActionPreference = "Stop"

$workspaceDir = Resolve-Path ".."
$modulesDir = Join-Path $workspaceDir "modules"
$buildDir = Join-Path $workspaceDir "build"
$scriptsDir = Join-Path $workspaceDir "scripts"

if (!(Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

$moduleFolders = Get-ChildItem -Path $modulesDir -Directory

foreach ($folder in $moduleFolders) {
    $moduleName = $folder.Name
    $manifestPath = Join-Path $folder.FullName "manifest.json"
    
    if (!(Test-Path $manifestPath)) {
        Write-Host "Skipping ${moduleName}: No manifest.json found."
        continue
    }

    $manifest = Get-Content $manifestPath | ConvertFrom-Json
    $moduleId = $manifest.id
    $version = $manifest.version

    Write-Host "Packaging module: $moduleId (v$version)..." -ForegroundColor Cyan

    # 1. Install dependencies
    Write-Host "  Installing dependencies..."
    Set-Location $folder.FullName
    npm install --silent

    # 2. Build with esbuild
    Write-Host "  Bundling with esbuild..."
    npx esbuild src/index.ts --bundle --platform=node --format=cjs --outfile=dist/index.js --external:@uiap/module-sdk

    # 3. Sign and Package (sign-module.ts handles the ZIP creation)
    Write-Host "  Signing package..."
    Set-Location $scriptsDir
    npx tsx sign-module.ts $folder.FullName "..\signing-keys\uiap-dev-001.private.pem" "uiap-dev-001"
    
    # 4. Move signed package to build dir
    $signedZipPath = Join-Path $folder.FullName "$moduleId.signed.zip"
    if (Test-Path $signedZipPath) {
        $finalZipPath = Join-Path $buildDir "$moduleId-v$version.signed.zip"
        Move-Item -Force $signedZipPath $finalZipPath
        Write-Host "  Saved to: $finalZipPath"
    }

    Write-Host "Done: $moduleId" -ForegroundColor Green
    Write-Host "----------------------------------------"
}

Write-Host "All modules packaged successfully!" -ForegroundColor Green
