# Product Service

Advanced e-commerce product management service with real-time inventory, search, and recommendations.

## 🎯 Features

### Product Catalog

- ✅ Multi-level hierarchical categories
- ✅ Product variants (size, color, etc.)
- ✅ Multiple images per product with CDN support
- ✅ Tags and custom attributes
- ✅ SEO metadata (title, description, keywords)
- ✅ Featured products and bestsellers
- ✅ Brand management

### Inventory Management

- ✅ Real-time stock tracking
- ✅ Inventory reservations with TTL (prevent overselling)
- ✅ Complete audit trail
- ✅ Low stock alerts
- ✅ Multi-warehouse support (structure in place)
- ✅ Automatic reservation expiry

### Search & Discovery

- ✅ Elasticsearch full-text search
- ✅ Fuzzy matching and autocomplete
- ✅ Faceted search (categories, brands, prices, ratings)
- ✅ Multiple sort options (relevance, price, rating, date, popularity)
- ✅ Advanced filtering
- ✅ Search analytics

### Image Management

- ✅ AWS S3 storage
- ✅ 5 responsive sizes (thumbnail, small, medium, large, original)
- ✅ Sharp image optimization
- ✅ CDN support
- ✅ Automatic JPEG conversion

### Reviews & Ratings

- ✅ 5-star rating system
- ✅ Review text and titles
- ✅ Verified purchase badges
- ✅ Helpful voting
- ✅ Merchant responses
- ✅ Automatic average calculation

### Pricing & Promotions

- ✅ Base price and sale price
- ✅ Cost price tracking
- ✅ Discount system (structure in place)
- ✅ Price range filtering

### Event-Driven Architecture

- ✅ Kafka integration for inventory events
- ✅ Product change events
- ✅ Order integration support

## 📦 Technology Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (17 tables)
- **Cache:** Redis
- **Search:** Elasticsearch
- **Events:** Kafka
- **Storage:** AWS S3
- **Image Processing:** Sharp
- **Validation:** Joi
- **Logging:** Winston

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+
- Elasticsearch 8+ (optional)
- Kafka (optional)
- AWS Account (for S3 image storage)

### Installation

1. **Clone the repository**

```bash
cd services/product-service
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start infrastructure (PostgreSQL, Redis)**

```bash
# From root directory
docker-compose up -d ecommerce-postgres ecommerce-redis
```

5. **Create database**

```bash
docker exec -it ecommerce-postgres psql -U postgres -c "CREATE DATABASE product_db;"
```

6. **Run migrations**

```bash
npm run migrate
```

7. **Test setup**

```bash
npm run test:setup
```

8. **Start development server**

```bash
npm run dev
```

The service will be available at `http://localhost:3002`

## 📝 Environment Variables

See `.env.example` for all configuration options.

### Required Variables

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=product_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Optional Variables

```env
# Elasticsearch (for search)
ELASTICSEARCH_NODE=http://localhost:9200

# AWS S3 (for image storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=ecommerce-product-images

# Kafka (for events)
KAFKA_ENABLED=false
KAFKA_BROKERS=localhost:9092
```

## 📚 API Documentation

### Base URL

```
http://localhost:3002/api/v1
```

### Endpoints

#### Products

```
GET    /products              - List products with filters
GET    /products/search       - Search products
GET    /products/autocomplete - Autocomplete suggestions
GET    /products/featured     - Get featured products
GET    /products/bestsellers  - Get bestsellers
GET    /products/new-arrivals - Get new arrivals
GET    /products/:id          - Get product by ID
GET    /products/slug/:slug   - Get product by slug
POST   /products              - Create product (auth required)
PUT    /products/:id          - Update product (auth required)
DELETE /products/:id          - Delete product (auth required)
POST   /products/:id/images   - Upload images (auth required)
POST   /products/variants     - Create variant (auth required)
POST   /products/bulk         - Bulk operations (admin only)
```

#### Categories

```
GET    /categories            - List all categories
GET    /categories/tree       - Get category tree
GET    /categories/:id        - Get category by ID
GET    /categories/slug/:slug - Get category by slug
POST   /categories            - Create category (admin only)
PUT    /categories/:id        - Update category (admin only)
DELETE /categories/:id        - Delete category (admin only)
```

#### Inventory

```
GET    /inventory             - Get inventory
PUT    /inventory             - Update inventory (auth required)
POST   /inventory/reserve     - Reserve inventory
POST   /inventory/reservations/:id/complete - Complete reservation
POST   /inventory/reservations/:id/release  - Release reservation
GET    /inventory/low-stock   - Get low stock items
GET    /inventory/history     - Get inventory history
```

#### Reviews

