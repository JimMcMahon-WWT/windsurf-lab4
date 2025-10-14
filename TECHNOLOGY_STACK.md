# Technology Stack Recommendations

## Stack Overview

This technology stack is optimized for a team of 5-8 developers, balancing modern practices with proven technologies, and prioritizing developer productivity and system scalability.

---

## 1. Programming Languages & Frameworks

### Backend Services

#### **Node.js + Express (Recommended)**

**Why Node.js:**
- Single language (JavaScript/TypeScript) across frontend and backend
- Excellent for I/O-heavy operations (microservices)
- Large ecosystem (npm)
- Good async/event-driven support
- Team can share code between services

**Framework: Express.js**
```javascript
// Example service structure
const express = require('express');
const app = express();

app.use(express.json());
app.use(authenticate);

app.get('/api/products', getProducts);
app.post('/api/products', authorize('admin'), createProduct);

app.listen(3002);
```

**Alternative: NestJS**
- Better for larger teams
- Built-in architecture patterns
- TypeScript-first
- Dependency injection

```typescript
@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  async findAll() {
    return this.productService.findAll();
  }
}
```

#### **Alternative Stack: Go**

**Pros:**
- Better performance than Node.js
- Excellent concurrency (goroutines)
- Smaller memory footprint
- Fast compilation

**Cons:**
- Steeper learning curve
- Smaller ecosystem than Node.js
- Less shared code with frontend

**Recommendation:** Node.js for team size 5-8, Go for performance-critical services (Payment, Inventory)

---

## 2. Frontend Technologies

### **React + TypeScript (Recommended)**

**Web Application:**
```bash
npm create vite@latest ecommerce-web -- --template react-ts
```

**Key Libraries:**
- **State Management**: Redux Toolkit or Zustand
- **Routing**: React Router v6
- **UI Framework**: Material-UI or TailwindCSS + shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: React Query (TanStack Query)
- **Icons**: Lucide React

```typescript
// Example with React Query
import { useQuery } from '@tanstack/react-query';

function ProductList() {
  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json())
  });

  if (isLoading) return <Loading />;
  
  return (
    <div className="grid grid-cols-4 gap-4">
      {data.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### **Admin Dashboard: React Admin or Next.js**

```typescript
// Using React Admin
import { Admin, Resource } from 'react-admin';
import { OrderList, OrderEdit } from './orders';

const App = () => (
  <Admin dataProvider={dataProvider}>
    <Resource name="orders" list={OrderList} edit={OrderEdit} />
    <Resource name="products" list={ProductList} edit={ProductEdit} />
    <Resource name="users" list={UserList} />
  </Admin>
);
```

---

## 3. Databases

### **PostgreSQL 15+ (Primary Database)**

**Used By:**
- User Service
- Product Service
- Order Service
- Payment Service
- Inventory Service
- Notification Service

**Why PostgreSQL:**
- ACID compliance
- Excellent JSON support (JSONB)
- Full-text search capabilities
- Rich ecosystem
- Proven at scale
- Great tooling (pg_admin, migrations)

**Configuration:**
```yaml
# docker-compose.yml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: user_db
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${DB_PASSWORD}
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"
```

**Connection Pool (Node.js):**
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // max clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### **Redis 7+ (Caching & Session Store)**

**Used By:**
- Cart Service (primary database)
- All services (caching layer)
- Rate limiting
- Session management

**Why Redis:**
- In-memory performance
- Rich data structures (Hash, Set, Sorted Set)
- Built-in TTL
- Pub/Sub capabilities
- Persistence options (RDB + AOF)

**Configuration:**
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data
```

**Usage Example:**
```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  db: 0,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// Cache product
await redis.setex(
  `product:${productId}`, 
  900, // 15 minutes
  JSON.stringify(product)
);

// Get from cache
const cached = await redis.get(`product:${productId}`);
```

### **Elasticsearch 8+ (Search Engine)**

**Used By:**
- Search Service

**Why Elasticsearch:**
- Powerful full-text search
- Faceted search support
- Near real-time indexing
- Scalable distributed architecture
- Rich query DSL

**Configuration:**
```yaml
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
```

---

## 4. Message Broker / Event Bus

### **Apache Kafka (Recommended for Scale)**

**Why Kafka:**
- High throughput (millions of messages/sec)
- Durable message storage
- Event replay capability
- Strong ordering guarantees
- Industry standard

