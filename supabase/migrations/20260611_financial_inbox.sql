-- 20260611_financial_inbox.sql

-- ספקים/גורמים (נירמול לחיפוש ומגמות)
CREATE TABLE vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,                -- שם רשמי
  tax_id text,                       -- ח.פ. / עוסק מורשה
  aliases text[] DEFAULT '{}',       -- כינויים שזוהו במסמכים
  notes text,
  deleted_at timestamptz
);
CREATE INDEX vendors_name_trgm_idx ON vendors USING gin (name gin_trgm_ops);
CREATE UNIQUE INDEX vendors_tax_id_idx ON vendors(tax_id) WHERE tax_id IS NOT NULL AND deleted_at IS NULL;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- תיבת המסמכים
CREATE TABLE financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by text,                  -- "admin:<name>", כמו staff_documents

  -- קובץ
  storage_path text NOT NULL,
  original_filename text,
  mime_type text,
  file_size bigint,

  -- חולץ ע"י AI, נערך ע"י אדמין
  doc_type text,                     -- invoice | receipt | invoice_receipt | bank_transfer | payment_request | proforma | check | delivery_note | other
  direction text,                    -- income | expense
  vendor_id uuid REFERENCES vendors(id),
  vendor_name_raw text,              -- השם כפי שהופיע במסמך
  doc_number text,
  doc_date date,
  amount_before_vat numeric(12,2),
  vat_amount numeric(12,2),
  total_amount numeric(12,2),
  currency text DEFAULT 'ILS',
  category text,                     -- fuel | materials | subcontractor | equipment | office | salary | client_payment | other
  project_id uuid REFERENCES projects(id),
  description text,                  -- תקציר תוכן מה-AI

  -- בקרה
  extraction_raw jsonb,              -- תשובת ה-AI המלאה
  extraction_status text NOT NULL DEFAULT 'pending',  -- pending | done | failed
  status text NOT NULL DEFAULT 'pending',             -- pending | approved | rejected
  reviewed_at timestamptz,
  reviewed_by text,
  notes text,

  -- עתידי (שלב ד' — הצלבות)
  linked_document_id uuid REFERENCES financial_documents(id),

  deleted_at timestamptz
);

CREATE INDEX findocs_status_idx ON financial_documents(status) WHERE deleted_at IS NULL;
CREATE INDEX findocs_vendor_idx ON financial_documents(vendor_id);
CREATE INDEX findocs_project_idx ON financial_documents(project_id);
CREATE INDEX findocs_date_idx ON financial_documents(doc_date);
CREATE INDEX findocs_type_idx ON financial_documents(doc_type);
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;
-- RLS ללא policies → גישה רק דרך service_role, כמו staff_documents
