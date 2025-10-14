# Service Boundary Definitions

## 1. User Service

**Port**: 3001  
**Responsibility**: User authentication, authorization, profile management

### Boundaries
- User registration and login
- JWT token generation and validation
- User profile CRUD operations
- Role-based access control (Customer, Admin)
- Password reset and email verification
- Multi-factor authentication (optional)

### API Endpoints
```
POST   /api/users/register
POST   /api/users/login
POST   /api/users/logout
GET    /api/users/profile
PUT    /api/users/profile
POST   /api/users/password/reset
POST   /api/users/verify-email
GET    /api/users/:id (Admin only)
```

### Events Published
- `user.registered`
- `user.updated`
- `user.deleted`
- `user.email.verified`

### Dependencies
- None (independent service)

---

## 2. Product Service

**Port**: 3002  
**Responsibility**: Product catalog management

### Boundaries
- Product CRUD operations
- Category management
- Product search and filtering
- Product pricing (base prices)
- Multi-currency price conversion
- Product images and metadata
- Product reviews and ratings

### API Endpoints
```
GET    /api/products
GET    /api/products/:id
POST   /api/products (Admin)
PUT    /api/products/:id (Admin)
DELETE /api/products/:id (Admin)
GET    /api/products/categories
POST   /api/products/:id/reviews
GET    /api/products/:id/reviews
GET    /api/products/search?q=...
```

### Events Published
- `product.created`
- `product.updated`
- `product.deleted`
- `product.price.changed`
- `product.review.added`

### Events Consumed
- `inventory.updated` (to reflect availability)

### Dependencies
- Search Service (async via events)

---

## 3. Cart Service

**Port**: 3003  
**Responsibility**: Shopping cart management

### Boundaries
- Add/remove items from cart
- Update item quantities
- Cart persistence (session-based or user-based)
- Cart expiration handling
- Apply discount codes
- Cart total calculation with currency conversion

### API Endpoints
```
GET    /api/cart
POST   /api/cart/items
PUT    /api/cart/items/:itemId
DELETE /api/cart/items/:itemId
POST   /api/cart/apply-coupon
DELETE /api/cart/clear
GET    /api/cart/total
```

### Events Published
- `cart.item.added`
- `cart.item.removed`
- `cart.abandoned` (after 24 hours)

### Events Consumed
- `product.price.changed`
- `product.deleted`
- `inventory.out.of.stock`

### Dependencies
- Product Service (sync REST calls for product info)
- Inventory Service (sync REST calls for availability)

---

## 4. Order Service

**Port**: 3004  
**Responsibility**: Order lifecycle management

### Boundaries
- Create orders from cart
- Order status tracking
- Order history
- Order cancellation
- Return/refund initiation
- Order validation
- Idempotency handling

### API Endpoints
```
POST   /api/orders
GET    /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id/cancel
GET    /api/orders/:id/status
POST   /api/orders/:id/return
GET    /api/admin/orders (Admin)
PUT    /api/admin/orders/:id/status (Admin)
```

### Events Published
- `order.created`
- `order.confirmed`
- `order.cancelled`
- `order.completed`
- `order.failed`
- `order.returned`

### Events Consumed
- `payment.success`
- `payment.failed`
- `inventory.reserved`
- `inventory.reservation.failed`

### Dependencies
- Cart Service (sync)
- Inventory Service (sync + events)
- Payment Service (events)

---

## 5. Payment Service

**Port**: 3005  
**Responsibility**: Payment processing and transaction management

### Boundaries
- Process payments via external gateways
- Multi-currency payment support
- Payment method management
- Transaction history
- Refund processing
- Payment retry logic
- PCI compliance
- Fraud detection integration

### API Endpoints
```
POST   /api/payments/process
GET    /api/payments/:id
POST   /api/payments/:id/refund
GET    /api/payments/methods
POST   /api/payments/methods (Add payment method)
DELETE /api/payments/methods/:id
GET    /api/payments/transactions
```

### Events Published
- `payment.initiated`
- `payment.success`
- `payment.failed`
- `payment.refunded`

### Events Consumed
- `order.created`
- `order.cancelled`

### Dependencies
- External Payment Gateway (Stripe, PayPal)

---

## 6. Inventory Service

**Port**: 3006  
**Responsibility**: Real-time inventory management

### Boundaries
- Track stock levels
- Reserve inventory for orders
- Release reservations on cancellation
- Low stock alerts
- Inventory updates from warehouse
- Multi-warehouse support
- Stock reconciliation

