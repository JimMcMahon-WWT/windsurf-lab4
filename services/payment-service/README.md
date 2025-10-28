# Payment Service

Secure, PCI-compliant payment processing service with support for multiple payment providers (Stripe, PayPal), fraud detection, and comprehensive audit logging.

## Features

### Payment Processing

- **Multiple Providers**: Stripe and PayPal integration
- **Payment Methods**: Credit cards, digital wallets, PayPal
- **Payment Flows**: Authorization, capture, refund
- **Subscriptions**: Recurring payments support
- **3D Secure**: Enhanced security for high-value transactions

### Security & Compliance

- **PCI DSS Compliance**:
  - Never stores raw card data
  - Tokenization for payment methods
  - End-to-end encryption
  - Secure key management
- **Audit Logging**: Complete transaction history
- **Data Masking**: Sensitive data sanitization in logs
- **Rate Limiting**: Protection against abuse
- **Webhook Verification**: Signature validation

### Fraud Detection

- **Velocity Checks**: Multiple transactions detection
- **Amount Thresholds**: High-value transaction flags
- **Geolocation**: Location-based risk assessment
- **Device Fingerprinting**: New device detection
- **Risk Scoring**: Automatic fraud scoring (0-100)
- **3DS Enforcement**: Require 3D Secure for risky transactions

### Operational Features

- **Idempotency**: Prevent duplicate charges
- **Reconciliation**: Automated payment reconciliation
- **Webhook Processing**: Real-time payment updates
- **Retry Logic**: Automatic retry for transient failures
- **Dead Letter Queue**: Failed transaction handling

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Payment Service                          │
├─────────────────────────────────────────────────────────────┤
│  Controllers                                                 │
│  ├─ Payment Controller (process, capture, refund)           │
│  └─ Webhook Controller (Stripe, PayPal)                     │
├─────────────────────────────────────────────────────────────┤
│  Services                                                    │
│  ├─ Payment Service (transaction management)                │
│  └─ Fraud Detection Service (risk assessment)               │
├─────────────────────────────────────────────────────────────┤
│  Providers                                                   │
│  ├─ Stripe Provider (Stripe API integration)                │
│  └─ PayPal Provider (PayPal API integration)                │
├─────────────────────────────────────────────────────────────┤
│  Security                                                    │
│  ├─ Encryption Utils (AES-256-GCM)                          │
│  ├─ Audit Logging (PCI compliance)                          │
│  └─ Data Sanitization (mask sensitive data)                 │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

- `payment_providers` - Payment provider configurations
- `payment_methods` - Tokenized payment methods (PCI compliant)
- `payment_transactions` - All payment transactions
- `refunds` - Refund records
- `subscriptions` - Recurring payment subscriptions

### Compliance & Security

- `payment_audit_log` - Complete audit trail (PCI requirement)
- `webhook_events` - Webhook event processing
- `fraud_rules` - Fraud detection rules
- `reconciliation_records` - Daily reconciliation

## API Endpoints

### Payment Operations

#### Process Payment

```http
POST /api/v1/payments
Content-Type: application/json
X-User-ID: {userId}

{
  "orderId": "uuid",
  "amount": 99.99,
  "currency": "USD",
  "paymentMethodId": "pm_xxx",
  "provider": "stripe",
  "metadata": {}
}
```

#### Capture Payment

```http
POST /api/v1/payments/{transactionId}/capture
Content-Type: application/json

{
  "amount": 99.99
}
```

#### Refund Payment

```http
POST /api/v1/payments/{transactionId}/refund
Content-Type: application/json
X-User-ID: {userId}

{
  "amount": 99.99,
  "reason": "Customer request"
}
```

#### Get Transaction

```http
GET /api/v1/payments/{transactionId}
```

### Webhooks

#### Stripe Webhook

```http
POST /api/v1/webhooks/stripe
Stripe-Signature: {signature}
```

#### PayPal Webhook

