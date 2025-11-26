#!/bin/bash
set -e

echo "Setting up AI Coding Agent..."

# Install dependencies
echo "Installing dependencies..."
bun install

# Start PostgreSQL
echo "Starting PostgreSQL..."
docker compose up -d

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
sleep 5

# Copy env file
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cp .env.example .env
  echo "⚠️  Please edit .env and add your ANTHROPIC_API_KEY"
fi

# Run migrations
echo "Running database migrations..."
cd packages/backend
bun run db:generate
bun run db:migrate
cd ../..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your ANTHROPIC_API_KEY to .env"
echo "2. Start frontend + backend: bun run dev"
echo "4. Open http://localhost:3000"