### API Endpoints
```
GET    /api/inventory/:productId
PUT    /api/inventory/:productId (Admin - manual adjustment)
POST   /api/inventory/reserve
POST   /api/inventory/release
GET    /api/inventory/low-stock (Admin)
POST   /api/inventory/bulk-update (Admin)
```

### Events Published
- `inventory.reserved`
- `inventory.reservation.failed`
- `inventory.released`
- `inventory.updated`
- `inventory.low.stock`
- `inventory.out.of.stock`

### Events Consumed
- `order.created` (reserve inventory)
- `order.cancelled` (release inventory)
- `order.completed` (finalize inventory)
- `payment.failed` (release inventory)

### Dependencies
- None (event-driven coordination)

---

## 7. Notification Service

**Port**: 3007  
**Responsibility**: Multi-channel notification delivery

### Boundaries
- Email notifications
- SMS notifications (optional)
- Push notifications (optional)
- Notification templates
- Notification history
- Delivery status tracking
- User notification preferences

### API Endpoints
```
POST   /api/notifications/send
GET    /api/notifications/history
PUT    /api/notifications/preferences
GET    /api/notifications/preferences
```

### Events Published
- `notification.sent`
- `notification.failed`

### Events Consumed
- `user.registered` (welcome email)
- `order.created` (order confirmation)
- `order.completed` (shipment notification)
- `payment.success` (payment receipt)
- `payment.failed` (payment failure alert)
- `inventory.low.stock` (admin alert)
- `user.password.reset` (reset email)

### Dependencies
- External Email Service (SendGrid, AWS SES)
- External SMS Service (Twilio)

---

## 8. Search Service

**Port**: 3008  
**Responsibility**: Fast product search and recommendations

### Boundaries
- Full-text product search
- Faceted search (filters)
- Search suggestions/autocomplete
- Search analytics
- Product recommendations
- Search result ranking

### API Endpoints
```
GET    /api/search?q=...&filters=...
GET    /api/search/suggestions?q=...
GET    /api/search/popular
POST   /api/search/reindex (Admin)
```

### Events Published
- `search.query.executed` (analytics)

### Events Consumed
- `product.created`
- `product.updated`
- `product.deleted`
- `inventory.updated`

### Dependencies
- Elasticsearch for indexing

---

## Service Interaction Matrix

| Service | User | Product | Cart | Order | Payment | Inventory | Notification | Search |
|---------|------|---------|------|-------|---------|-----------|--------------|--------|
| **User** | - | | | | | | ✓ Event | |
| **Product** | | - | | | | ✓ Event | | ✓ Event |
| **Cart** | | ✓ REST | - | ✓ REST | | ✓ REST | | ✓ REST |
| **Order** | | | ✓ REST | - | ✓ Event | ✓ REST + Event | ✓ Event | |
| **Payment** | | | | ✓ Event | - | | ✓ Event | |
| **Inventory** | | | | ✓ Event | | - | ✓ Event | ✓ Event |
| **Notification** | | | | | | | - | |
| **Search** | | ✓ Event | | | | ✓ Event | | - |

**Legend:**
- ✓ REST: Synchronous REST API call
- ✓ Event: Asynchronous event-driven communication
- Empty: No direct interaction

## Service Sizing Guidelines

### Resource Allocation (per replica)

| Service | CPU | Memory | Storage | Min Replicas | Max Replicas |
|---------|-----|--------|---------|--------------|--------------|
| User | 0.5 | 512MB | - | 2 | 5 |
| Product | 0.5 | 512MB | - | 3 | 10 |
| Cart | 0.25 | 256MB | - | 2 | 8 |
| Order | 1.0 | 1GB | - | 2 | 5 |
| Payment | 1.0 | 1GB | - | 2 | 4 |
| Inventory | 0.5 | 512MB | - | 2 | 5 |
| Notification | 0.25 | 256MB | - | 2 | 5 |
| Search | 1.0 | 2GB | 10GB | 2 | 5 |

## Security Boundaries

### Authentication Flow
1. Client authenticates with User Service
2. User Service issues JWT token
3. API Gateway validates JWT for all requests
4. Services trust API Gateway (internal network)

### Service-to-Service Authentication
- mTLS for internal communication
- Service mesh (Istio) for automatic encryption
- API keys for external service calls

### Data Security
- PCI compliance for Payment Service
- PII encryption in User Service
- Database encryption at rest
- Secrets management (Vault, AWS Secrets Manager)
