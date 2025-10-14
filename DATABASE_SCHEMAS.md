# Database Schemas Per Service

## Database Per Service Pattern

Each microservice owns its database, ensuring:
- **Autonomy**: Services can evolve independently
- **Isolation**: Failures don't cascade across databases
- **Technology Choice**: Each service can use the optimal database type
- **Scalability**: Databases scale independently based on service needs

---

## 1. User Service Database (PostgreSQL)

**Database Name**: `user_db`

### Schema

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer', -- customer, admin
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Addresses Table
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_type VARCHAR(20), -- shipping, billing
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(2) NOT NULL, -- ISO country code
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Reset Tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
```

### Key Design Decisions
- **UUID for IDs**: Prevents ID enumeration attacks, allows distributed ID generation
- **Separate Address Table**: Users can have multiple shipping/billing addresses
- **Token Tables**: Secure refresh token and password reset management
- **Soft Deletes**: `is_active` flag instead of hard deletes

---

## 2. Product Service Database (PostgreSQL)

**Database Name**: `product_db`

### Schema

```sql
-- Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    base_price DECIMAL(10, 2) NOT NULL,
    base_currency VARCHAR(3) DEFAULT 'USD',
    weight DECIMAL(10, 2), -- in kg
    dimensions JSONB, -- {length, width, height}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Images Table
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Variants Table (e.g., different sizes, colors)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(10, 2) DEFAULT 0,
    attributes JSONB, -- {size: "L", color: "Red"}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Reviews Table
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Reference to User Service
    rating INT CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Currency Exchange Rates (cached)
CREATE TABLE currency_rates (
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10, 6) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(base_currency, target_currency)
);

-- Indexes
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);
```

### Key Design Decisions
- **Product Variants**: Support products with multiple options (size, color, etc.)
- **JSONB for Attributes**: Flexible schema for variant attributes
- **Currency Rates Cache**: Avoid external API calls on every price conversion
- **Review Approval**: Admin moderation before reviews go live
- **Hierarchical Categories**: Support nested category structure

---

## 3. Cart Service Database (Redis)

**Database Name**: `cart_db` (Redis)

### Data Structure

```redis
# Cart data structure (Hash)
# Key: cart:{user_id} or cart:session:{session_id}
# TTL: 7 days

HSET cart:{user_id} 
    created_at {timestamp}
    updated_at {timestamp}
    currency {currency_code}

# Cart items (Sorted Set for ordering)
# Key: cart:{user_id}:items
# Score: added_timestamp
# Value: JSON string

ZADD cart:{user_id}:items {timestamp} '{
    "product_id": "uuid",
    "variant_id": "uuid",
    "quantity": 2,
    "price_snapshot": 29.99,
    "currency": "USD",
    "product_name": "Product Name",
    "image_url": "https://..."
}'

# Applied coupons
SADD cart:{user_id}:coupons "SUMMER2024"

# Cart totals (cached, expires in 5 minutes)
SETEX cart:{user_id}:totals 300 '{
    "subtotal": 59.98,
    "discount": 5.00,
    "tax": 4.50,
    "shipping": 5.00,
    "total": 64.48,
    "currency": "USD"
}'

# Abandoned cart tracking
ZADD abandoned_carts {timestamp_24h_ago} {user_id}
```

### Key Design Decisions
- **Redis for Speed**: Fast read/write for frequent cart operations
- **TTL for Auto-Cleanup**: Carts expire after 7 days of inactivity
- **Price Snapshot**: Store price at time of adding to cart
- **Session-Based Carts**: Support anonymous users with session IDs
- **Cached Totals**: Reduce calculation overhead

---

## 4. Order Service Database (PostgreSQL)

**Database Name**: `order_db`

### Schema

```sql
-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL, -- Reference to User Service
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
    currency VARCHAR(3) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    payment_id UUID, -- Reference to Payment Service
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP
);

-- Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL, -- Reference to Product Service
    variant_id UUID, -- Reference to Product Service
    product_name VARCHAR(255) NOT NULL, -- Snapshot
    sku VARCHAR(100) NOT NULL, -- Snapshot
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Status History
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    comment TEXT,
    changed_by UUID, -- User or System
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Events (for event sourcing)
CREATE TABLE order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Returns/Refunds
CREATE TABLE order_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    status VARCHAR(50) DEFAULT 'requested', -- requested, approved, rejected, completed
    reason TEXT NOT NULL,
    refund_amount DECIMAL(10, 2),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_events_order_id ON order_events(order_id);
```

### Key Design Decisions
- **Order Number**: Human-readable unique identifier (e.g., ORD-2024-00001)
- **Data Snapshot**: Store product names, prices at time of order
- **Status History**: Complete audit trail of status changes
- **Event Sourcing**: Store all events for debugging and replay
- **JSONB for Addresses**: Flexible address structure, frozen at order time
- **Idempotency**: Prevent duplicate orders with unique constraints

---

## 5. Payment Service Database (PostgreSQL)

**Database Name**: `payment_db`

### Schema

```sql
-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    order_id UUID NOT NULL, -- Reference to Order Service
    user_id UUID NOT NULL, -- Reference to User Service
    payment_method VARCHAR(50) NOT NULL, -- credit_card, paypal, etc.
    provider VARCHAR(50) NOT NULL, -- stripe, paypal
    provider_transaction_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, success, failed, refunded
    failure_reason TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Payment Methods (tokenized, no raw card data)
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Reference to User Service
    provider VARCHAR(50) NOT NULL,
    provider_token VARCHAR(255) NOT NULL, -- Tokenized by Stripe/PayPal
    method_type VARCHAR(50) NOT NULL, -- credit_card, paypal, etc.
    last_four VARCHAR(4),
    card_brand VARCHAR(50), -- visa, mastercard, etc.
    expiry_month INT,
    expiry_year INT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refunds Table
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    refund_transaction_id VARCHAR(100) UNIQUE NOT NULL,
    provider_refund_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Payment Audit Log
CREATE TABLE payment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
```

### Key Design Decisions
- **NO RAW CARD DATA**: Only store provider tokens (PCI compliance)
- **Idempotency Keys**: Prevent duplicate charges
- **Comprehensive Audit Log**: Track all payment activities
- **Provider Abstraction**: Support multiple payment providers
- **Refund Tracking**: Complete refund history

---

## 6. Inventory Service Database (PostgreSQL)

**Database Name**: `inventory_db`

### Schema

```sql
-- Inventory Table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL, -- Reference to Product Service
    variant_id UUID, -- Reference to Product Service variant
    warehouse_id UUID NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    quantity_reserved INT NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_total INT GENERATED ALWAYS AS (quantity_available + quantity_reserved) STORED,
    reorder_point INT DEFAULT 10,
    reorder_quantity INT DEFAULT 50,
    last_restocked_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, variant_id, warehouse_id)
);

-- Warehouses Table
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Reservations Table
CREATE TABLE inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    order_id UUID NOT NULL, -- Reference to Order Service
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(50) DEFAULT 'active', -- active, released, fulfilled
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP
);

-- Inventory Transactions (audit log)
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    transaction_type VARCHAR(50) NOT NULL, -- restock, sale, adjustment, return, reservation, release
    quantity_change INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_id UUID, -- Order ID, Purchase Order ID, etc.
    reason TEXT,
    created_by UUID, -- User or System
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Low Stock Alerts
CREATE TABLE low_stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id),
    alert_level VARCHAR(20), -- low, critical
    notified_at TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);
