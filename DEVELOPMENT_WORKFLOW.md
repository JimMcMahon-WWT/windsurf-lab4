# Development Workflow Guide

## Quick Start

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/yourorg/ecommerce-monorepo.git
cd ecommerce-monorepo

# 2. Install dependencies (installs all workspaces)
npm install

# 3. Start infrastructure (PostgreSQL, Redis, Kafka, etc.)
npm run docker:dev

# 4. Run database migrations
npm run migrate:up

# 5. Seed test data (optional)
npm run seed

# 6. Start all services in development mode
npm run dev
```

Access points:
- **Customer Web**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5174
- **API Gateway**: http://localhost:8000
- **Grafana**: http://localhost:3000
- **Prometheus**: http://localhost:9090

---

## Daily Development Workflow

### Working on a Single Service

```bash
# Terminal 1: Infrastructure (if not running)
npm run docker:dev

# Terminal 2: Start specific service
cd services/user-service
npm run dev

# Terminal 3: Run tests in watch mode
npm run test:watch
```

### Working on Multiple Services

```bash
# Start only specific services
turbo run dev --filter=@ecommerce/user-service --filter=@ecommerce/product-service

# Or use workspace filtering
npm run dev --workspace=services/user-service --workspace=services/product-service
```

### Working on Frontend

```bash
# Start customer web app
cd apps/customer-web
npm run dev

# Start admin dashboard
cd apps/admin-dashboard
npm run dev
```

---

## Common Tasks

### Adding a New Dependency

**Service-specific dependency:**
```bash
cd services/user-service
npm install express-rate-limit
```

**Shared package dependency:**
```bash
cd packages/common
npm install lodash
npm install -D @types/lodash
```

**Update all workspaces:**
```bash
# At root
npm install
```

### Creating a New Service

```bash
# 1. Create service directory
mkdir -p services/analytics-service/src/{controllers,services,repositories,models,routes,middlewares,events,config}

# 2. Copy package.json template
cp services/user-service/package.json services/analytics-service/
# Edit name, version, etc.

# 3. Copy tsconfig.json
cp services/user-service/tsconfig.json services/analytics-service/

# 4. Create Dockerfile
cp services/user-service/Dockerfile services/analytics-service/

# 5. Install dependencies
cd services/analytics-service
npm install

# 6. Create entry point
cat > src/server.ts << 'EOF'
import express from 'express';
import { logger } from '@ecommerce/common';

const app = express();
const PORT = process.env.PORT || 3009;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  logger.info(`Analytics service running on port ${PORT}`);
});
EOF

# 7. Add to docker-compose
# Edit infrastructure/docker/docker-compose.yml

# 8. Add Kubernetes manifests
mkdir -p infrastructure/kubernetes/services/analytics-service
```

### Creating a New Shared Package

```bash
# 1. Create package structure
mkdir -p packages/notifications/src
cd packages/notifications

