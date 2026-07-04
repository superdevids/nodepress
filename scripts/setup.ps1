Write-Host "================================" -ForegroundColor Green
Write-Host "  NodePress - Project Setup" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Step 1: Copy .env if not exists
if (-not (Test-Path .env)) {
  Write-Host "[1/4] Creating .env from .env.example..." -ForegroundColor Blue
  Copy-Item .env.example .env
  Write-Host "  ✅ .env created" -ForegroundColor Green
} else {
  Write-Host "[1/4] .env already exists, skipping..." -ForegroundColor Blue
}

# Step 2: Install dependencies
Write-Host "[2/4] Installing dependencies..." -ForegroundColor Blue
npm install
Write-Host "  ✅ Dependencies installed" -ForegroundColor Green

# Step 3: Run database migrations
Write-Host "[3/4] Running database migrations..." -ForegroundColor Blue
npm run db:migrate
Write-Host "  ✅ Migrations applied" -ForegroundColor Green

# Step 4: Seed database
Write-Host "[4/4] Seeding database..." -ForegroundColor Blue
npm run db:seed
Write-Host "  ✅ Database seeded" -ForegroundColor Green

Write-Host ""
Write-Host "NodePress is ready!" -ForegroundColor Green
Write-Host "  Start with: npm run dev" -ForegroundColor Green
Write-Host "  Admin Panel: http://localhost:3000" -ForegroundColor Green
Write-Host "  API:          http://localhost:3001" -ForegroundColor Green
