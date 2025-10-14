# Data Flow Diagrams

## Overview

This document details the data flows for key user journeys and system operations in the e-commerce platform.

---

## 1. User Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant UserService
    participant UserDB
    participant Kafka
    participant NotificationService
    participant EmailProvider

    User->>Gateway: POST /api/users/register
    Gateway->>UserService: Forward Request
    UserService->>UserService: Validate Email Format
    UserService->>UserService: Hash Password
    UserService->>UserDB: INSERT user
    UserDB-->>UserService: User Created
    UserService->>UserService: Generate Verification Token
    UserService->>Kafka: Publish user.registered
    UserService-->>Gateway: 201 Created + JWT
    Gateway-->>User: Registration Success
    
    Kafka->>NotificationService: user.registered event
    NotificationService->>NotificationService: Load Email Template
    NotificationService->>EmailProvider: Send Verification Email
    EmailProvider-->>NotificationService: Email Sent
    NotificationService->>Kafka: Publish notification.sent
```

**Data Transferred:**
- **Request**: Email, password, first name, last name, phone
- **Response**: User ID, JWT token, refresh token
- **Event**: User details, verification token

**Error Scenarios:**
- Email already exists → 409 Conflict
- Invalid email format → 400 Bad Request
- Database failure → 503 Service Unavailable

---

## 2. User Login Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant UserService
    participant UserDB
    participant Redis

    User->>Gateway: POST /api/users/login
    Gateway->>UserService: Forward Request
    UserService->>Redis: Check Rate Limit
    Redis-->>UserService: Attempts Within Limit
    UserService->>UserDB: SELECT user WHERE email
    UserDB-->>UserService: User Record
    UserService->>UserService: Verify Password Hash
    UserService->>UserService: Generate JWT + Refresh Token
    UserService->>UserDB: UPDATE last_login_at
    UserService->>UserDB: INSERT refresh_token
    UserService->>Redis: Cache User Session
    UserService-->>Gateway: JWT + Refresh Token
    Gateway-->>User: Login Success
```

**Data Transferred:**
- **Request**: Email, password
- **Response**: JWT (access token), refresh token, user profile
- **Cached**: User session in Redis (15 min TTL)

**Security Features:**
- Rate limiting: 5 attempts per 15 minutes
- Password hashing: bcrypt with 12 rounds
- Token expiry: JWT (15 min), Refresh token (30 days)

---

## 3. Browse Products Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant ProductService
    participant ProductDB
    participant SearchService
    participant Elasticsearch
    participant Redis

    User->>Gateway: GET /api/products?category=...
    Gateway->>ProductService: Forward Request
    ProductService->>Redis: Check Cache
    Redis-->>ProductService: Cache Miss
    ProductService->>ProductDB: SELECT products
    ProductDB-->>ProductService: Product List
    ProductService->>Redis: Cache Result (5 min)
    ProductService-->>Gateway: Product List
    Gateway-->>User: Products with Prices
    
    Note over User,Elasticsearch: Alternative: Search Flow
    User->>Gateway: GET /api/search?q=laptop
    Gateway->>SearchService: Forward Request
    SearchService->>Elasticsearch: Full-Text Search
    Elasticsearch-->>SearchService: Search Results
    SearchService-->>Gateway: Ranked Results
    Gateway-->>User: Product Search Results
```

**Data Transferred:**
- **Request**: Category, filters (price range, brand, etc.), pagination
- **Response**: Product list with ID, name, price, images, ratings
- **Cached**: Product lists (5 min), individual products (15 min)

**Performance Optimizations:**
- Redis caching for hot products
- Elasticsearch for search (sub-second response)
- CDN for product images
- Pagination (20 items per page)

---

## 4. Add to Cart Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant CartService
    participant ProductService
    participant InventoryService
    participant Redis

    User->>Gateway: POST /api/cart/items
    Gateway->>CartService: Add Item Request
    CartService->>ProductService: GET /api/products/{id}
    ProductService-->>CartService: Product Details
    CartService->>InventoryService: GET /api/inventory/{id}
    InventoryService-->>CartService: Stock Available: 50
    CartService->>Redis: ZADD cart:{user_id}:items
    CartService->>Redis: SETEX cart totals (invalidate)
    CartService-->>Gateway: Cart Updated
    Gateway-->>User: Cart with Updated Total
```

**Data Transferred:**
- **Request**: Product ID, variant ID (optional), quantity
- **Response**: Updated cart with items, subtotal, total
- **Stored in Redis**: Cart items, metadata, applied coupons

**Business Rules:**
- Verify product availability before adding
- Store price snapshot at time of addition
- Maximum 10 items per product
- Cart expires after 7 days

---