CREATE INDEX idx_inventory_quantity_available ON inventory(quantity_available);
CREATE INDEX idx_reservations_order_id ON inventory_reservations(order_id);
CREATE INDEX idx_reservations_status ON inventory_reservations(status);
CREATE INDEX idx_reservations_expires_at ON inventory_reservations(expires_at);
CREATE INDEX idx_transactions_inventory_id ON inventory_transactions(inventory_id);
CREATE INDEX idx_transactions_created_at ON inventory_transactions(created_at DESC);
```

### Key Design Decisions
- **Reservation System**: Reserve inventory during checkout, release on timeout
- **Multi-Warehouse Support**: Track inventory across multiple locations
- **Transaction Log**: Complete audit trail of all inventory changes
- **Generated Column**: `quantity_total` automatically calculated
- **Expiring Reservations**: Auto-release after timeout (15 minutes)
- **Reorder Points**: Automatic low stock alerts

---

## 7. Notification Service Database (PostgreSQL)

**Database Name**: `notification_db`

### Schema

```sql
-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Reference to User Service
    channel VARCHAR(20) NOT NULL, -- email, sms, push
    template_name VARCHAR(100) NOT NULL,
    recipient VARCHAR(255) NOT NULL, -- email address or phone number
    subject VARCHAR(255),
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, bounced
    provider VARCHAR(50), -- sendgrid, twilio, etc.
    provider_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    channel VARCHAR(20) NOT NULL,
    subject VARCHAR(255),
    template TEXT NOT NULL, -- Template with placeholders
    variables JSONB, -- Available variables
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Notification Preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- Reference to User Service
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT TRUE,
    marketing_enabled BOOLEAN DEFAULT FALSE,
    order_updates BOOLEAN DEFAULT TRUE,
    promotions BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notification_templates_name ON notification_templates(name);
```

### Key Design Decisions
- **Template-Based**: Reusable templates with variable substitution
- **Multi-Channel**: Support email, SMS, and push notifications
- **User Preferences**: Respect user notification preferences
- **Delivery Tracking**: Track sent/failed status and errors
- **Read Receipts**: Track when notifications are read

---

## 8. Search Service (Elasticsearch)

**Index Name**: `products`

### Mapping

```json
{
  "mappings": {
    "properties": {
      "product_id": { "type": "keyword" },
      "sku": { "type": "keyword" },
      "name": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete",
            "search_analyzer": "standard"
          }
        }
      },
      "description": { "type": "text" },
      "category": {
        "type": "text",
        "fields": { "keyword": { "type": "keyword" } }
      },
      "category_path": { "type": "keyword" },
      "price": { "type": "float" },
      "currency": { "type": "keyword" },
      "rating": { "type": "float" },
      "review_count": { "type": "integer" },
      "in_stock": { "type": "boolean" },
      "quantity_available": { "type": "integer" },
      "brand": {
        "type": "text",
        "fields": { "keyword": { "type": "keyword" } }
      },
      "tags": { "type": "keyword" },
      "attributes": { "type": "nested" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  },
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete": {
          "tokenizer": "autocomplete",
          "filter": ["lowercase"]
        }
      },
      "tokenizer": {
        "autocomplete": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 10,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  }
}
```

### Key Design Decisions
- **Multi-Field Mapping**: Support both full-text and exact matching
- **Autocomplete Analyzer**: Edge n-grams for search suggestions
- **Nested Attributes**: Support faceted search
- **Denormalized Data**: Include category, rating for fast queries
- **Boolean In-Stock**: Quick filtering for available products

---

## Database Scaling Strategies

### Read/Write Patterns

| Service | Pattern | Read:Write Ratio | Scaling Strategy |
|---------|---------|------------------|------------------|
| User | Read-Heavy | 80:20 | Read replicas |
| Product | Read-Heavy | 95:5 | Multiple read replicas + caching |
| Cart | Balanced | 60:40 | Redis Cluster |
| Order | Write-Heavy | 40:60 | Write-optimized, partitioning |
| Payment | Write-Heavy | 30:70 | Connection pooling, retry logic |
| Inventory | Write-Heavy | 45:55 | Optimistic locking, partitioning |
| Notification | Write-Heavy | 20:80 | Queue-based writes, archival |
| Search | Read-Heavy | 99:1 | Elasticsearch cluster |

### Backup and Disaster Recovery

- **PostgreSQL**: Daily full backups + continuous WAL archiving
- **Redis**: RDB snapshots + AOF persistence
- **Elasticsearch**: Snapshot to S3/Azure Blob
- **RPO**: 15 minutes
- **RTO**: 1 hour

### Data Retention Policies

- **User Data**: Indefinite (GDPR right to deletion)
- **Orders**: 7 years (legal compliance)
- **Payments**: 7 years (PCI compliance)
- **Cart Data**: 30 days
- **Notifications**: 90 days (archive after)
- **Inventory Transactions**: 2 years
- **Search Analytics**: 1 year
