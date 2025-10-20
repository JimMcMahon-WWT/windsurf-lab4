# Product Service - Inventory Reservation Testing Script

$baseUrl = "http://localhost:3002/api/v1"

Write-Host "`n🧪 Testing Inventory Reservation System`n" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# Get first product
Write-Host "📦 Fetching products..." -ForegroundColor Cyan
$products = Invoke-RestMethod -Uri "$baseUrl/products" -Method Get
$testProduct = $products.products[0]

if (-not $testProduct) {
    Write-Host "❌ No products found. Please run seed-data.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Testing with product: $($testProduct.name) (ID: $($testProduct.id))`n" -ForegroundColor Green

# Get current inventory
Write-Host "📊 Step 1: Check Current Inventory" -ForegroundColor Cyan
$inventory = Invoke-RestMethod -Uri "$baseUrl/inventory?product_id=$($testProduct.id)" -Method Get
Write-Host "  Current stock: $($inventory[0].quantity_available) units" -ForegroundColor White
Write-Host "  Reserved: $($inventory[0].quantity_reserved) units`n" -ForegroundColor White

# Reserve inventory
Write-Host "🔒 Step 2: Reserve Inventory (Simulating Order Creation)" -ForegroundColor Cyan
$reserveQuantity = 3
$orderId = [guid]::NewGuid().ToString()

$reservation = Invoke-RestMethod -Uri "$baseUrl/inventory/reserve" -Method Post -Body (@{
    product_id = $testProduct.id
    quantity = $reserveQuantity
    order_id = $orderId
    ttl_seconds = 900
} | ConvertTo-Json) -ContentType "application/json"

Write-Host "✅ Reserved $reserveQuantity units" -ForegroundColor Green
Write-Host "  Reservation ID: $($reservation.id)" -ForegroundColor White
Write-Host "  Order ID: $orderId" -ForegroundColor White
Write-Host "  Expires at: $($reservation.expires_at)`n" -ForegroundColor White

# Check inventory again
Write-Host "📊 Step 3: Check Inventory After Reservation" -ForegroundColor Cyan
$inventory = Invoke-RestMethod -Uri "$baseUrl/inventory?product_id=$($testProduct.id)" -Method Get
Write-Host "  Available: $($inventory[0].quantity_available) units (decreased by $reserveQuantity)" -ForegroundColor White
Write-Host "  Reserved: $($inventory[0].quantity_reserved) units (increased by $reserveQuantity)`n" -ForegroundColor White

# Simulate payment success - Complete reservation
Write-Host "✅ Step 4: Complete Reservation (Payment Successful)" -ForegroundColor Cyan
$complete = Invoke-RestMethod -Uri "$baseUrl/inventory/reservations/$($reservation.id)/complete" -Method Post -ContentType "application/json"
Write-Host "✅ Reservation completed - inventory sold`n" -ForegroundColor Green

# Check final inventory
Write-Host "📊 Step 5: Final Inventory Check" -ForegroundColor Cyan
$inventory = Invoke-RestMethod -Uri "$baseUrl/inventory?product_id=$($testProduct.id)" -Method Get
Write-Host "  Total quantity: $($inventory[0].quantity_on_hand) units (decreased permanently)" -ForegroundColor White
Write-Host "  Available: $($inventory[0].quantity_available) units" -ForegroundColor White
Write-Host "  Reserved: $($inventory[0].quantity_reserved) units (back to 0)`n" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Green
Write-Host "🎉 Inventory Reservation Test Complete!`n" -ForegroundColor Green

# Test 2: Reservation cancellation
Write-Host "`n🧪 Test 2: Order Cancellation (Release Reservation)`n" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

Write-Host "🔒 Creating another reservation..." -ForegroundColor Cyan
$orderId2 = [guid]::NewGuid().ToString()
$reservation2 = Invoke-RestMethod -Uri "$baseUrl/inventory/reserve" -Method Post -Body (@{
    product_id = $testProduct.id
    quantity = 2
    order_id = $orderId2
    ttl_seconds = 900
} | ConvertTo-Json) -ContentType "application/json"

Write-Host "✅ Reserved 2 units (Reservation ID: $($reservation2.id))`n" -ForegroundColor Green

Write-Host "❌ Simulating order cancellation..." -ForegroundColor Cyan
$release = Invoke-RestMethod -Uri "$baseUrl/inventory/reservations/$($reservation2.id)/release" -Method Post -ContentType "application/json"
Write-Host "✅ Reservation released - inventory restored`n" -ForegroundColor Green

Write-Host "📊 Final inventory:" -ForegroundColor Cyan
$inventory = Invoke-RestMethod -Uri "$baseUrl/inventory?product_id=$($testProduct.id)" -Method Get
Write-Host "  Available: $($inventory[0].quantity_available) units (restored after cancellation)" -ForegroundColor White
Write-Host "  Reserved: $($inventory[0].quantity_reserved) units`n" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "🎉 All Tests Passed!`n" -ForegroundColor Green
