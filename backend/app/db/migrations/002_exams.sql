-- ============================================================
-- TABLE: exams
-- Stores parsed admit card data for each student.
-- One user can have multiple exams.
-- ============================================================

CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    exam_name VARCHAR(200) NOT NULL,
    exam_date DATE NOT NULL,
    reporting_time TIME,
    gate_closing_time TIME,
    center_name VARCHAR(300),
    center_address TEXT,
    center_city VARCHAR(100),
    center_latitude DECIMAL(10, 8),
    center_longitude DECIMAL(11, 8),
    roll_number VARCHAR(100),
    admit_card_url TEXT,
    raw_extracted_text TEXT,
    instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_user_id ON exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON exams(exam_date);

CREATE OR REPLACE TRIGGER trigger_exams_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own exams"
    ON exams FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "User can insert own exams"
    ON exams FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can update own exams"
    ON exams FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "User can delete own exams"
    ON exams FOR DELETE
    USING (auth.uid() = user_id);