CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(150) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    summary VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(50) NOT NULL,
    reporter VARCHAR(100) NOT NULL,
    assignee VARCHAR(100),
    precondition TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    sprint VARCHAR(50)
);