```http
POST /api/v1/webhooks/paypal
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd services/payment-service
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Setup Database

```bash
# Create database
docker exec -it ecommerce-postgres psql -U postgres -c "CREATE DATABASE payment_db;"

# Run schema
Get-Content schema.sql | docker exec -i ecommerce-postgres psql -U postgres -d payment_db
```

### 4. Configure Payment Providers

#### Stripe Setup

1. Create Stripe account at https://stripe.com
2. Get API keys from Dashboard > Developers > API keys
3. Set up webhook endpoint at Dashboard > Developers > Webhooks
4. Add webhook secret to `.env`

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### PayPal Setup

1. Create PayPal developer account at https://developer.paypal.com
2. Create app in Dashboard > My Apps & Credentials
3. Get client ID and secret
4. Configure webhooks

```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

### 5. Start Service

```bash
npm run dev
```

## Security Best Practices

### PCI Compliance Checklist

- [x] Never log sensitive card data
- [x] Use tokenization for card storage
- [x] Encrypt all sensitive data at rest
- [x] Use TLS for data in transit
- [x] Implement audit logging
- [x] Regular security reviews
- [x] Access control and authentication
- [x] Secure key management

### Production Deployment

1. **Use Environment Variables**: Never commit secrets
2. **Enable HTTPS**: TLS 1.2+ required
3. **Rotate Keys**: Regular key rotation schedule
4. **Monitor Logs**: Set up log aggregation and alerts
5. **Backup Data**: Regular database backups
6. **Test Webhooks**: Verify signature validation
7. **Rate Limiting**: Adjust based on traffic
8. **Fraud Rules**: Configure based on business needs

## Fraud Detection Configuration

### Risk Thresholds

```env
FRAUD_HIGH_RISK_THRESHOLD=75
FRAUD_MEDIUM_RISK_THRESHOLD=50
```

### Actions by Risk Level

- **Low (0-49)**: Process normally
- **Medium (50-74)**: Require 3D Secure
- **High (75-100)**: Block and review

### Custom Rules

Add custom fraud rules via database:

```sql
INSERT INTO fraud_rules (name, description, rule_type, conditions, action, is_active, priority)
VALUES (
  'High Velocity Block',
  'Block if >5 transactions in 1 hour',
  'velocity',
  '{"max_transactions": 5, "window_minutes": 60}',
  'block',
  true,
  10
);
```

## Testing

### Test with Stripe

```bash
# Use Stripe test cards
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
# 3DS Required: 4000 0027 6000 3184
```

### Test with PayPal

Use PayPal sandbox accounts for testing

### Test Webhooks Locally

```bash
# Stripe CLI
stripe listen --forward-to localhost:3004/api/v1/webhooks/stripe
```

## Monitoring & Alerts

### Key Metrics

- Transaction success rate
- Average payment processing time
- Fraud detection accuracy
- Webhook processing latency
- Failed payment reasons

### Recommended Alerts

- High fraud score transactions
- Failed payment spike
- Webhook processing failures
- Reconciliation discrepancies
- API error rate increase

## Compliance & Audit

### Audit Log Retention

- Payment transactions: 7 years (PCI requirement)
- Audit logs: 7 years
- Webhook events: 1 year
- Fraud assessments: 2 years

### Regular Reviews

- Monthly reconciliation
- Quarterly security audit
- Annual PCI compliance review
- Fraud rule effectiveness review

## Support

### Common Issues

**Issue**: Payment fails with "Insufficient funds"

- **Solution**: Customer needs to use different payment method

**Issue**: 3D Secure not triggering

- **Solution**: Check `REQUIRE_3DS_ABOVE_AMOUNT` setting

**Issue**: Webhook signature verification fails

- **Solution**: Verify webhook secret matches provider dashboard

**Issue**: High fraud scores

- **Solution**: Review fraud rules and adjust thresholds

## API Reference

See [API Documentation](./docs/api.md) for complete API reference.

## License

MIT