## 5. Checkout and Order Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant OrderService
    participant CartService
    participant InventoryService
    participant PaymentService
    participant Kafka
    participant NotificationService

    User->>Gateway: POST /api/orders
    Gateway->>OrderService: Create Order
    OrderService->>CartService: GET /api/cart
    CartService-->>OrderService: Cart Items
    OrderService->>OrderService: Validate Cart
    OrderService->>InventoryService: Reserve Inventory
    InventoryService->>InventoryService: Check Stock
    InventoryService->>InventoryService: Create Reservation
    InventoryService-->>OrderService: Reservation Confirmed
    OrderService->>OrderService: Create Order (status=pending)
    OrderService->>Kafka: Publish order.created
    OrderService-->>Gateway: 202 Accepted
    Gateway-->>User: Order ID + Status
    
    Kafka->>PaymentService: order.created event
    PaymentService->>PaymentService: Process Payment
    PaymentService->>PaymentService: Call Stripe API
    PaymentService->>Kafka: Publish payment.success
    
    Kafka->>OrderService: payment.success event
    OrderService->>OrderService: Update Order (status=confirmed)
    OrderService->>Kafka: Publish order.confirmed
    
    Kafka->>InventoryService: order.confirmed event
    InventoryService->>InventoryService: Finalize Reservation
    InventoryService->>Kafka: Publish inventory.updated
    
    Kafka->>NotificationService: order.confirmed event
    NotificationService->>NotificationService: Send Confirmation Email
    
    Kafka->>CartService: order.confirmed event
    CartService->>CartService: Clear Cart
```

**Data Transferred:**
- **Order Creation**: User ID, cart items, shipping address, billing address
- **Inventory Reservation**: Product IDs, quantities, warehouse ID
- **Payment Processing**: Amount, currency, payment method
- **Notifications**: Order details, customer email

**Key Features:**
- **Idempotency**: Duplicate requests return same order
- **Timeout Handling**: Inventory reservations expire in 15 minutes
- **Atomic Operations**: Database transactions for order creation
- **Saga Orchestration**: Event-driven compensation on failures

---

## 6. Payment Processing Flow

```mermaid
sequenceDiagram
    participant PaymentService
    participant PaymentDB
    participant Stripe
    participant Kafka
    participant OrderService

    PaymentService->>PaymentService: Receive order.created
    PaymentService->>PaymentDB: Create Payment Record (pending)
    PaymentService->>Stripe: Create Payment Intent
    Stripe-->>PaymentService: Payment Intent Created
    PaymentService->>Stripe: Confirm Payment
    Stripe-->>PaymentService: Payment Successful
    PaymentService->>PaymentDB: Update Payment (success)
    PaymentService->>Kafka: Publish payment.success
    
    Note over PaymentService,OrderService: Failure Scenario
    Stripe-->>PaymentService: Payment Failed
    PaymentService->>PaymentDB: Update Payment (failed)
    PaymentService->>Kafka: Publish payment.failed
    Kafka->>OrderService: payment.failed event
    OrderService->>OrderService: Update Order (failed)
```

**Data Transferred:**
- **To Stripe**: Amount, currency, payment method token, idempotency key
- **From Stripe**: Transaction ID, status, failure reason
- **Stored**: Payment record, transaction ID, audit log

**Security Measures:**
- PCI DSS compliance (no raw card data stored)
- Tokenization via Stripe
- Idempotency keys prevent duplicate charges
- 3D Secure authentication support
- Fraud detection integration

---

## 7. Inventory Management Flow

```mermaid
sequenceDiagram
    participant Admin
    participant Gateway
    participant InventoryService
    participant InventoryDB
    participant Kafka
    participant ProductService
    participant SearchService

    Admin->>Gateway: PUT /api/inventory/{id}
    Gateway->>InventoryService: Update Stock
    InventoryService->>InventoryDB: BEGIN TRANSACTION
    InventoryService->>InventoryDB: UPDATE inventory
    InventoryService->>InventoryDB: INSERT transaction_log
    InventoryService->>InventoryDB: COMMIT
    InventoryService->>Kafka: Publish inventory.updated
    InventoryService-->>Gateway: Stock Updated
    Gateway-->>Admin: Success
    
    Kafka->>ProductService: inventory.updated event
    ProductService->>ProductService: Update Stock Status
    
    Kafka->>SearchService: inventory.updated event
    SearchService->>SearchService: Update Elasticsearch Index
