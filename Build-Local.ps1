$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot 'frontend')
# Force a relative API URL so the built client uses the local server.
$env:VITE_API_URL = '/api/v1'
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
