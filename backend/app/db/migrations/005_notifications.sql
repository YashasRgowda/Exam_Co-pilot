-- ============================================================
-- TABLE: notifications
-- Stores scheduled reminders for each exam.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    expo_push_token TEXT,
    notification_type VARCHAR(50) NOT NULL,
    -- Types: 'night_before', 'morning_of', 'leave_home_alert'
    scheduled_at TIMESTAMPTZ NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_sent ON notifications(is_sent);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "User can insert own notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);