**Configuration:**
```yaml
# docker-compose.yml
zookeeper:
  image: confluentinc/cp-zookeeper:7.5.0
  environment:
    ZOOKEEPER_CLIENT_PORT: 2181

kafka:
  image: confluentinc/cp-kafka:7.5.0
  depends_on:
    - zookeeper
  environment:
    KAFKA_BROKER_ID: 1
    KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
  ports:
    - "9092:9092"
```

**Client (KafkaJS):**
```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka:9092']
});

const producer = kafka.producer();
await producer.connect();

// Publish event
await producer.send({
  topic: 'order-events',
  messages: [
    {
      key: orderId,
      value: JSON.stringify(orderEvent)
    }
  ]
});

// Consume events
const consumer = kafka.consumer({ groupId: 'payment-service' });
await consumer.connect();
await consumer.subscribe({ topic: 'order-events' });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());
    await handleOrderEvent(event);
  }
});
```

### **Alternative: RabbitMQ**

**Why RabbitMQ:**
- Easier to set up and operate
- Better for smaller scale
- Rich routing capabilities
- Good management UI

**When to choose RabbitMQ:**
- Team < 5 developers
- < 100K messages/day
- Need complex routing logic

---

## 5. API Gateway

### **Kong Gateway (Recommended)**

**Why Kong:**
- Open source and mature
- Rich plugin ecosystem
- Excellent performance
- Good documentation
- Kubernetes-native

**Configuration:**
```yaml
# docker-compose.yml
kong:
  image: kong:3.4-alpine
  environment:
    KONG_DATABASE: postgres
    KONG_PG_HOST: postgres
    KONG_PROXY_ACCESS_LOG: /dev/stdout
    KONG_ADMIN_ACCESS_LOG: /dev/stdout
    KONG_PROXY_ERROR_LOG: /dev/stderr
    KONG_ADMIN_ERROR_LOG: /dev/stderr
    KONG_ADMIN_LISTEN: 0.0.0.0:8001
  ports:
    - "8000:8000"  # Proxy
    - "8443:8443"  # Proxy SSL
    - "8001:8001"  # Admin API
```

**Plugin Configuration:**
```bash
# Add JWT authentication
curl -X POST http://localhost:8001/plugins \
  --data "name=jwt"

# Add rate limiting
curl -X POST http://localhost:8001/plugins \
  --data "name=rate-limiting" \
  --data "config.minute=100"

# Add CORS
curl -X POST http://localhost:8001/plugins \
  --data "name=cors" \
  --data "config.origins=*"
```

### **Alternative: AWS API Gateway**

**Pros:**
- Fully managed
- Auto-scaling
- Good AWS integration

**Cons:**
- Vendor lock-in
- Can be expensive at scale
- Less control

---

## 6. Authentication & Security

### **JWT (JSON Web Tokens)**

**Implementation:**
```javascript
const jwt = require('jsonwebtoken');

// Generate token
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

// Verify token
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

### **Password Hashing: bcrypt**

```javascript
const bcrypt = require('bcryptjs');

// Hash password
const hashedPassword = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(password, hashedPassword);
```

### **Secrets Management**

**Development:**
- `.env` files with `dotenv`
- Never commit `.env` to git

**Production:**
- **AWS**: AWS Secrets Manager or Parameter Store
- **GCP**: Secret Manager
- **Azure**: Key Vault
- **Self-hosted**: HashiCorp Vault

---

## 7. Container Orchestration

### **Docker + Docker Compose (Development)**

```yaml
# docker-compose.yml
version: '3.8'

services:
  user-service:
    build: ./services/user-service
    ports:
      - "3001:3001"
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - postgres
      - redis
      - kafka

  product-service:
    build: ./services/product-service
    ports:
      - "3002:3002"
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  # ... other services
```

### **Kubernetes (Production)**

**Why Kubernetes:**
- Industry standard
- Auto-scaling
- Self-healing
- Rolling updates
- Service discovery

**Deployment Example:**
```yaml
# user-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: ecommerce/user-service:1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: DB_HOST
          value: postgres-service
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## 8. Monitoring & Observability

### **Prometheus + Grafana (Metrics)**

**Why Prometheus:**
- Time-series database
- Pull-based model
- Rich query language (PromQL)
- Alerting support

**Setup:**
```yaml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana:latest
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

**Application Metrics (Node.js):**
```javascript
const promClient = require('prom-client');
const register = new promClient.Registry();

// Default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### **ELK Stack (Logs)**

**Components:**
- **Elasticsearch**: Log storage
- **Logstash**: Log aggregation
- **Kibana**: Log visualization

**Alternative: Loki + Grafana**
- Lighter weight
- Better Kubernetes integration
- Easier to operate

