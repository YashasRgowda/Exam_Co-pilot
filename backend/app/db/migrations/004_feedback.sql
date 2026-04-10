-- ============================================================
-- TABLE: exam_center_feedback
-- Crowd sourced feedback from students after exam.
-- Powers the Exam Center Reality Check feature.
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_center_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    center_address TEXT NOT NULL,
    center_city VARCHAR(100),
    security_strictness INTEGER CHECK (security_strictness BETWEEN 1 AND 5),
    locker_available BOOLEAN,
    parking_available BOOLEAN,
    location_difficulty INTEGER CHECK (location_difficulty BETWEEN 1 AND 5),
    entry_gate_tips TEXT,
    additional_tips TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_center ON exam_center_feedback(center_address);
CREATE INDEX IF NOT EXISTS idx_feedback_city ON exam_center_feedback(center_city);

ALTER TABLE exam_center_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feedback"
    ON exam_center_feedback FOR SELECT
    USING (true);

CREATE POLICY "User can insert own feedback"
    ON exam_center_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);