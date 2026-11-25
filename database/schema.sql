-- ============================================================
-- ATHLETES
-- ============================================================

CREATE TABLE IF NOT EXISTS athletes (

    id SERIAL PRIMARY KEY,

    name VARCHAR(120) NOT NULL,

    age INT,

    gender VARCHAR(20),

    height_cm NUMERIC,

    weight_kg NUMERIC,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- PERFORMANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS performance (

    id SERIAL PRIMARY KEY,

    athlete_id INT
        REFERENCES athletes(id)
        ON DELETE CASCADE,

    sprint_speed NUMERIC,

    vertical_jump NUMERIC,

    standing_long_jump NUMERIC,

    takeoff_speed NUMERIC,

    takeoff_angle NUMERIC,

    jump_distance NUMERIC,

    -- Video analysis values

    flight_time NUMERIC,

    takeoff_knee_angle NUMERIC,

    takeoff_hip_angle NUMERIC,

    takeoff_ankle_angle NUMERIC,

    landing_stability NUMERIC,

    pose_confidence NUMERIC,

    analysis_quality NUMERIC,

    runup_time NUMERIC,

    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- PREDICTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS predictions (

    id SERIAL PRIMARY KEY,

    athlete_id INT
        REFERENCES athletes(id)
        ON DELETE CASCADE,

    predicted_distance NUMERIC,

    talent_level VARCHAR(30),

    confidence NUMERIC,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- ADD COLUMNS IF TABLE ALREADY EXISTS
-- ============================================================

ALTER TABLE performance
ADD COLUMN IF NOT EXISTS flight_time NUMERIC;

ALTER TABLE performance
ADD COLUMN IF NOT EXISTS takeoff_knee_angle NUMERIC;

ALTER TABLE performance
ADD COLUMN IF NOT EXISTS takeoff_hip_angle NUMERIC;

ALTER TABLE performance
ADD COLUMN IF NOT EXISTS takeoff_ankle_angle NUMERIC;

ALTER TABLE performance
ADD COLUMN IF NOT EXISTS landing_stability NUMERIC;

ALTER TABLE performance
ADD COLUMN IF NOT EXISTS pose_confidence NUMERIC;

ALTER TABLE performance
ADD COLUMN IF NOT EXISTS analysis_quality NUMERIC;

ALTER TABLE performance
ADD COLUMN IF NOT EXISTS runup_time NUMERIC;