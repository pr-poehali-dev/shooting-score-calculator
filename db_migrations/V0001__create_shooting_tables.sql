CREATE TABLE IF NOT EXISTS shooters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shots (
    id SERIAL PRIMARY KEY,
    shooter_id INTEGER NOT NULL REFERENCES shooters(id),
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    score INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shots_shooter ON shots(shooter_id);
CREATE INDEX idx_shots_session ON shots(session_id);
CREATE INDEX idx_shots_created ON shots(created_at DESC);