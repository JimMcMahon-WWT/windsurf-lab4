# Product Service - Testing Guide

Quick reference for testing the Product Service API.

## 🚀 Quick Start

### 1. Start the Service

```powershell
npm run dev
```

### 2. Seed Test Data

```powershell
.\scripts\seed-data.ps1
```

### 3. Test Inventory Reservations

```powershell
.\scripts\test-inventory.ps1
```

---

## 📋 Manual API Testing

### Health Check

```powershell
curl http://localhost:3002/api/v1/health
```

### Products

#### Get All Products

```powershell
curl http://localhost:3002/api/v1/products
```

#### Get Featured Products

```powershell
curl http://localhost:3002/api/v1/products/featured
```

#### Get Product by ID

```powershell
curl http://localhost:3002/api/v1/products/{product_id}
```

#### Get Product by Slug

```powershell
curl http://localhost:3002/api/v1/products/slug/macbook-pro-14
```

#### Search Products

```powershell
# Basic search
curl "http://localhost:3002/api/v1/products/search?query=laptop"

# With filters
curl "http://localhost:3002/api/v1/products/search?query=phone&min_price=500&max_price=1000&brand=Apple"

# With sorting
curl "http://localhost:3002/api/v1/products/search?query=laptop&sort_by=price_asc"
```

### Categories

#### Get All Categories

```powershell
curl http://localhost:3002/api/v1/categories
```

#### Get Category Tree (Hierarchical)

```powershell
curl http://localhost:3002/api/v1/categories/tree
```

#### Get Category by Slug

```powershell
curl http://localhost:3002/api/v1/categories/slug/electronics
```

### Inventory

#### Get Product Inventory

```powershell
curl "http://localhost:3002/api/v1/inventory?product_id={product_id}"
```

#### Reserve Inventory (Simulated Order)

```powershell
$body = @{
    product_id = "your-product-id"
    quantity = 2
    order_id = "order-123"
    ttl_seconds = 900
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3002/api/v1/inventory/reserve" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

#### Complete Reservation (Payment Success)

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/v1/inventory/reservations/{reservation_id}/complete" `
    -Method Post `
    -ContentType "application/json"
```

#### Release Reservation (Order Cancelled)

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/v1/inventory/reservations/{reservation_id}/release" `
    -Method Post `
    -ContentType "application/json"
```

#### Get Low Stock Items

```powershell
curl http://localhost:3002/api/v1/inventory/low-stock
```

---

## 🧪 Testing Scenarios

### Scenario 1: Complete Purchase Flow

1. **Browse Products**

```powershell
curl http://localhost:3002/api/v1/products/featured
```

2. **View Product Details**

```powershell
curl http://localhost:3002/api/v1/products/{product_id}
```

3. **Check Inventory**

```powershell
curl "http://localhost:3002/api/v1/inventory?product_id={product_id}"
```

4. **Reserve Inventory (Add to Cart)**

```powershell
$reservation = Invoke-RestMethod -Uri "http://localhost:3002/api/v1/inventory/reserve" `
    -Method Post `
    -Body (@{
        product_id = "{product_id}"
        quantity = 1
        order_id = "order-$(Get-Random)"
        ttl_seconds = 900
    } | ConvertTo-Json) `
    -ContentType "application/json"
```

5. **Complete Purchase**

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/v1/inventory/reservations/$($reservation.id)/complete" `
    -Method Post `
    -ContentType "application/json"
```

### Scenario 2: Abandoned Cart (Auto-Expiry)

Reservations automatically expire after TTL (default 15 minutes). The service has a cron job that runs every 5 minutes to release expired reservations.

### Scenario 3: Search & Filter

```powershell
# Find laptops under $2000
curl "http://localhost:3002/api/v1/products/search?query=laptop&max_price=2000"

# Find Apple products on sale
curl "http://localhost:3002/api/v1/products/search?brand=Apple&on_sale=true"

# Find products by category
curl "http://localhost:3002/api/v1/products?category_id={category_id}"
```

---

## 📊 Expected Results

### After Seeding Data

- **5 categories** (Electronics, Laptops, Smartphones, Clothing, Men's Clothing)
- **5 products** (MacBook Pro, Dell XPS, iPhone, Samsung, T-Shirt)
- **Inventory** for all products

### Featured Products

Should return products with `is_featured: true`:

- MacBook Pro 14
- Dell XPS 15
- iPhone 15 Pro

### Products on Sale

Should return products with `sale_price < price`:

- Dell XPS 15 ($1,799 → $1,599)
- Samsung Galaxy S24 ($899 → $799)

---

## 🔍 Troubleshooting

### No Products Returned

- Run the seed script: `.\scripts\seed-data.ps1`

### Inventory Reservation Fails

- Check that product has available inventory
- Verify product_id is correct UUID format

### Search Returns Nothing

- Elasticsearch is optional - basic search uses database
- For advanced search, start Elasticsearch: `docker-compose up -d elasticsearch`

---

## 📝 Next Steps

1. **Create Reviews**
   - Requires authentication (integrate with User Service)

2. **Upload Product Images**
   - Requires AWS S3 credentials in .env
   - Or use placeholder URLs

3. **Enable Elasticsearch**
   - Start: `docker-compose up -d elasticsearch`
   - Restart service to auto-create index
   - Enjoy fuzzy search, autocomplete, facets

4. **Enable Kafka Events**
   - Start: `docker-compose up -d kafka zookeeper`
   - Set `KAFKA_ENABLED=true` in .env
   - Monitor inventory events

---

## 🎯 Success Criteria

- ✅ Health check returns 200
- ✅ Can list products
- ✅ Can search products
- ✅ Category tree shows hierarchy
- ✅ Can reserve inventory
- ✅ Reservations can be completed
- ✅ Reservations can be released
- ✅ Low stock alerts work

---

**Happy Testing! 🚀**
