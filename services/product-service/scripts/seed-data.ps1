# Product Service - Test Data Seeding Script
# Run this from the product-service directory

$baseUrl = "http://localhost:3002/api/v1"

Write-Host "`nSeeding Product Service with Test Data`n" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

# Function to make API calls
function Invoke-ApiPost {
    param($url, $body)
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Body ($body | ConvertTo-Json -Depth 10) -ContentType "application/json" -ErrorAction Stop
        return $response
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
        return $null
    }
}

# 1. Create Categories
Write-Host "Creating Categories..." -ForegroundColor Cyan

$electronics = Invoke-ApiPost "$baseUrl/categories" @{
    name = "Electronics"
    slug = "electronics"
    description = "Electronic devices and accessories"
    is_active = $true
}
Write-Host "✅ Created: Electronics (ID: $($electronics.id))" -ForegroundColor Green

$laptops = Invoke-ApiPost "$baseUrl/categories" @{
    name = "Laptops"
    slug = "laptops"
    description = "Portable computers"
    parent_id = $electronics.id
    is_active = $true
}
Write-Host "✅ Created: Laptops (ID: $($laptops.id))" -ForegroundColor Green

$smartphones = Invoke-ApiPost "$baseUrl/categories" @{
    name = "Smartphones"
    slug = "smartphones"
    description = "Mobile phones"
    parent_id = $electronics.id
    is_active = $true
}
Write-Host "✅ Created: Smartphones (ID: $($smartphones.id))" -ForegroundColor Green

$clothing = Invoke-ApiPost "$baseUrl/categories" @{
    name = "Clothing"
    slug = "clothing"
    description = "Apparel and fashion"
    is_active = $true
}
Write-Host "✅ Created: Clothing (ID: $($clothing.id))" -ForegroundColor Green

$mensClothing = Invoke-ApiPost "$baseUrl/categories" @{
    name = "Men's Clothing"
    slug = "mens-clothing"
    description = "Clothing for men"
    parent_id = $clothing.id
    is_active = $true
}
Write-Host "✅ Created: Mens Clothing (ID: $($mensClothing.id))" -ForegroundColor Green

# 2. Create Products
Write-Host "`nCreating Products..." -ForegroundColor Cyan

$laptop1 = Invoke-ApiPost "$baseUrl/products" @{
    name = "MacBook Pro 14"
    slug = "macbook-pro-14"
    description = "Apple MacBook Pro 14-inch with M3 chip"
    long_description = "The new MacBook Pro 14-inch features the powerful M3 chip, stunning Liquid Retina XDR display, and all-day battery life. Perfect for professionals and creators."
    category_id = $laptops.id
    brand = "Apple"
    sku = "MBP14-M3-001"
    base_price = 1999.00
    cost_price = 1500.00
    status = "active"
    is_featured = $true
    is_available = $true
    meta_title = "MacBook Pro 14 inch - M3 Chip"
    meta_description = "Buy the new MacBook Pro 14 with M3 chip"
    tags = @("laptop", "apple", "macbook", "professional")
}
Write-Host "✅ Created: MacBook Pro 14 (ID: $($laptop1.id))" -ForegroundColor Green

$laptop2 = Invoke-ApiPost "$baseUrl/products" @{
    name = "Dell XPS 15"
    slug = "dell-xps-15"
    description = "Dell XPS 15 with Intel Core i7"
    long_description = "Premium Windows laptop with stunning InfinityEdge display, powerful performance, and elegant design."
    category_id = $laptops.id
    brand = "Dell"
    sku = "XPS15-I7-001"
    base_price = 1799.00
    sale_price = 1699.00
    cost_price = 1200.00
    status = "active"
    is_featured = $true
    is_available = $true
    tags = @("laptop", "dell", "windows", "business")
}
Write-Host "✅ Created: Dell XPS 15 (ID: $($laptop2.id))" -ForegroundColor Green

$phone1 = Invoke-ApiPost "$baseUrl/products" @{
    name = "iPhone 15 Pro"
    slug = "iphone-15-pro"
    description = "Apple iPhone 15 Pro with titanium design"
    long_description = "The iPhone 15 Pro features a titanium design, A17 Pro chip, and advanced camera system."
    category_id = $smartphones.id
    brand = "Apple"
    sku = "IP15P-128-001"
    base_price = 999.00
    cost_price = 700.00
    status = "active"
    is_featured = $true
    is_available = $true
    tags = @("smartphone", "apple", "iphone", "5g")
}
Write-Host "✅ Created: iPhone 15 Pro (ID: $($phone1.id))" -ForegroundColor Green

$phone2 = Invoke-ApiPost "$baseUrl/products" @{
    name = "Samsung Galaxy S24"
    slug = "samsung-galaxy-s24"
    description = "Samsung Galaxy S24 with AI features"
    long_description = "Experience the power of Galaxy AI with the S24. Advanced camera, stunning display, and all-day battery."
    category_id = $smartphones.id
    brand = "Samsung"
    sku = "GS24-256-001"
    base_price = 899.00
    sale_price = 849.00
    cost_price = 600.00
    status = "active"
    is_featured = $false
    is_available = $true
    tags = @("smartphone", "samsung", "android", "5g")
}
Write-Host "✅ Created: Samsung Galaxy S24 (ID: $($phone2.id))" -ForegroundColor Green

$shirt = Invoke-ApiPost "$baseUrl/products" @{
    name = "Classic White T-Shirt"
    slug = "classic-white-tshirt"
    description = "100% cotton classic white t-shirt"
    long_description = "Comfortable, breathable, and timeless. Made from premium cotton."
    category_id = $mensClothing.id
    brand = "BasicWear"
    sku = "TSHIRT-WHITE-M"
    base_price = 29.99
    cost_price = 10.00
    status = "active"
    is_available = $true
    tags = @("clothing", "tshirt", "cotton", "casual")
}
Write-Host "✅ Created: Classic White T-Shirt (ID: $($shirt.id))" -ForegroundColor Green

# 3. Set Initial Inventory
Write-Host "`nSetting Initial Inventory..." -ForegroundColor Cyan

function Set-Inventory {
    param($productId, $quantity, $productName)
    try {
        $body = @{
            product_id = $productId
            quantity = $quantity
            change_type = "restock"
            notes = "Initial stock"
        }
        $json = $body | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$baseUrl/inventory" -Method Put -Body $json -ContentType "application/json" -ErrorAction Stop
        Write-Host "✅ Set inventory for $productName : $quantity units" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to set inventory for $productName" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Yellow
    }
}

Set-Inventory $laptop1.id 15 "MacBook Pro 14"
Set-Inventory $laptop2.id 20 "Dell XPS 15"
Set-Inventory $phone1.id 50 "iPhone 15 Pro"
Set-Inventory $phone2.id 40 "Samsung Galaxy S24"
Set-Inventory $shirt.id 100 "Classic White T-Shirt"

# 4. Summary
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "Test Data Seeding Complete!`n" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  - Categories: 5" -ForegroundColor White
Write-Host "  - Products: 5" -ForegroundColor White
Write-Host "  - Inventory records: 5" -ForegroundColor White
Write-Host "`nTest the API:" -ForegroundColor Cyan
Write-Host '  curl http://localhost:3002/api/v1/products' -ForegroundColor Yellow
Write-Host '  curl http://localhost:3002/api/v1/categories/tree' -ForegroundColor Yellow
Write-Host '  curl http://localhost:3002/api/v1/products/featured' -ForegroundColor Yellow
Write-Host ""
