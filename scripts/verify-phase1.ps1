# Phase 1 runtime verification — run AFTER Docker Desktop's first-run is completed
# (license accepted + WSL2 ready, i.e. `docker info` works).
# Usage:  pwsh -File scripts/verify-phase1.ps1   (from the affiliate-kk/ folder)

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example — set INGEST_API_KEY before real use." -ForegroundColor Yellow
}

# Read the ingestion key from .env (fallback to the example default)
$key = (Select-String -Path ".env" -Pattern '^INGEST_API_KEY="?([^"]+)"?' ).Matches.Groups[1].Value
if (-not $key) { $key = "change-me-strong-random-secret" }

Write-Host "1) Starting infra (postgres, redis, meilisearch)..." -ForegroundColor Cyan
docker compose up -d postgres redis meilisearch

Write-Host "2) Applying Prisma migration..." -ForegroundColor Cyan
$env:DATABASE_URL = "postgresql://knackcook:knackcook@localhost:5432/knackcook?schema=public"
pnpm prisma migrate dev --name init

Write-Host "3) Starting the Next.js app (dev) in the background..." -ForegroundColor Cyan
$app = Start-Process pnpm -ArgumentList "dev" -PassThru
Start-Sleep -Seconds 12

Write-Host "4) Unauthorized request should be 401:" -ForegroundColor Cyan
curl.exe -s -o NUL -w "%{http_code}`n" -X POST http://localhost:3000/api/ingest/products `
  -H "Content-Type: application/json" --data "@scripts/smoke-ingest.json"

Write-Host "5) Authorized ingest should create 1 product (DRAFT):" -ForegroundColor Cyan
curl.exe -s -X POST http://localhost:3000/api/ingest/products `
  -H "Content-Type: application/json" -H "Authorization: Bearer $key" `
  --data "@scripts/smoke-ingest.json"
Write-Host ""

Write-Host "6) Re-running the same ingest should UPDATE (idempotent, no duplicate):" -ForegroundColor Cyan
curl.exe -s -X POST http://localhost:3000/api/ingest/products `
  -H "Content-Type: application/json" -H "Authorization: Bearer $key" `
  --data "@scripts/smoke-ingest.json"
Write-Host ""

Write-Host "7) Non-compliant payload (scraped price) should be 400:" -ForegroundColor Cyan
$bad = '{"products":[{"asin":"B08XYZ1234","marketplace":"amazon.com","price":29.99,"editorialDraft":{"title":"x"}}]}'
curl.exe -s -o NUL -w "%{http_code}`n" -X POST http://localhost:3000/api/ingest/products `
  -H "Content-Type: application/json" -H "Authorization: Bearer $key" --data $bad

Write-Host "`nVerify in Prisma Studio (status should be DRAFT, isActive false):" -ForegroundColor Green
Write-Host "  pnpm prisma studio"
Write-Host "Stop the dev app PID: $($app.Id)" -ForegroundColor DarkGray
