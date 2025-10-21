# Order Service - Event-Driven Microservice

Event-driven order management service with **Event Sourcing**, **SAGA Pattern**, and **CQRS**.

## 🎯 Features

### Order Management
- ✅ Create orders from cart
- ✅ Order validation and processing
- ✅ Order status tracking
- ✅ Order cancellation with compensation
- ✅ Order history and audit trail

### Cart Management
- ✅ Shopping cart persistence
- ✅ Cart item management (add/update/remove)
- ✅ Redis caching for performance
- ✅ Auto-expiration of abandoned carts

### Event-Driven Architecture
- ✅ **Event Sourcing** - Complete audit trail
- ✅ **SAGA Pattern** - Distributed transaction coordination
- ✅ **CQRS** - Separate read and write models
- ✅ **Event Store** - Immutable event log
- ✅ **Outbox Pattern** - Reliable message delivery
- ✅ **Dead Letter Queue** - Failed message handling

### Payment & Fulfillment
- ✅ Payment processing integration (Stripe)
- ✅ Inventory reservation with rollback
- ✅ Shipping scheduling
- ✅ Compensating transactions

## 🏗️ Architecture

### Event Sourcing
All state changes are stored as events in the event store. The current state is derived by replaying events.

```
Event Store → [OrderCreated, PaymentProcessed, OrderShipped] → Current Order State
```

### SAGA Orchestration
Order processing follows a SAGA pattern with compensating actions:

```
1. Validate Order
2. Reserve Inventory     ← compensate: Release Inventory
3. Process Payment       ← compensate: Refund Payment
4. Confirm Order         ← compensate: Cancel Order
5. Schedule Shipping     ← compensate: Cancel Shipping
```

If any step fails, compensating actions are executed in reverse order.

### CQRS Pattern
- **Write Model**: Event-sourced aggregates
- **Read Model**: Optimized projections in PostgreSQL

## 📦 Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Event Store**: PostgreSQL (event_store table)
- **Message Queue**: Apache Kafka
- **Cache**: Redis
- **Database**: PostgreSQL
- **Payment**: Stripe API

## 🚀 Getting Started

### Prerequisites

```bash
- Node.js 18+
- Docker & Docker Compose
- Running infrastructure (Postgres, Redis, Kafka)
```

### Installation

```bash
cd services/order-service
npm install
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
# Server
PORT=3003
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=order_db
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=order-service
KAFKA_GROUP_ID=order-service-group

# Payment Gateway
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Service URLs
PRODUCT_SERVICE_URL=http://localhost:3002
INVENTORY_SERVICE_URL=http://localhost:3002
```

### Database Setup

1. Create database:
```bash
docker exec -it ecommerce-postgres psql -U postgres -c "CREATE DATABASE order_db;"
```

2. Run schema:
```bash
docker exec -i ecommerce-postgres psql -U postgres -d order_db < schema.sql
```

### Start Infrastructure

```bash
# From root directory
docker-compose up -d zookeeper kafka postgres redis
```

### Run Service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📡 API Endpoints

### Cart Management

```bash
# Get cart
GET /api/v1/cart
Headers: x-user-id: <user-uuid>

# Add item to cart
POST /api/v1/cart/items
Headers: x-user-id: <user-uuid>
Body: {
  "productId": "uuid",
  "productName": "iPhone 15 Pro",
  "productSku": "IP15P-128",
  "quantity": 1,
  "price": 999.00
}

# Update item quantity
PUT /api/v1/cart/items/:productId
Body: { "quantity": 2 }

# Remove item
DELETE /api/v1/cart/items/:productId

# Clear cart
DELETE /api/v1/cart
```

### Order Management

