-- Supabase PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Blood Inventory Table
CREATE TABLE IF NOT EXISTS blood_inventory (
    id SERIAL PRIMARY KEY,
    blood_group VARCHAR(10) UNIQUE NOT NULL,
    units_available INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert original inventory groups
INSERT INTO blood_inventory (blood_group, units_available) VALUES
    ('A+', 0), ('A-', 0), ('B+', 0), ('B-', 0),
    ('O+', 0), ('O-', 0), ('AB+', 0), ('AB-', 0)
ON CONFLICT (blood_group) DO NOTHING;

-- 3. Donors Table
CREATE TABLE IF NOT EXISTS donors (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    date_of_birth DATE NOT NULL,
    blood_group VARCHAR(10) NOT NULL REFERENCES blood_inventory(blood_group),
    address TEXT,
    city VARCHAR(100),
    medical_notes TEXT,
    status VARCHAR(20) DEFAULT 'active',
    last_donation_date DATE,
    total_donations INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Donations Table
CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    donor_id INT NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    donation_date DATE NOT NULL,
    units INT DEFAULT 1,
    blood_group VARCHAR(10) NOT NULL REFERENCES blood_inventory(blood_group),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'stored',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Blood Requests Table
CREATE TABLE IF NOT EXISTS blood_requests (
    id SERIAL PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    hospital_name VARCHAR(150) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    units_needed INT NOT NULL,
    urgency VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    reason TEXT,
    requested_by INT REFERENCES users(id) ON DELETE SET NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fulfilled_at TIMESTAMP
);

-- 6. Blood Camps Table
CREATE TABLE IF NOT EXISTS blood_camps (
    id SERIAL PRIMARY KEY,
    camp_name VARCHAR(150) NOT NULL,
    location VARCHAR(200) NOT NULL,
    camp_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    organizer VARCHAR(100),
    contact_phone VARCHAR(20),
    expected_donors INT DEFAULT 0,
    actual_donors INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'upcoming',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Camp Registrations Table
CREATE TABLE IF NOT EXISTS camp_registrations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    camp_id INT NOT NULL REFERENCES blood_camps(id) ON DELETE CASCADE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, camp_id)
);

-- 8. PostgreSQL Connect-Pg-Simple Session Table
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar PRIMARY KEY COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON "session" ("expire");
