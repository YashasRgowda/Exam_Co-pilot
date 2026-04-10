-- ============================================================
-- TABLE: profiles
-- Stores public user data linked to Supabase Auth users.
-- Supabase Auth handles passwords, OTP, sessions.
-- This table stores app-specific user data.
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100),
    phone VARCHAR(15) UNIQUE,
    is_premium BOOLEAN DEFAULT FALSE,
    daily_parse_count INTEGER DEFAULT 0,
    last_parse_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEX: faster lookup by phone number
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- ============================================================
-- FUNCTION: auto update updated_at on any row change
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: fires the function on every update
-- ============================================================
CREATE OR REPLACE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- Users can only read and update their own profile.
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "User can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- ============================================================
-- FUNCTION: auto create profile when new user signs up
-- This fires automatically when Supabase Auth creates a user
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, phone)
    VALUES (
        NEW.id,
        NEW.phone
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();