**Structured Logging (Winston):**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.info('User registered', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString()
});
```

### **Jaeger (Distributed Tracing)**

**Why Jaeger:**
- OpenTelemetry compatible
- Visualize request flow
- Performance bottleneck identification

**OpenTelemetry Setup:**
```javascript
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const provider = new NodeTracerProvider();
const exporter = new JaegerExporter({
  endpoint: 'http://jaeger:14268/api/traces'
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();
```

---

## 9. CI/CD Pipeline

### **GitHub Actions (Recommended)**

```yaml
# .github/workflows/user-service.yml
name: User Service CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'services/user-service/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
        working-directory: services/user-service
      - run: npm test
        working-directory: services/user-service

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - uses: docker/build-push-action@v4
        with:
          context: services/user-service
          push: true
          tags: ecommerce/user-service:${{ github.sha }},ecommerce/user-service:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}
      - run: |
          kubectl set image deployment/user-service \
            user-service=ecommerce/user-service:${{ github.sha }}
```

---

## 10. Testing Tools

### **Unit Testing**

```javascript
// Jest
const request = require('supertest');
const app = require('../app');

describe('POST /api/users/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('token');
  });
});
```

### **Integration Testing**

```javascript
// Testcontainers
const { PostgreSqlContainer } = require('testcontainers');

let container;
let pool;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  pool = new Pool({
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword()
  });
});

afterAll(async () => {
  await pool.end();
  await container.stop();
});
```

### **E2E Testing**

```javascript
// Playwright
const { test, expect } = require('@playwright/test');

test('complete checkout flow', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Login
  await page.click('text=Login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button:has-text("Login")');
  
  // Add to cart
  await page.click('text=Products');
  await page.click('.product-card:first-child button:has-text("Add to Cart")');
  
  // Checkout
  await page.click('text=Cart');
  await page.click('button:has-text("Checkout")');
  
  await expect(page).toHaveURL(/\/order-confirmation/);
});
```

---

## Complete Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React + TypeScript | Web application |
| **Mobile** | React Native (optional) | Mobile apps |
| **API Gateway** | Kong | Request routing, auth |
| **Backend** | Node.js + Express | Microservices |
| **Databases** | PostgreSQL 15 | Primary data store |
| **Cache** | Redis 7 | Caching, sessions, cart |
| **Search** | Elasticsearch 8 | Product search |
| **Message Broker** | Apache Kafka | Event-driven communication |
| **Orchestration** | Kubernetes | Container orchestration |
| **CI/CD** | GitHub Actions | Automation pipeline |
| **Monitoring** | Prometheus + Grafana | Metrics and dashboards |
| **Logging** | Loki + Grafana | Log aggregation |
| **Tracing** | Jaeger | Distributed tracing |
| **Testing** | Jest + Playwright | Unit, integration, E2E |

---

## Development Environment Setup

### Prerequisites
```bash
# Install Node.js 18+
nvm install 18
nvm use 18

# Install Docker
# https://docs.docker.com/get-docker/

# Install kubectl
# https://kubernetes.io/docs/tasks/tools/

# Install k9s (Kubernetes CLI)
brew install k9s
```

### Quick Start
```bash
# Clone repository
git clone https://github.com/yourorg/ecommerce-microservices.git
cd ecommerce-microservices

# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis, Kafka, etc.)
docker-compose up -d

# Run database migrations
npm run migrate

# Start all services
npm run dev

# Start frontend
cd web && npm run dev
```

---

## Cost Estimation (Cloud Hosting)

### AWS (Monthly, 10K concurrent users)

| Service | Configuration | Cost |
|---------|---------------|------|
| **EKS Cluster** | 3 worker nodes (t3.medium) | $120 |
| **RDS PostgreSQL** | db.t3.medium (3 instances) | $180 |
| **ElastiCache Redis** | cache.t3.medium (2 nodes) | $90 |
| **Elasticsearch** | t3.medium.elasticsearch (3 nodes) | $200 |
| **MSK (Kafka)** | kafka.t3.small (3 brokers) | $150 |
| **Load Balancer** | Application Load Balancer | $25 |
| **S3** | Image storage (100GB) | $3 |
| **CloudWatch** | Logs and monitoring | $50 |
| **Data Transfer** | 1TB/month | $90 |
| **Total** | | **~$908/month** |

### Ways to Reduce Costs:
- Use managed Kubernetes (EKS/GKE/AKS) credits
- Reserved instances (40% savings)
- Auto-scaling to minimum during off-peak
- Use cloud-agnostic tools for flexibility