# 2. Create package.json
cat > package.json << 'EOF'
{
  "name": "@ecommerce/notifications",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
EOF

# 3. Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "extends": "../../config/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF

# 4. Create source files
cat > src/index.ts << 'EOF'
export * from './email';
export * from './sms';
EOF

# 5. Install in root
cd ../..
npm install
```

---

## Testing

### Run All Tests

```bash
# Run all tests across all workspaces
npm run test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### Test Specific Service

```bash
# Unit tests
npm run test --workspace=services/user-service

# Watch mode
cd services/user-service
npm run test:watch

# With coverage
npm run test:coverage
```

### E2E Testing

```bash
# Run Playwright tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/checkout-flow.spec.ts

# Debug mode
npx playwright test --debug

# Generate report
npx playwright show-report
```

### Load Testing

```bash
# K6 load test
cd tests/load/k6
k6 run checkout-test.js

# Artillery test
cd tests/load/artillery
artillery run api-load.yml
```

---

## Code Quality

### Linting

```bash
# Lint all code
npm run lint

# Auto-fix issues
npm run lint:fix

# Lint specific workspace
npm run lint --workspace=services/user-service
```

### Formatting

```bash
# Check formatting
npm run format:check

# Format all code
npm run format
```

### Type Checking

```bash
# Type check all TypeScript
npm run type-check

# Type check specific service
cd services/user-service
npm run type-check
```

---

## Database Operations

### Migrations

```bash
# Run all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Create new migration
cd services/user-service
npm run migrate:create add_email_verification
```

### Seeding

```bash
# Seed all databases
npm run seed

# Seed specific service
cd services/product-service
npm run seed
```

---

## Building and Deploying

### Build for Production

```bash
# Build all services and apps
npm run build

# Build only services
npm run build:services

# Build only apps
npm run build:apps

# Build specific service
npm run build --workspace=services/user-service
```

### Docker Build

```bash
# Build all service images
for service in services/*/; do
  SERVICE_NAME=$(basename $service)
  docker build -t ecommerce/$SERVICE_NAME:latest $service
done

# Build specific service
docker build -t ecommerce/user-service:latest services/user-service/
```

### Deploy to Kubernetes

```bash
# Apply all manifests
npm run k8s:apply

# Deploy specific service
kubectl apply -f infrastructure/kubernetes/services/user-service/

# Check deployment status
kubectl get pods -n ecommerce-prod

# View logs
kubectl logs -f deployment/user-service -n ecommerce-prod
```

---

## Git Workflow

### Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/add-wishlist

# 2. Make changes across services
# Edit services/user-service/src/...
# Edit packages/types/src/...
# Edit apps/customer-web/src/...

# 3. Run tests
npm run test

# 4. Commit changes
git add .
git commit -m "feat: add wishlist functionality"
# Pre-commit hooks run automatically (lint, format)

# 5. Push and create PR
git push origin feature/add-wishlist
```

### Commit Message Format

Follow Conventional Commits:

```
feat: add user authentication
fix: resolve cart calculation bug
docs: update API documentation
refactor: improve database queries
test: add integration tests for orders
chore: update dependencies
```

### Pull Request Process

1. Create PR on GitHub
2. Automated CI runs:
   - Linting
   - Type checking
   - Unit tests
   - Integration tests
   - Build verification
3. Code review by team
4. Merge to `develop` → auto-deploy to staging
5. Merge to `main` → auto-deploy to production

---

## Debugging

### Debug Service with VSCode

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug User Service",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/services/user-service/src/server.ts"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### View Logs

```bash
# Docker logs
npm run docker:logs

# Specific service logs
docker-compose -f infrastructure/docker/docker-compose.yml logs -f user-service

# Kubernetes logs
kubectl logs -f deployment/user-service -n ecommerce-prod

# Follow logs for multiple pods
kubectl logs -f -l app=user-service -n ecommerce-prod
```

### Database Debugging

```bash
# Connect to PostgreSQL
docker exec -it ecommerce-postgres psql -U postgres -d user_db

# Connect to Redis
docker exec -it ecommerce-redis redis-cli

# View Elasticsearch indices
curl http://localhost:9200/_cat/indices?v
```

---

## Performance Monitoring

### Local Monitoring

Access dashboards:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Jaeger**: http://localhost:16686

### Check Service Health

```bash
# Health check all services
for port in 3001 3002 3003 3004 3005 3006 3007 3008; do
  echo "Port $port:"
  curl -s http://localhost:$port/health | jq
done
```

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find and kill process
lsof -i :3001
kill -9 <PID>
```

**Docker containers not starting:**
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs

# Restart services
docker-compose restart

# Clean slate
docker-compose down -v
docker-compose up -d
```

**Dependency conflicts:**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors:**
```bash
# Clean and rebuild
npm run clean
npm run build
```

**Database connection errors:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Verify connection
psql -h localhost -U postgres -c "SELECT 1"
```

---

## Best Practices

### Code Organization

- Place shared logic in `packages/`
- Keep services focused and independent
- Use TypeScript strict mode
- Write tests alongside code

### Testing

- Aim for 70%+ code coverage
- Write unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows

### Git

- Small, focused commits
- Descriptive commit messages
- Feature branches from `develop`
- Keep PRs reviewable (<500 lines)

### Performance

- Use Redis for caching
- Implement pagination
- Add database indexes
- Monitor query performance

### Security

- Never commit secrets
- Use environment variables
- Validate all inputs
- Implement rate limiting
- Keep dependencies updated

---

## Useful Commands Reference

```bash
# Development
npm run dev                    # Start all in dev mode
npm run dev:services          # Start only services
npm run dev:apps              # Start only apps

# Testing
npm run test                  # Run all tests
npm run test:unit            # Unit tests only
npm run test:integration     # Integration tests
npm run test:e2e             # End-to-end tests

# Code Quality
npm run lint                 # Lint all code
npm run lint:fix             # Auto-fix lint issues
npm run format               # Format code
npm run type-check           # TypeScript check

# Building
npm run build                # Build everything
npm run build:services       # Build services only
npm run build:apps           # Build apps only

# Docker
npm run docker:dev           # Start infrastructure
npm run docker:down          # Stop infrastructure
npm run docker:logs          # View logs

# Database
npm run migrate:up           # Run migrations
npm run migrate:down         # Rollback migration
npm run seed                 # Seed data

# Kubernetes
npm run k8s:apply            # Deploy to K8s
npm run k8s:delete           # Remove from K8s

# Cleaning
npm run clean                # Clean build artifacts
```

---

## Getting Help

- Check [README.md](./README.md) for overview
- See [MONOREPO_STRUCTURE.md](./MONOREPO_STRUCTURE.md) for structure
- Review [WORKSPACE_EXAMPLES.md](./WORKSPACE_EXAMPLES.md) for templates
- Read service-specific README files
- Ask in team chat or create GitHub issue
