-- Payment Service Database Schema
-- PCI Compliant Payment Processing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment Providers
CREATE TABLE IF NOT EXISTS payment_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    provider_type VARCHAR(50) NOT NULL, -- stripe, paypal, etc
    is_active BOOLEAN DEFAULT TRUE,
    configuration JSONB NOT NULL, -- encrypted credentials
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_providers_active ON payment_providers(is_active);

-- Payment Methods (Tokenized - PCI Compliant)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider_id UUID REFERENCES payment_providers(id),
    
    -- Tokenized data (never store raw card data)
    token VARCHAR(255) NOT NULL UNIQUE,
    method_type VARCHAR(50) NOT NULL, -- card, paypal, wallet
    
    -- Safe to store (non-sensitive)
    last_four VARCHAR(4),
    card_brand VARCHAR(50),
    expiry_month INTEGER,
    expiry_year INTEGER,
    
    billing_address JSONB,
    
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_methods_token ON payment_methods(token);

-- Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    order_id UUID NOT NULL,
    user_id UUID NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id),
    provider_id UUID REFERENCES payment_providers(id),
    
    -- Transaction details
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    provider_transaction_id VARCHAR(255),
    
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    status VARCHAR(50) NOT NULL, -- pending, authorized, captured, failed, refunded, cancelled
    transaction_type VARCHAR(50) NOT NULL, -- payment, refund, capture, authorization
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    
    -- Risk assessment
    fraud_score DECIMAL(5, 2),
    fraud_assessment JSONB,
    requires_3ds BOOLEAN DEFAULT FALSE,
    
    -- Provider response (encrypted)
    provider_response JSONB,
    
    -- Timestamps
    authorized_at TIMESTAMP WITH TIME ZONE,
    captured_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_transactions_user ON payment_transactions(user_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status);
CREATE INDEX idx_transactions_provider ON payment_transactions(provider_transaction_id);
CREATE INDEX idx_transactions_created ON payment_transactions(created_at DESC);

-- Refunds
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    transaction_id UUID REFERENCES payment_transactions(id) NOT NULL,
    provider_refund_id VARCHAR(255),
    
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    reason VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- pending, succeeded, failed, cancelled
    
    initiated_by UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refunds_transaction ON refunds(transaction_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id),
    provider_subscription_id VARCHAR(255),
    
    plan_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- active, cancelled, past_due, expired
    
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_interval VARCHAR(20) NOT NULL, -- month, year
    
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    
    trial_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);

-- Audit Log (Compliance)
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    entity_type VARCHAR(100) NOT NULL, -- transaction, refund, payment_method
    entity_id UUID NOT NULL,
    
    action VARCHAR(100) NOT NULL,
    actor_id UUID,
    actor_type VARCHAR(50), -- user, system, admin
    
    changes JSONB,
    metadata JSONB DEFAULT '{}',
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_entity ON payment_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON payment_audit_log(created_at DESC);

-- Webhook Events
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    provider VARCHAR(50) NOT NULL,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    
    payload JSONB NOT NULL,
    signature VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_provider ON webhook_events(provider);
CREATE INDEX idx_webhooks_processed ON webhook_events(processed);
CREATE INDEX idx_webhooks_created ON webhook_events(created_at DESC);

-- Payment Reconciliation
CREATE TABLE IF NOT EXISTS reconciliation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    date DATE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    
    expected_amount DECIMAL(12, 2) NOT NULL,
    actual_amount DECIMAL(12, 2) NOT NULL,
    difference DECIMAL(12, 2) NOT NULL,
    
    transaction_count INTEGER NOT NULL,
    discrepancies JSONB,
    
    status VARCHAR(50) NOT NULL, -- matched, discrepancy, pending_review
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reconciliation_date ON reconciliation_records(date DESC);
CREATE INDEX idx_reconciliation_status ON reconciliation_records(status);

-- Fraud Detection Rules
CREATE TABLE IF NOT EXISTS fraud_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL, -- velocity, amount, geolocation, device
    
    conditions JSONB NOT NULL,
    action VARCHAR(50) NOT NULL, -- block, review, allow_with_3ds
    
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    
    triggered_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fraud_rules_active ON fraud_rules(is_active, priority);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_payment_providers_updated_at BEFORE UPDATE ON payment_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reconciliation_records_updated_at BEFORE UPDATE ON reconciliation_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fraud_rules_updated_at BEFORE UPDATE ON fraud_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
