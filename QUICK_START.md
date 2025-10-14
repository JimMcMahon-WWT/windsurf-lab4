# Quick Start Guide

## Setup Your Monorepo in 5 Minutes

This guide will help you quickly set up the e-commerce monorepo structure on your local machine.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 18+** - [Download](https://nodejs.org/)
- ✅ **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- ✅ **Git** - [Download](https://git-scm.com/)
- ✅ **8GB RAM** minimum

---

## Step 1: Initialize Monorepo

### Project Root Established

**Your project root is:** `c:\Users\mcmahonj\CascadeProjects\module 4\`

All configuration files have already been created in this directory.

```powershell
# Navigate to project root
cd "c:\Users\mcmahonj\CascadeProjects\module 4"

# Verify configuration files exist
Get-ChildItem -Filter "*.json",".*"

# Install dependencies
npm install
```

### Create Workspace Directories

```powershell
# Create main workspace directories
New-Item -ItemType Directory -Path apps, services, packages, infrastructure, tests, config, scripts

# Create service directories
New-Item -ItemType Directory -Path services\user-service, services\product-service, services\cart-service, services\order-service, services\payment-service, services\inventory-service, services\notification-service, services\search-service

# Create shared package directories
New-Item -ItemType Directory -Path packages\common, packages\database, packages\events, packages\auth, packages\api-client, packages\types, packages\config

# Create app directories
New-Item -ItemType Directory -Path apps\customer-web, apps\admin-dashboard

# Create infrastructure directories
New-Item -ItemType Directory -Path infrastructure\docker, infrastructure\kubernetes, infrastructure\terraform, infrastructure\helm, infrastructure\scripts

# Create test directories
New-Item -ItemType Directory -Path tests\e2e, tests\load, tests\contract

# Create config directories
New-Item -ItemType Directory -Path config\eslint, config\prettier, config\tsconfig, config\jest
```

---

## Step 2: Setup First Service (User Service)

### Create Service Structure

```bash
cd services/user-service

# Create directory structure
mkdir -p src/{controllers,services,repositories,models,routes,middlewares,events/{publishers,consumers},config,utils,types}
mkdir -p tests/{unit,integration,fixtures}
mkdir -p migrations
```

### Create package.json

```bash
cat > package.json << 'EOF'
{
  "name": "@ecommerce/user-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0"
  }
}
EOF
```

### Create tsconfig.json

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
```

### Create Basic Server

```bash
cat > src/server.ts << 'EOF'
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});
EOF
```

### Create .env.example

```bash
cat > .env.example << 'EOF'
NODE_ENV=development
PORT=3001
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=user_db
JWT_SECRET=your_secret_key
EOF
```

### Install Dependencies

```bash
npm install
```

---

## Step 3: Setup Infrastructure

### Create Docker Compose

```bash
cd ../../infrastructure/docker

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF
```

---

## Step 4: Test Your Setup

### Start Infrastructure

```bash
# From project root
cd ../..
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Check containers are running
docker-compose -f infrastructure/docker/docker-compose.yml ps
```

### Start User Service

```bash
# Terminal 1: Start service
cd services/user-service
npm run dev

# Terminal 2: Test health endpoint
curl http://localhost:3001/health
# Should return: {"status":"healthy","service":"user-service"}
```

---

## Step 5: Add More Services

### Quick Service Creation Script

Create `scripts/create-service.sh`:

```bash
#!/bin/bash

SERVICE_NAME=$1
PORT=$2

if [ -z "$SERVICE_NAME" ] || [ -z "$PORT" ]; then
  echo "Usage: ./create-service.sh <service-name> <port>"
  exit 1
fi

echo "Creating $SERVICE_NAME on port $PORT..."

# Create directory structure
mkdir -p services/$SERVICE_NAME/src/{controllers,services,repositories,models,routes,middlewares,events,config}
mkdir -p services/$SERVICE_NAME/tests/{unit,integration}
mkdir -p services/$SERVICE_NAME/migrations

# Copy templates
cp services/user-service/package.json services/$SERVICE_NAME/
cp services/user-service/tsconfig.json services/$SERVICE_NAME/
cp services/user-service/.env.example services/$SERVICE_NAME/

# Update package.json name and port
sed -i "s/user-service/$SERVICE_NAME/g" services/$SERVICE_NAME/package.json
sed -i "s/3001/$PORT/g" services/$SERVICE_NAME/.env.example

echo "✅ Service $SERVICE_NAME created!"
echo "Next steps:"
echo "  cd services/$SERVICE_NAME"
echo "  npm install"
echo "  npm run dev"
```

### Create New Services

```bash
chmod +x scripts/create-service.sh

./scripts/create-service.sh product-service 3002
./scripts/create-service.sh cart-service 3003
./scripts/create-service.sh order-service 3004
```

---

## Step 6: Setup Shared Packages

### Create Common Package

```bash
cd packages/common

cat > package.json << 'EOF'
{
  "name": "@ecommerce/common",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
EOF

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src/**/*"]
}
EOF

mkdir -p src
cat > src/index.ts << 'EOF'
export const APP_NAME = 'E-Commerce Platform';
export const VERSION = '1.0.0';

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}
EOF

npm install
npm run build
```

### Use Shared Package in Service

```bash
cd ../../services/user-service

# Add dependency in package.json
npm install @ecommerce/common@*

# Use in code
cat >> src/server.ts << 'EOF'

import { APP_NAME, VERSION } from '@ecommerce/common';

app.get('/info', (req, res) => {
  res.json({ app: APP_NAME, version: VERSION });
});
EOF
```

---

## Step 7: Verify Everything Works

### Run All Services

```bash
# From project root
npm run dev
```

This will start all services in parallel using Turbo.

### Check Service Health

```bash
# Create health check script
cat > scripts/check-health.sh << 'EOF'
#!/bin/bash

echo "Checking service health..."

for port in 3001 3002 3003 3004 3005 3006 3007 3008; do
  response=$(curl -s http://localhost:$port/health 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo "✅ Port $port: $response"
  else
    echo "❌ Port $port: Service not running"
  fi
done
EOF

chmod +x scripts/check-health.sh
./scripts/check-health.sh
```

---

## Next Steps

### 1. Setup Frontend Apps

```bash
# Customer web app
cd apps/customer-web
npm create vite@latest . -- --template react-ts
npm install

# Admin dashboard
cd ../admin-dashboard
npm create vite@latest . -- --template react-ts
npm install
```

### 2. Add Database Migrations

```bash
# Install migration tool
npm install -g node-pg-migrate

# Create first migration
cd services/user-service
node-pg-migrate create create-users-table
```

### 3. Setup Testing

```bash
# Install Jest
npm install -D jest @types/jest ts-jest

# Create jest.config.js
npx ts-jest config:init
```

### 4. Setup CI/CD

```bash
# Create GitHub Actions workflow
mkdir -p .github/workflows

cat > .github/workflows/ci.yml << 'EOF'
name: CI

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
EOF
```

---

## Helpful Commands

```bash
# Development
npm run dev                 # Start all services
npm run dev:services       # Start only backend services
npm run dev:apps           # Start only frontend apps

# Building
npm run build              # Build everything
npm run build:services     # Build only services

# Testing
npm run test               # Run all tests
npm run lint               # Lint all code

# Infrastructure
npm run docker:dev         # Start Docker services
npm run docker:down        # Stop Docker services
npm run docker:logs        # View Docker logs

# Database
npm run migrate:up         # Run migrations
npm run seed               # Seed data
```

---

## Troubleshooting

### Ports Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Docker Issues

```bash
# Restart Docker
docker-compose -f infrastructure/docker/docker-compose.yml restart

# Clean restart
docker-compose -f infrastructure/docker/docker-compose.yml down -v
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

### Dependencies Not Found

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## Success Checklist

- ✅ Root package.json with workspaces configured
- ✅ Turbo.json for build orchestration
- ✅ At least one service running
- ✅ Docker infrastructure running
- ✅ Health checks passing
- ✅ Shared packages accessible
- ✅ TypeScript compiling without errors

---

## Additional Resources

- [Full Documentation](./README.md)
- [Monorepo Structure](./MONOREPO_STRUCTURE.md)
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)

🎉 **Congratulations!** Your monorepo is set up and ready for development!
