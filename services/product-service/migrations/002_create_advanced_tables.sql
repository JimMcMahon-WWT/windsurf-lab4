-- Create product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    
    -- Verification
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    
    -- Helpful votes
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Response from merchant
    merchant_response TEXT,
    merchant_response_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at DESC);

-- Create discounts/promotions table
CREATE TABLE IF NOT EXISTS product_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y')),
    discount_value DECIMAL(10, 2) NOT NULL,
    
    -- Applicability
    applies_to VARCHAR(50) CHECK (applies_to IN ('all', 'category', 'product', 'tag')),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Conditions
    min_purchase_amount DECIMAL(10, 2),
    min_quantity INTEGER,
    max_uses INTEGER,
    max_uses_per_customer INTEGER,
    current_uses INTEGER DEFAULT 0,
    
    -- Dates
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_discounts_starts_at ON product_discounts(starts_at);
CREATE INDEX IF NOT EXISTS idx_product_discounts_ends_at ON product_discounts(ends_at);
CREATE INDEX IF NOT EXISTS idx_product_discounts_is_active ON product_discounts(is_active);

-- Create product_discounts join table
CREATE TABLE IF NOT EXISTS product_discount_mapping (
    discount_id UUID NOT NULL REFERENCES product_discounts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (discount_id, product_id)
);

-- Create inventory reservations table
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reserved_by_user_id UUID,
    reserved_by_order_id UUID,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired')),
    
    -- Timestamps
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure either product_id or variant_id is set
    CONSTRAINT chk_reservation_reference CHECK (
        (product_id IS NOT NULL AND variant_id IS NULL) OR
        (product_id IS NULL AND variant_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_id ON inventory_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_variant_id ON inventory_reservations(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order_id ON inventory_reservations(reserved_by_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status ON inventory_reservations(status);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires_at ON inventory_reservations(expires_at);

-- Create inventory history table (for tracking changes)
CREATE TABLE IF NOT EXISTS inventory_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('restock', 'sale', 'adjustment', 'return', 'damaged', 'reservation', 'release')),
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    
    reason TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    
    performed_by_user_id UUID,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_history_product_id ON inventory_history(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_variant_id ON inventory_history(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created_at ON inventory_history(created_at DESC);

-- Create product views tracking table
CREATE TABLE IF NOT EXISTS product_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID,
    session_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user_id ON product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_created_at ON product_views(created_at DESC);

-- Create product recommendations table (collaborative filtering)
CREATE TABLE IF NOT EXISTS product_recommendations (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    recommended_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    score DECIMAL(5, 4) NOT NULL,
    recommendation_type VARCHAR(50) CHECK (recommendation_type IN ('similar', 'frequently_bought_together', 'customers_also_viewed', 'trending')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, recommended_product_id, recommendation_type)
);

CREATE INDEX IF NOT EXISTS idx_product_recommendations_product_id ON product_recommendations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_recommendations_score ON product_recommendations(score DESC);

-- Create search query tracking (for analytics)
CREATE TABLE IF NOT EXISTS search_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    results_count INTEGER,
    user_id UUID,
    session_id VARCHAR(255),
    filters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries(query);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at DESC);

-- Create product attributes table (for filtering)
CREATE TABLE IF NOT EXISTS product_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_name ON product_attributes(attribute_name);
CREATE INDEX IF NOT EXISTS idx_product_attributes_value ON product_attributes(attribute_value);

-- Create triggers for updated_at
CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON product_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_discounts_updated_at BEFORE UPDATE ON product_discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_reservations_updated_at BEFORE UPDATE ON inventory_reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update product review stats
CREATE OR REPLACE FUNCTION update_product_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE products
        SET 
            review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = NEW.product_id AND is_approved = TRUE),
            average_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM product_reviews WHERE product_id = NEW.product_id AND is_approved = TRUE)
        WHERE id = NEW.product_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE products
        SET 
            review_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = OLD.product_id AND is_approved = TRUE),
            average_rating = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM product_reviews WHERE product_id = OLD.product_id AND is_approved = TRUE), 0)
        WHERE id = OLD.product_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_review_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_product_review_stats();
