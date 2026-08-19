-- 001_initial.sql
-- Create attendance records table

CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    class_id VARCHAR(50),
    subject VARCHAR(100),
    record_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    check_in_time VARCHAR(20),
    check_out_time VARCHAR(20),
    method VARCHAR(50) NOT NULL DEFAULT 'manual',
    device_id VARCHAR(100),
    marked_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups by student and date
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance_records(student_id, record_date);
