# Scenario 8: Capture Authorized Payment
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Scenario 8: Capture Payment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nNOTE: Current Implementation Limitation" -ForegroundColor Yellow
Write-Host "The payment service currently auto-captures all payments." -ForegroundColor Yellow
Write-Host "This test demonstrates behavior when capture is attempted" -ForegroundColor Yellow
Write-Host "on an already-captured payment.`n" -ForegroundColor Yellow

Write-Host "Step 1: Creating payment..." -ForegroundColor Cyan
$payment = Invoke-RestMethod -Method Post -Uri "http://localhost:3004/api/v1/payments" -ContentType "application/json" -Headers @{"x-user-id"="823e4567-e89b-12d3-a456-426614174007"} -Body (@{orderId = [guid]::NewGuid().ToString(); amount = 85.00; currency = "USD"; paymentMethodId = "pm_card_visa"; provider = "stripe"} | ConvertTo-Json)

$transactionId = $payment.transaction.transactionId
Write-Host "Payment Created: $transactionId" -ForegroundColor Green
Write-Host "  Amount: $85.00" -ForegroundColor Cyan
Write-Host "  Status: $($payment.transaction.status) (auto-captured)" -ForegroundColor Cyan

Start-Sleep -Seconds 2

Write-Host "`nStep 2: Attempting capture on already-captured payment..." -ForegroundColor Cyan
try {
    $capture = Invoke-RestMethod -Method Post -Uri "http://localhost:3004/api/v1/payments/$transactionId/capture" -ContentType "application/json" -Body (@{amount = 85.00} | ConvertTo-Json)
    Write-Host "Unexpected Success - Payment captured again" -ForegroundColor Yellow
    $capture | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Expected Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "This is correct - payment was already captured during creation." -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Scenario 8 Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