```

**Data Transferred:**
- **Request**: Product ID, quantity change, reason, warehouse ID
- **Response**: Updated stock levels
- **Event**: Product ID, new quantity, warehouse ID

**Features:**
- **Transaction Log**: Complete audit trail
- **Low Stock Alerts**: Automatic notifications when below threshold
- **Multi-Warehouse**: Track stock across multiple locations
- **Reservation System**: Prevent overselling during checkout

---

## 8. Product Search Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant SearchService
    participant Elasticsearch
    participant Redis
    participant Analytics

    User->>Gateway: GET /api/search?q=laptop&filters=...
    Gateway->>SearchService: Search Request
    SearchService->>Redis: Check Query Cache
    Redis-->>SearchService: Cache Miss
    SearchService->>Elasticsearch: Full-Text Search
    Elasticsearch-->>SearchService: Results (scored)
    SearchService->>SearchService: Apply Business Rules
    SearchService->>Redis: Cache Results (5 min)
    SearchService->>Analytics: Log Search Query
    SearchService-->>Gateway: Ranked Results
    Gateway-->>User: Products List
```

**Search Query Example:**
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "laptop",
            "fields": ["name^3", "description", "category^2"],
            "type": "best_fields"
          }
        }
      ],
      "filter": [
        { "range": { "price": { "gte": 500, "lte": 1500 } } },
        { "term": { "in_stock": true } },
        { "terms": { "brand": ["Dell", "HP"] } }
      ]
    }
  },
  "sort": [
    { "_score": "desc" },
    { "rating": "desc" }
  ],
  "size": 20,
  "from": 0
}
```

**Features:**
- **Autocomplete**: Edge n-grams for suggestions
- **Faceted Search**: Filter by category, price, brand, etc.
- **Relevance Tuning**: Boost title matches over description
- **Typo Tolerance**: Fuzzy matching for misspellings

---

## 9. Order Cancellation Flow (Compensating Transaction)

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant OrderService
    participant PaymentService
    participant InventoryService
    participant Kafka

    User->>Gateway: PUT /api/orders/{id}/cancel
    Gateway->>OrderService: Cancel Order Request
    OrderService->>OrderService: Validate Cancellation
    OrderService->>OrderService: Update Order (cancelled)
    OrderService->>Kafka: Publish order.cancelled
    OrderService-->>Gateway: Cancellation Confirmed
    Gateway-->>User: Order Cancelled
    
    Kafka->>PaymentService: order.cancelled event
    PaymentService->>PaymentService: Initiate Refund
    PaymentService->>PaymentService: Call Stripe Refund API
    PaymentService->>Kafka: Publish payment.refunded
    
    Kafka->>InventoryService: order.cancelled event
    InventoryService->>InventoryService: Release/Return Stock
    InventoryService->>Kafka: Publish inventory.released
```

**Business Rules:**
- Can cancel if order status is "pending" or "confirmed"
- Cannot cancel if status is "shipped" or "delivered"
- Refund processed within 5-10 business days
- Inventory automatically restored

---

## 10. Admin Dashboard Data Flow

```mermaid
graph TB
    subgraph "Admin Dashboard"
        ADMIN[Admin User]
    end

    subgraph "Aggregation Layer"
        AGG[Analytics Service]
    end

    subgraph "Data Sources"
        ORDER[Order Service]
        PRODUCT[Product Service]
        INVENTORY[Inventory Service]
        USER[User Service]
        PAYMENT[Payment Service]
    end

    subgraph "Analytics DB"
        DW[(Data Warehouse<br/>PostgreSQL)]
        CACHE[(Redis Cache)]
    end

    ADMIN -->|Request Dashboard| AGG
    AGG -->|Daily Sync| ORDER
    AGG -->|Daily Sync| PRODUCT
    AGG -->|Real-time| INVENTORY
    AGG -->|Daily Sync| USER
    AGG -->|Daily Sync| PAYMENT
    
    ORDER --> DW
    PRODUCT --> DW
    INVENTORY --> DW
    USER --> DW
    PAYMENT --> DW
    
    DW --> CACHE
    CACHE --> AGG
    AGG -->|Dashboard Data| ADMIN
```

**Dashboard Metrics:**
- **Real-time**: Current orders, inventory levels, active users
- **Daily**: Revenue, orders, new customers
- **Weekly**: Top products, conversion rates
- **Monthly**: Revenue trends, customer retention

**Data Aggregation Strategy:**
- **ETL Pipeline**: Nightly batch jobs aggregate data
- **Caching**: Dashboard data cached for 5 minutes
- **Read Replicas**: Analytics queries use read-only replicas

---

## 11. Multi-Currency Pricing Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant ProductService
    participant CurrencyAPI
    participant Redis

    User->>Gateway: GET /api/products?currency=EUR
    Gateway->>ProductService: Request with Currency
    ProductService->>Redis: GET currency_rate:USD:EUR
    
    alt Cache Hit
        Redis-->>ProductService: Rate: 0.92
    else Cache Miss
        ProductService->>CurrencyAPI: Get Exchange Rate
        CurrencyAPI-->>ProductService: Rate: 0.92
        ProductService->>Redis: SETEX currency_rate (1 hour)
    end
    
    ProductService->>ProductService: Convert Prices
    ProductService-->>Gateway: Products in EUR
    Gateway-->>User: Products with EUR Prices
