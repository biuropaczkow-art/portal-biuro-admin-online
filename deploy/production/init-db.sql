-- Inicjalizacja kompletnego schematu produkcyjnego Portal.biuroadmin.online & KSeF Outbox
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- INVOICES TABLE - Core business entity (KSeF 2.0 & Portal)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    invoice_type VARCHAR(20) DEFAULT 'VAT',
    seller_nip VARCHAR(10) NOT NULL,
    buyer_nip VARCHAR(10) NOT NULL,
    seller_name VARCHAR(255) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    sale_date DATE NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
    total_net NUMERIC(15, 2) NOT NULL,
    total_vat NUMERIC(15, 2) NOT NULL,
    total_gross NUMERIC(15, 2) NOT NULL,
    ksef_number VARCHAR(100),
    ksef_status VARCHAR(50) DEFAULT 'DRAFT',
    ksef_sent_at TIMESTAMPTZ,
    ksef_response JSONB,
    original_invoice_number VARCHAR(100),
    original_ksef_number VARCHAR(100),
    correction_reason TEXT,
    idempotency_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_invoices_seller_nip ON invoices(seller_nip);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_nip ON invoices(buyer_nip);
CREATE INDEX IF NOT EXISTS idx_invoices_ksef_status ON invoices(ksef_status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_idempotency_hash ON invoices(idempotency_hash);

-- ============================================================================
-- INVOICE LINE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_price_net NUMERIC(15, 4) NOT NULL,
    vat_rate NUMERIC(5, 2) NOT NULL,
    net_amount NUMERIC(15, 2) NOT NULL,
    vat_amount NUMERIC(15, 2) NOT NULL,
    gross_amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- ============================================================================
-- OUTBOX EVENTS TABLE - Transactional Outbox Pattern
-- ============================================================================
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events(status, created_at) 
    WHERE status IN ('PENDING', 'RETRY');
CREATE INDEX IF NOT EXISTS idx_outbox_next_retry ON outbox_events(next_retry_at)
    WHERE status = 'RETRY';
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox_events(aggregate_id, aggregate_type);

-- ============================================================================
-- IDEMPOTENCY KEYS TABLE - For exactly-once processing
-- ============================================================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES outbox_events(id) ON DELETE CASCADE,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- ============================================================================
-- OUTBOX RELAY STATE TABLE - For monitoring and telemetry
-- ============================================================================
CREATE TABLE IF NOT EXISTS outbox_relay_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_processed_id UUID,
    last_processed_at TIMESTAMPTZ,
    events_processed_total BIGINT NOT NULL DEFAULT 0,
    events_failed_total BIGINT NOT NULL DEFAULT 0,
    last_error TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO outbox_relay_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- e-DORĘCZENIA (ADE) TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS edoreczenia_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(100) UNIQUE NOT NULL,
    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject TEXT,
    status VARCHAR(30) DEFAULT 'RECEIVED',
    upd_received BOOLEAN DEFAULT FALSE,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Clean up old processed outbox events (run via cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_outbox_events(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM outbox_events
    WHERE status = 'PROCESSED'
    AND processed_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get outbox statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION get_outbox_stats()
RETURNS TABLE (
    status VARCHAR(20),
    count BIGINT,
    oldest_pending TIMESTAMPTZ,
    newest_pending TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oe.status::VARCHAR(20),
        COUNT(*)::BIGINT,
        MIN(CASE WHEN oe.status = 'PENDING' THEN oe.created_at END),
        MAX(CASE WHEN oe.status = 'PENDING' THEN oe.created_at END)
    FROM outbox_events oe
    GROUP BY oe.status;
END;
$$ LANGUAGE plpgsql;
