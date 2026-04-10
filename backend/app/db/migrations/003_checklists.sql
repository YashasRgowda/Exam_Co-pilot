-- ============================================================
-- TABLE: checklist_items
-- Stores exam day checklist items per exam per user.
-- Pre-populated based on exam type after parsing.
-- ============================================================

CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_exam_id ON checklist_items(exam_id);
CREATE INDEX IF NOT EXISTS idx_checklist_user_id ON checklist_items(user_id);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own checklist"
    ON checklist_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "User can insert own checklist"
    ON checklist_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can update own checklist"
    ON checklist_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "User can delete own checklist"
    ON checklist_items FOR DELETE
    USING (auth.uid() = user_id);