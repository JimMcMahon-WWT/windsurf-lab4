# Monorepo Structure Guide

## Overview

Complete monorepo structure for the e-commerce microservices platform using **npm workspaces** for dependency management and code sharing.

---

## Directory Tree

```
ecommerce-monorepo/
├── apps/                           # Frontend applications
│   ├── customer-web/              # Customer shopping interface
│   ├── admin-dashboard/           # Admin management interface
│   └── mobile/                    # React Native app (optional)
│
├── services/                      # Backend microservices
│   ├── user-service/
│   ├── product-service/
│   ├── cart-service/
│   ├── order-service/
│   ├── payment-service/
│   ├── inventory-service/
│   ├── notification-service/
│   └── search-service/
│
├── packages/                      # Shared libraries
│   ├── common/                   # Common utilities
│   ├── database/                 # Database utilities
│   ├── events/                   # Event-driven utilities
│   ├── auth/                     # Authentication utilities
│   ├── api-client/               # API client library
│   ├── types/                    # Shared TypeScript types
│   └── config/                   # Shared configuration
│
├── infrastructure/               # Infrastructure as Code
│   ├── docker/
│   ├── kubernetes/
│   ├── terraform/
│   ├── helm/
│   └── scripts/
│
├── docs/                        # Documentation
│   ├── architecture/
│   ├── api/
│   ├── guides/
│   └── adr/
│
├── tests/                       # System-wide tests
│   ├── e2e/
│   ├── load/
│   └── contract/
│
├── config/                      # Shared configs
│   ├── eslint/
│   ├── prettier/
│   ├── tsconfig/
│   └── jest/
│
└── scripts/                     # Build/utility scripts
```

---

## Standard Service Structure

Every microservice follows this pattern:

```
service-name/
├── src/
│   ├── controllers/      # HTTP request handlers
│   ├── services/         # Business logic
│   ├── repositories/     # Data access
│   ├── models/           # Domain models
│   ├── routes/           # API routes
│   ├── middlewares/      # Express middlewares
│   ├── events/
│   │   ├── publishers/   # Event publishers
│   │   └── consumers/    # Event consumers
│   ├── config/           # Configuration
│   ├── utils/            # Service utilities
│   └── server.ts         # Entry point
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── migrations/           # Database migrations
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Shared Packages

### @ecommerce/common
```
packages/common/
├── src/
│   ├── logger/           # Winston logger
│   ├── errors/           # Custom error classes
│   ├── validators/       # Validation utilities
│   └── utils/            # Helper functions
└── package.json
```

### @ecommerce/database
```
packages/database/
├── src/
│   ├── postgres/         # PostgreSQL utilities
│   ├── redis/            # Redis client
│   └── elasticsearch/    # ES client
└── package.json
```

### @ecommerce/events
```
packages/events/
├── src/
│   ├── kafka/            # Kafka producer/consumer
│   ├── event-bus.ts      # Event bus abstraction
│   └── event-types.ts    # Event definitions
└── package.json
```

### @ecommerce/types
```
packages/types/
├── src/
│   ├── user.types.ts
│   ├── product.types.ts
│   ├── order.types.ts
│   └── event.types.ts
└── package.json
```

---

## Infrastructure Organization

### Docker
```
infrastructure/docker/
├── docker-compose.yml           # Local development
├── docker-compose.prod.yml      # Production-like
└── nginx.conf                   # NGINX config
```

### Kubernetes
```
infrastructure/kubernetes/
├── base/
│   ├── namespaces.yaml
│   ├── configmaps.yaml
│   └── secrets.yaml
├── services/
│   ├── user-service/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   └── [other services...]
└── infrastructure/
    ├── postgres/
    ├── redis/
    └── kafka/
```

### Terraform
```
infrastructure/terraform/
├── aws/
│   ├── main.tf
│   ├── eks.tf
│   ├── rds.tf
│   └── vpc.tf
└── modules/
```

---

## Root Configuration Files

### package.json
```json
{
  "name": "ecommerce-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "services/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

### turbo.json
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## Benefits

✅ **Code Reusability** - Shared packages eliminate duplication  
✅ **Consistent Structure** - Same patterns across all services  
✅ **Type Safety** - Shared types across monorepo  
✅ **Atomic Changes** - Update multiple services in one PR  
✅ **Efficient CI/CD** - Smart caching and parallel execution  
✅ **Single Clone** - Everything in one repository

---

See detailed examples in:
- [Folder Structure Details](./FOLDER_STRUCTURE_DETAILS.md)
- [Workspace Configuration](./WORKSPACE_CONFIGURATION.md)
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
