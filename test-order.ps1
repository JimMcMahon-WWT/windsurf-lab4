# Get product
$products = Invoke-RestMethod -Method Get -Uri "http://localhost:3002/api/v1/products/search?query=macbook"
$product = $products.products[0]

Write-Host "Found product: $($product.name)" -ForegroundColor Cyan

# Create order
$orderBody = @{
    items = @(
        @{
            productId = $product.id
            productName = $product.name
            productSku = $product.sku
            quantity = 1
            unitPrice = [decimal]$product.base_price
            totalPrice = [decimal]$product.base_price
        }
    )
    shippingAddress = @{
        firstName = "John"
        lastName = "Doe"
        addressLine1 = "123 Main St"
        city = "New York"
        state = "NY"
        postalCode = "10001"
        country = "US"
    }
    billingAddress = @{
        firstName = "John"
        lastName = "Doe"
        addressLine1 = "123 Main St"
        city = "New York"
        state = "NY"
        postalCode = "10001"
        country = "US"
    }
    paymentMethod = "card"
} | ConvertTo-Json -Depth 10

$newOrder = Invoke-RestMethod -Method Post -Uri "http://localhost:3003/api/v1/orders" `
    -ContentType "application/json" `
    -Headers @{"x-user-id"="123e4567-e89b-12d3-a456-426614174000"} `
    -Body $orderBody

Write-Host "`n✅ Order Created Successfully!" -ForegroundColor Green
Write-Host "   Order Number: $($newOrder.orderNumber)" -ForegroundColor Cyan
Write-Host "   Order ID: $($newOrder.orderId)" -ForegroundColor Cyan
Write-Host "   Status: $($newOrder.status)" -ForegroundColor Yellow
Write-Host "   Payment Status: $($newOrder.paymentStatus)" -ForegroundColor Yellow
Write-Host "   Total: `$$($newOrder.pricing.totalAmount)" -ForegroundColor Green
