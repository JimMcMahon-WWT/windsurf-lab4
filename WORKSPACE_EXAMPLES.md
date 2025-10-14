# Workspace Examples and Templates

## Service Package.json Template

```json
{
  "name": "@ecommerce/user-service",
  "version": "1.0.0",
  "private": true,
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src tests --ext .ts",
    "lint:fix": "eslint src tests --ext .ts --fix",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist coverage",
    "migrate:up": "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "seed": "ts-node scripts/seed.ts"
  },
  "dependencies": {
    "@ecommerce/common": "*",
    "@ecommerce/database": "*",
    "@ecommerce/events": "*",
    "@ecommerce/auth": "*",
    "@ecommerce/types": "*",
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "ioredis": "^5.3.0",
    "kafkajs": "^2.2.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "joi": "^17.11.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^6.0.0"
  }
}
```

---

## Shared Package Template

### @ecommerce/common/package.json

```json
{
  "name": "@ecommerce/common",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "winston": "^3.11.0",
    "joi": "^17.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Frontend App Package.json

### apps/customer-web/package.json

```json
{
  "name": "@ecommerce/customer-web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@ecommerce/api-client": "*",
    "@ecommerce/types": "*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.13.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "typescript": "^5.3.0",
    "@playwright/test": "^1.40.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## TypeScript Configuration Examples

### Root tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "incremental": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Service tsconfig.json (extends root)

```json
{
  "extends": "../../config/tsconfig/backend.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"],
  "references": [
    { "path": "../../packages/common" },
    { "path": "../../packages/database" },
    { "path": "../../packages/events" },
    { "path": "../../packages/auth" },
    { "path": "../../packages/types" }
  ]
}
```

---

## ESLint Configuration

### Root .eslintrc.js

```javascript
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  env: {
    node: true,
    es2022: true
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'import/order': [
      'error',
      {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        'alphabetize': { order: 'asc', caseInsensitive: true }
      }
    ]
  }
};
```

---

## Jest Configuration

### Root jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

---

## Docker Compose for Development

### infrastructure/docker/docker-compose.yml

```yaml
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
      - ./init-databases.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  redis_data:
  es_data:
```

---

## GitHub Actions CI/CD

### .github/workflows/ci.yml

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

---

## Environment Variables Template

### .env.example

```bash
# Node Environment
NODE_ENV=development

# Service Ports
USER_SERVICE_PORT=3001
PRODUCT_SERVICE_PORT=3002
CART_SERVICE_PORT=3003
ORDER_SERVICE_PORT=3004
PAYMENT_SERVICE_PORT=3005
INVENTORY_SERVICE_PORT=3006
NOTIFICATION_SERVICE_PORT=3007
SEARCH_SERVICE_PORT=3008

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ecommerce

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Authentication
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=30d

# External Services
STRIPE_SECRET_KEY=sk_test_your_stripe_key
SENDGRID_API_KEY=your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Logging
LOG_LEVEL=debug

# CORS
CORS_ORIGIN=http://localhost:5173
```

---

## Development Workflow Scripts

### scripts/dev-setup.sh

```bash
#!/bin/bash

echo "🚀 Setting up development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start infrastructure
echo "🐳 Starting Docker containers..."
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services..."
sleep 10

# Run migrations
echo "🗄️ Running database migrations..."
npm run migrate:up

# Seed data
echo "🌱 Seeding data..."
npm run seed

echo "✅ Development environment ready!"
echo "Run 'npm run dev' to start all services"
```

---

## Detailed Folder Structure Documentation

See [FOLDER_STRUCTURE_DETAILS.md](./FOLDER_STRUCTURE_DETAILS.md) for complete breakdowns of:
- Service internal structure
- Shared package organization
- Frontend app structure
- Infrastructure layouts
- Testing organization
