# Payment Service - All Refund Tests
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Payment Service - Refund Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[Test 1/3] Customer Requested Refund" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor DarkGray
$payment1 = Invoke-RestMethod -Method Post -Uri "http://localhost:3004/api/v1/payments" -ContentType "application/json" -Headers @{"x-user-id"="723e4567-e89b-12d3-a456-426614174006"} -Body (@{orderId = [guid]::NewGuid().ToString(); amount = 75.00; currency = "USD"; paymentMethodId = "pm_card_visa"; provider = "stripe"} | ConvertTo-Json)
$transactionId1 = $payment1.transaction.transactionId
Write-Host "Payment Created: $transactionId1 (Status: $($payment1.transaction.status))" -ForegroundColor Green
Start-Sleep -Seconds 3
try {
    $refund1 = Invoke-RestMethod -Method Post -Uri "http://localhost:3004/api/v1/payments/$transactionId1/refund" -ContentType "application/json" -Headers @{"x-user-id"="723e4567-e89b-12d3-a456-426614174006"} -Body (@{amount = 30.00; reason = "requested_by_customer"} | ConvertTo-Json)
    Write-Host "Refund Successful! Refund ID: $($refund1.refund.id) | Refunded: `$30.00 of `$75.00" -ForegroundColor Green
} catch {
    Write-Host "Refund Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n[Test 2/3] Duplicate Charge Refund" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor DarkGray
$payment2 = Invoke-RestMethod -Method Post -Uri "http://localhost:3004/api/v1/payments" -ContentType "application/json" -Headers @{"x-user-id"="823e4567-e89b-12d3-a456-426614174007"} -Body (@{orderId = [guid]::NewGuid().ToString(); amount = 85.00; currency = "USD"; paymentMethodId = "pm_card_visa"; provider = "stripe"} | ConvertTo-Json)
$transactionId2 = $payment2.transaction.transactionId
Write-Host "Payment Created: $transactionId2 (Status: $($payment2.transaction.status))" -ForegroundColor Green
Write-Host "Waiting for payment to complete..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    $check2 = Invoke-RestMethod -Method Get -Uri "http://localhost:3004/api/v1/payments/$transactionId2"
    if ($check2.transaction.status -eq "succeeded") { Write-Host "Payment succeeded after $i seconds" -ForegroundColor Green; break }
    Write-Host "  Status: $($check2.transaction.status) (attempt $i/30)" -ForegroundColor Yellow
}
if ($check2.transaction.status -eq "succeeded") {
    try {
        $refund2 = Invoke-RestMethod -Method Post -Uri "http://localhost:3004/api/v1/payments/$transactionId2/refund" -ContentType "application/json" -Headers @{"x-user-id"="823e4567-e89b-12d3-a456-426614174007"} -Body (@{amount = 85.00; reason = "duplicate"} | ConvertTo-Json)
        Write-Host "Refund Successful! Refund ID: $($refund2.refund.id) | Refunded: `$85.00 (Full)" -ForegroundColor Green
    } catch {
        Write-Host "Refund Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Cannot refund - payment status is: $($check2.transaction.status)" -ForegroundColor Red
}

Write-Host "`n[Test 3/3] Fraudulent Transaction Refund" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor DarkGray
$payment3 = Invoke-RestMethod -Method Post -Uri "http://localhost:3004/api/v1/payments" -ContentType "application/json" -Headers @{"x-user-id"="923e4567-e89b-12d3-a456-426614174008"} -Body (@{orderId = [guid]::NewGuid().ToString(); amount = 95.00; currency = "USD"; paymentMethodId = "pm_card_visa"; provider = "stripe"} | ConvertTo-Json)
$transactionId3 = $payment3.transaction.transactionId
Write-Host "Payment Created: $transactionId3 (Status: $($payment3.transaction.status))" -ForegroundColor Green
Write-Host "Waiting for payment to complete..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    $check3 = Invoke-RestMethod -Method Get -Uri "http://localhost:3004/api/v1/payments/$transactionId3"
    if ($check3.transaction.status -eq "succeeded") { Write-Host "Payment succeeded after $i seconds" -ForegroundColor Green; break }
    Write-Host "  Status: $($check3.transaction.status) (attempt $i/30)" -ForegroundColor Yellow
}
if ($check3.transaction.status -eq "succeeded") {
    try {
        $refund3 = Invoke-RestMethod -Method Post -Uri "http://localhost:3004/api/v1/payments/$transactionId3/refund" -ContentType "application/json" -Headers @{"x-user-id"="923e4567-e89b-12d3-a456-426614174008"} -Body (@{amount = 95.00; reason = "fraudulent"} | ConvertTo-Json)
        Write-Host "Refund Successful! Refund ID: $($refund3.refund.id) | Refunded: `$95.00 (Full)" -ForegroundColor Green
    } catch {
        Write-Host "Refund Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Cannot refund - payment status is: $($check3.transaction.status)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   All Tests Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
