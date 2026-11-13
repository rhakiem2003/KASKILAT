-- ==============================================================================
-- Migrasi Database KasKilat UMKM (Supabase / PostgreSQL)
-- Fitur: Kas In / Kas Out, Kategori, OCR Metadata, RLS Multi-user
-- ==============================================================================

-- Aktifkan ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL KATEGORI (categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
    color VARCHAR(30) NOT NULL DEFAULT '#10b981',
    icon VARCHAR(50) NOT NULL DEFAULT 'Tag',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeks Kategori
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);

-- 2. TABEL TRANSAKSI (transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    merchant VARCHAR(255),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    payment_method VARCHAR(50) DEFAULT 'Tunai',
    photo_url TEXT,
    ocr_raw_text TEXT,
    ocr_confidence NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeks Transaksi untuk query cepat dashboard dan filter
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS Kategori: Hanya pemilik user_id yang bisa SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Users can view own categories"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);

-- Kebijakan RLS Transaksi
CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
    ON public.transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
    ON public.transactions FOR DELETE
    USING (auth.uid() = user_id);

-- 4. DEFAULT KATEGORI STANDAR UMKM (Template)
INSERT INTO public.categories (name, type, color, icon) VALUES
    ('Penjualan Produk', 'in', '#10b981', 'ShoppingBag'),
    ('Jasa & Layanan', 'in', '#06b6d4', 'Wrench'),
    ('Penerimaan Piutang', 'in', '#3b82f6', 'ArrowDownLeft'),
    ('Pendapatan Lain', 'in', '#8b5cf6', 'Coins'),
    ('Beli Stok & Bahan Baku', 'out', '#ef4444', 'Package'),
    ('Operasional & Listrik', 'out', '#f97316', 'Zap'),
    ('Gaji & Upah Karyawan', 'out', '#ec4899', 'Users'),
    ('Sewa Tempat & Toko', 'out', '#6366f1', 'Home'),
    ('Biaya Transport & Kirim', 'out', '#14b8a6', 'Truck'),
    ('Makan & Minum Usaha', 'out', '#eab308', 'Utensils')
ON CONFLICT DO NOTHING;
