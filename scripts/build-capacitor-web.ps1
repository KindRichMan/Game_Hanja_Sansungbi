$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$www = Join-Path $root "www"

if (Test-Path $www) {
  Remove-Item -LiteralPath $www -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $www | Out-Null

$files = @(
  "index.html",
  "firebase.js",
  "manifest.webmanifest",
  "sw.js",
  "404.html",
  "app-version.json"
)

foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $www $file) -Force
}

Copy-Item -LiteralPath (Join-Path $root "icons") -Destination (Join-Path $www "icons") -Recurse -Force

Write-Host "Capacitor web assets copied to www"