```

**Supported Currencies:**
- USD, EUR, GBP, CAD, AUD, JPY, CNY, INR

**Conversion Strategy:**
- Base currency: USD
- Exchange rates cached for 1 hour
- Rates fetched from external API (e.g., exchangerate-api.com)
- Prices rounded to 2 decimal places

---

## 12. Notification Flow

```mermaid
graph TB
    subgraph "Event Sources"
        ORDER[Order Service]
        PAYMENT[Payment Service]
        USER[User Service]
        INVENTORY[Inventory Service]
    end

    subgraph "Message Bus"
        KAFKA[Apache Kafka]
    end

    subgraph "Notification Service"
        NOTIF[Notification Service]
        PREF[Preference Check]
        TEMPLATE[Template Engine]
    end

    subgraph "Delivery Channels"
        EMAIL[SendGrid/AWS SES]
        SMS[Twilio]
        PUSH[Firebase FCM]
    end

    subgraph "Notification DB"
        DB[(Notification History)]
    end

    ORDER -->|Events| KAFKA
    PAYMENT -->|Events| KAFKA
    USER -->|Events| KAFKA
    INVENTORY -->|Events| KAFKA
    
    KAFKA -->|Consume| NOTIF
    NOTIF --> PREF
    PREF --> TEMPLATE
    
    TEMPLATE -->|Email| EMAIL
    TEMPLATE -->|SMS| SMS
    TEMPLATE -->|Push| PUSH
    
    NOTIF --> DB
```

**Notification Types:**

| Event | Channel | Template | Priority |
|-------|---------|----------|----------|
| User Registered | Email | welcome_email | Medium |
| Order Created | Email | order_confirmation | High |
| Payment Success | Email | payment_receipt | High |
| Order Shipped | Email + SMS | shipment_notification | High |
| Order Delivered | Email | delivery_confirmation | Medium |
| Password Reset | Email | password_reset | High |
| Low Stock Alert | Email (Admin) | low_stock_alert | High |

**Delivery SLA:**
- Critical (Password reset, Payment): < 1 minute
- High (Orders, Shipments): < 5 minutes
- Medium (Newsletters, Promotions): < 1 hour

---

## 13. Real-Time Inventory Updates

```mermaid
graph LR
    subgraph "Inventory Events"
        SALE[Order Placed]
        RESTOCK[Warehouse Restock]
        RETURN[Order Return]
        ADJUST[Manual Adjustment]
    end

    subgraph "Inventory Service"
        INV[Inventory Service]
        DB[(Inventory DB)]
    end

    subgraph "Event Bus"
        KAFKA[Apache Kafka]
    end

    subgraph "Subscribers"
        PRODUCT[Product Service]
        SEARCH[Search Service]
        ALERT[Alert Service]
        ANALYTICS[Analytics Service]
    end

    SALE --> INV
    RESTOCK --> INV
    RETURN --> INV
    ADJUST --> INV
    
    INV --> DB
    INV --> KAFKA
    
    KAFKA --> PRODUCT
    KAFKA --> SEARCH
    KAFKA --> ALERT
    KAFKA --> ANALYTICS
```

**Update Frequency:**
- **Order Placement**: Immediate (< 100ms)
- **Warehouse Restock**: Batch updates every 5 minutes
- **Returns**: Immediate upon return approval
- **Search Index**: Async update within 30 seconds

---

## Data Flow Performance Metrics

| Flow | Target Time | Caching | Database Operations |
|------|-------------|---------|---------------------|
| User Registration | < 500ms | - | 1 INSERT |
| User Login | < 200ms | Redis (session) | 2 SELECT, 1 UPDATE, 1 INSERT |
| Browse Products | < 100ms | Redis (5 min) | 1 SELECT |
| Product Search | < 200ms | Redis (5 min) | Elasticsearch query |
| Add to Cart | < 150ms | Redis (write-through) | Redis operations |
| Checkout | < 2s | - | Multiple services |
| Payment Processing | < 3s | - | External API + DB writes |
| Order Confirmation | < 5s (async) | - | Event-driven |

---

## Data Consistency Guarantees

### Strong Consistency (Synchronous)
- **User Authentication**: Must be immediately consistent
- **Payment Processing**: Must be immediately consistent
- **Inventory Reservation**: Must be immediately consistent

### Eventual Consistency (Asynchronous)
- **Search Index Updates**: Eventually consistent (< 30s)
- **Analytics Data**: Eventually consistent (< 5 min)
- **Notification Delivery**: Eventually consistent (< 5 min)
- **Cache Invalidation**: Eventually consistent (< 1 min)

### Conflict Resolution
- **Last Write Wins**: For user profile updates
- **Version Vectors**: For inventory updates
- **Saga Pattern**: For distributed transactions (order creation)
