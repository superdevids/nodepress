#!/bin/bash
set -e

echo "================================"
echo "  NodePress - Project Setup"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Copy .env if not exists
if [ ! -f .env ]; then
  echo -e "${BLUE}[1/4]${NC} Creating .env from .env.example..."
  cp .env.example .env
  echo -e "${GREEN}  ✅ .env created${NC}"
else
  echo -e "${BLUE}[1/4]${NC} .env already exists, skipping..."
fi

# Step 2: Install dependencies
echo -e "${BLUE}[2/4]${NC} Installing dependencies..."
npm install 2>&1 | tail -1
echo -e "${GREEN}  ✅ Dependencies installed${NC}"

# Step 3: Run database migrations
echo -e "${BLUE}[3/4]${NC} Running database migrations..."
npm run db:migrate 2>&1 | tail -1
echo -e "${GREEN}  ✅ Migrations applied${NC}"

# Step 4: Seed database
echo -e "${BLUE}[4/4]${NC} Seeding database..."
npm run db:seed 2>&1 | tail -1
echo -e "${GREEN}  ✅ Database seeded${NC}"

echo ""
echo -e "${GREEN}================================"
echo "  NodePress is ready!"
echo "================================"
echo ""
echo "  Start development:"
echo "    npm run dev"
echo ""
echo "  Or with Docker:"
echo "    docker compose up"
echo ""
echo "  Admin Panel: http://localhost:3000"
echo "  API:          http://localhost:3001"
echo "  API Docs:     http://localhost:3001/docs"
echo "================================"