```
GET    /reviews/products/:product_id  - Get product reviews
GET    /reviews/products/:product_id/distribution - Rating distribution
POST   /reviews                       - Create review (auth required)
PUT    /reviews/:id                   - Update review (auth required)
DELETE /reviews/:id                   - Delete review (auth required)
POST   /reviews/:id/helpful           - Mark helpful
POST   /reviews/:id/merchant-response - Add merchant response (merchant only)
```

### Authentication

Protected endpoints require a Bearer token:

```
Authorization: Bearer <token>
```

## 🗄️ Database Schema

### Core Tables (17 total)

1. **categories** - Hierarchical product categories
2. **products** - Main product catalog
3. **product_variants** - Product variations
4. **inventory** - Real-time stock tracking
5. **product_images** - Product images
6. **tags** - Product tags
7. **product_tags** - Product-tag relationships
8. **product_reviews** - Customer reviews
9. **product_discounts** - Promotions
10. **product_discount_mapping** - Discount applicability
11. **inventory_reservations** - Order reservations
12. **inventory_history** - Audit trail
13. **product_views** - Analytics
14. **product_recommendations** - AI suggestions
15. **search_queries** - Search analytics
16. **product_attributes** - Filterable attributes

## 🔍 Search Examples

### Basic Search

```bash
GET /api/v1/products/search?query=laptop
```

### Search with Filters

```bash
GET /api/v1/products/search?query=laptop&min_price=500&max_price=2000&brand=Apple&sort_by=price_asc
```

### Faceted Search

```bash
GET /api/v1/products/search?category_id=uuid&in_stock=true&rating=4
```

## 📸 Image Upload Example

```bash
curl -X POST http://localhost:3002/api/v1/products/:id/images \
  -H "Authorization: Bearer <token>" \
  -F "images=@product1.jpg" \
  -F "images=@product2.jpg"
```

## 🔄 Inventory Reservation Flow

1. **Reserve Inventory** (when order is created)

```bash
POST /api/v1/inventory/reserve
{
  "product_id": "uuid",
  "quantity": 2,
  "order_id": "order-uuid",
  "ttl_seconds": 900
}
```

2. **Complete Reservation** (when payment succeeds)

```bash
POST /api/v1/inventory/reservations/:id/complete
```

3. **Release Reservation** (when order is cancelled)

```bash
POST /api/v1/inventory/reservations/:id/release
```

Reservations automatically expire after TTL (default 15 minutes).

## 📊 Event Publishing

The service publishes events to Kafka:

### Inventory Events

- `inventory.updated` - Stock quantity changed
- `inventory.low_stock` - Stock below threshold
- `inventory.reserved` - Inventory reserved for order
- `inventory.reservation_completed` - Reservation converted to sale
- `inventory.reservation_released` - Reservation cancelled
- `inventory.reservations_expired` - Reservations auto-expired

### Product Events

- `product.created` - New product added
- `product.updated` - Product modified
- `product.deleted` - Product removed

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Test with coverage
npm run test:coverage

# Test setup/connections
npm run test:setup
```

## 🔧 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run migrate      # Run database migrations
npm run test:setup   # Test all connections
npm run lint         # Lint code
npm run lint:fix     # Fix lint issues
npm run type-check   # TypeScript type checking
```

## 🏗️ Project Structure

```
product-service/
├── src/
│   ├── config/           # Database, Redis, Elasticsearch, Kafka
│   ├── controllers/      # HTTP request handlers
│   ├── middleware/       # Auth, validation, error handling
│   ├── repositories/     # Database operations
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities (logger, etc.)
│   ├── validators/       # Joi schemas
│   ├── app.ts            # Express app configuration
│   └── server.ts         # Server entry point
├── migrations/           # SQL migration files
├── scripts/              # Utility scripts
├── tests/                # Test files
├── logs/                 # Log files (gitignored)
├── .env.example          # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## 🔐 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation (Joi)
- SQL injection prevention (parameterized queries)
- File upload validation
- Authentication middleware
- Role-based authorization

## 📈 Performance Features

- Redis caching (1 hour TTL)
- Database connection pooling
- Indexed queries
- Generated columns for availability
- Elasticsearch for fast search
- CDN for image delivery
- Distributed locking for inventory

## 🚨 Monitoring & Logging

- Winston logging (file + console)
- Structured JSON logs
- Error tracking
- Request logging (Morgan)
- Database query logging
- Event publishing tracking

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
docker exec -it ecommerce-postgres psql -U postgres -d product_db
```

### Redis Connection Failed

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec -it ecommerce-redis redis-cli ping
```

### Migrations Failed

```bash
# Drop and recreate database
docker exec -it ecommerce-postgres psql -U postgres -c "DROP DATABASE product_db;"
docker exec -it ecommerce-postgres psql -U postgres -c "CREATE DATABASE product_db;"

# Run migrations again
npm run migrate
```

## 📄 License

MIT

## 👥 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for modern e-commerce**