```bash
# Create order
POST /api/v1/orders
Headers: x-user-id: <user-uuid>
Body: {
  "items": [
    {
      "productId": "uuid",
      "productName": "iPhone 15 Pro",
      "productSku": "IP15P-128",
      "quantity": 1,
      "unitPrice": 999.00,
      "totalPrice": 999.00
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "phone": "+1234567890"
  },
  "billingAddress": { ... },
  "paymentMethod": "card",
  "notes": "Please deliver before 5pm"
}

# Get order by ID
GET /api/v1/orders/:orderId

# Get user's orders
GET /api/v1/orders?page=1&limit=20

# Get order by number
GET /api/v1/orders/number/:orderNumber

# Cancel order
POST /api/v1/orders/:orderId/cancel
Body: { "reason": "Changed my mind" }

# Get order statistics
GET /api/v1/orders/stats
```

## 📊 Event Types

### Order Events
- `order.created` - Order created
- `order.confirmed` - Order confirmed after validation
- `order.cancelled` - Order cancelled
- `order.completed` - Order completed
- `order.failed` - Order processing failed

### Payment Events
- `payment.requested` - Payment requested
- `payment.succeeded` - Payment successful
- `payment.failed` - Payment failed
- `payment.refunded` - Payment refunded

### Inventory Events
- `inventory.reserved` - Inventory reserved
- `inventory.released` - Inventory released (compensation)
- `inventory.failed` - Inventory reservation failed

### Shipping Events
- `shipping.confirmed` - Shipping scheduled
- `shipping.dispatched` - Order shipped
- `shipping.delivered` - Order delivered

## 🔄 Order Lifecycle

```
PENDING → CONFIRMED → PAYMENT_PROCESSING → PROCESSING → SHIPPED → DELIVERED
    ↓
CANCELLED / FAILED
```

## 🛠️ Event Store Structure

```sql
event_store:
  - aggregate_id: Order ID
  - aggregate_type: "Order"
  - event_type: "OrderCreated", "PaymentProcessed", etc.
  - event_version: Sequential version number
  - event_data: JSON payload
  - metadata: Correlation/causation IDs
  - created_at: Timestamp
```

## 🎭 SAGA State Management

```sql
saga_instances:
  - saga_type: "OrderProcessingSaga"
  - aggregate_id: Order ID
  - status: started/in_progress/completed/failed/compensating
  - current_step: Current step name
  - state_data: SAGA state (reservations, payment info, etc.)
  
saga_steps:
  - saga_id: Reference to saga instance
  - step_name: "ReserveInventory", "ProcessPayment", etc.
  - status: pending/in_progress/completed/failed/compensated
  - retry_count: Number of retries
```

## 💀 Dead Letter Queue

Failed events are automatically sent to the DLQ for manual inspection and retry:

```sql
dead_letter_queue:
  - message_data: Original message
  - error_message: Error details
  - retry_count: Number of retry attempts
  - failed_at: Timestamp
```

## 🧪 Testing

```bash
# Run tests
npm test

# Test order creation flow
curl -X POST http://localhost:3003/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-uuid" \
  -d @test-order.json
```

## 📈 Monitoring

- Event store size: `SELECT COUNT(*) FROM event_store`
- Active SAGAs: `SELECT COUNT(*) FROM saga_instances WHERE status IN ('started', 'in_progress')`
- Failed SAGAs: `SELECT * FROM saga_instances WHERE status = 'failed'`
- DLQ messages: `SELECT COUNT(*) FROM dead_letter_queue WHERE resolved_at IS NULL`

## 🔐 Security Considerations

- Input validation with Joi
- SQL injection prevention (parameterized queries)
- CORS configuration
- Helmet.js security headers
- Rate limiting (TODO)
- Authentication/Authorization (TODO - currently uses x-user-id header)

## 🚧 Future Enhancements

- [ ] Webhook support for order status updates
- [ ] Email notifications
- [ ] Real-time order tracking
- [ ] Advanced analytics and reporting
- [ ] Order modification (add/remove items before confirmation)
- [ ] Subscription orders
- [ ] Multi-currency support
- [ ] Return/refund workflow
- [ ] Integration tests with Kafka
- [ ] Performance benchmarks

## 📝 License

MIT
