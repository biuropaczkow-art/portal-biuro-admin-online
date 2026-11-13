-- Inicjalizacja schematu produkcyjnego Portal.biuroadmin.online

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela faktur z unikalnym hashem idempotencji (Zadanie A06)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nip_seller VARCHAR(10) NOT NULL,
    nip_buyer VARCHAR(10) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    gross_amount NUMERIC(12, 2) NOT NULL,
    net_amount NUMERIC(12, 2) NOT NULL,
    vat_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PLN',
    idempotency_hash VARCHAR(64) NOT NULL,
    ksef_reference_number VARCHAR(100),
    status VARCHAR(30) DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_idempotency_hash ON invoices (idempotency_hash);
CREATE INDEX IF NOT EXISTS idx_invoices_seller_date ON invoices (nip_seller, issue_date);

-- Tabela wzorca Transactional Outbox dla KSeF 2.0 (Zadanie A08)
CREATE TABLE IF NOT EXISTS ksef_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    payload_xml TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, PROCESSING, SENT, FAILED, DLQ
    retry_count INT DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ksef_upo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ksef_outbox_status_next_retry ON ksef_outbox (status, next_retry_at);

-- Tabela korespondencji e-Doręczeń (Zadanie A10)
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
