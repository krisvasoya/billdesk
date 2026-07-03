# backend/build-backend.ps1
$parentDir = Resolve-Path ".."
$rootPkg = Join-Path $parentDir "package.json"
$rootLock = Join-Path $parentDir "package-lock.json"

$rootReact = Join-Path $parentDir "node_modules/react"
$rootReactDom = Join-Path $parentDir "node_modules/react-dom"

$rootPkgTemp = Join-Path $parentDir "package.json.bak"
$rootLockTemp = Join-Path $parentDir "package-lock.json.bak"
$rootReactTemp = Join-Path $parentDir "node_modules/react.bak"
$rootReactDomTemp = Join-Path $parentDir "node_modules/react-dom.bak"

$pkgRenamed = $false
$lockRenamed = $false
$reactRenamed = $false
$reactDomRenamed = $false

try {
    # 1. Temporarily rename parent React folders to isolate resolution
    if (Test-Path $rootReact) {
        Rename-Item -Path $rootReact -NewName "react.bak" -Force
        $reactRenamed = $true
        Write-Host "Isolated parent react module"
    }
    if (Test-Path $rootReactDom) {
        Rename-Item -Path $rootReactDom -NewName "react-dom.bak" -Force
        $reactDomRenamed = $true
        Write-Host "Isolated parent react-dom module"
    }

    # 2. Temporarily rename parent package files
    if (Test-Path $rootPkg) {
        Rename-Item -Path $rootPkg -NewName "package.json.bak" -Force
        $pkgRenamed = $true
    }
    if (Test-Path $rootLock) {
        Rename-Item -Path $rootLock -NewName "package-lock.json.bak" -Force
        $lockRenamed = $true
    }

    # 3. Run Prisma client generation and Next.js production build
    Write-Host "Running Prisma Client generation and Next.js Build..."
    npx prisma generate
    npx next build

} finally {
    # 4. Always restore everything
    if ($reactRenamed) {
        Rename-Item -Path $rootReactTemp -NewName "react" -Force
        Write-Host "Restored parent react module"
    }
    if ($reactDomRenamed) {
        Rename-Item -Path $rootReactDomTemp -NewName "react-dom" -Force
        Write-Host "Restored parent react-dom module"
    }
    if ($pkgRenamed) {
        Rename-Item -Path $rootPkgTemp -NewName "package.json" -Force
        Write-Host "Restored parent package.json"
    }
    if ($lockRenamed) {
        Rename-Item -Path $rootLockTemp -NewName "package-lock.json" -Force
        Write-Host "Restored parent package-lock.json"
    }
}
