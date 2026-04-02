-- Blood Bank Management System Database Schema

CREATE DATABASE IF NOT EXISTS blood_bank_db;
USE blood_bank_db;

-- ============================================
-- Users table (Admin & Staff accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role ENUM('admin', 'staff') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- Donors table
-- ============================================
CREATE TABLE IF NOT EXISTS donors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(15) NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    date_of_birth DATE NOT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-') NOT NULL,
    address TEXT,
    city VARCHAR(100),
    medical_notes TEXT,
    last_donation_date DATE,
    total_donations INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_blood_group (blood_group),
    INDEX idx_status (status),
    INDEX idx_city (city)
);

-- ============================================
-- Donations table
-- ============================================
CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    donation_date DATE NOT NULL,
    units DECIMAL(3,1) DEFAULT 1.0,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-') NOT NULL,
    status ENUM('collected', 'tested', 'stored', 'used', 'expired') DEFAULT 'collected',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    INDEX idx_donation_date (donation_date),
    INDEX idx_donation_status (status),
    INDEX idx_donation_blood_group (blood_group)
);

-- ============================================
-- Blood Inventory table
-- ============================================
CREATE TABLE IF NOT EXISTS blood_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-') NOT NULL UNIQUE,
    units_available INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- Blood Requests table
-- ============================================
CREATE TABLE IF NOT EXISTS blood_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    hospital_name VARCHAR(100) NOT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-') NOT NULL,
    units_needed INT NOT NULL DEFAULT 1,
    urgency ENUM('normal', 'urgent', 'critical') DEFAULT 'normal',
    contact_person VARCHAR(100),
    contact_phone VARCHAR(15),
    reason TEXT,
    status ENUM('pending', 'approved', 'fulfilled', 'rejected') DEFAULT 'pending',
    notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fulfilled_at TIMESTAMP NULL,
    INDEX idx_request_status (status),
    INDEX idx_request_urgency (urgency),
    INDEX idx_request_blood_group (blood_group)
);

-- ============================================
-- Blood Camps table
-- ============================================
CREATE TABLE IF NOT EXISTS blood_camps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    camp_name VARCHAR(150) NOT NULL,
    location VARCHAR(255) NOT NULL,
    camp_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    organizer VARCHAR(100),
    contact_phone VARCHAR(15),
    expected_donors INT DEFAULT 0,
    actual_donors INT DEFAULT 0,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_camp_status (status),
    INDEX idx_camp_date (camp_date)
);

-- ============================================
-- Seed Data
-- ============================================

-- Default admin user (password: admin123)
INSERT INTO users (username, password, full_name, email, role) VALUES
('admin', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkKQr0MbWQ6VNU5Y5ESJzBIyGHGKe', 'System Admin', 'admin@bloodbank.com', 'admin');

-- Initialize blood inventory for all blood groups
INSERT INTO blood_inventory (blood_group, units_available) VALUES
('A+', 25),
('A-', 10),
('B+', 30),
('B-', 8),
('O+', 45),
('O-', 15),
('AB+', 12),
('AB-', 5);

-- Sample donors
INSERT INTO donors (full_name, email, phone, gender, date_of_birth, blood_group, address, city, status, total_donations, last_donation_date) VALUES
('Rahul Sharma', 'rahul@email.com', '9876543210', 'Male', '1990-05-15', 'O+', '123 Main Street', 'Mumbai', 'active', 5, '2026-03-01'),
('Priya Patel', 'priya@email.com', '9876543211', 'Female', '1992-08-22', 'A+', '456 Park Avenue', 'Delhi', 'active', 3, '2026-02-15'),
('Amit Kumar', 'amit@email.com', '9876543212', 'Male', '1988-12-10', 'B+', '789 Lake Road', 'Bangalore', 'active', 7, '2026-03-10'),
('Sneha Reddy', 'sneha@email.com', '9876543213', 'Female', '1995-03-28', 'AB+', '321 Hill View', 'Hyderabad', 'active', 2, '2026-01-20'),
('Vikram Singh', 'vikram@email.com', '9876543214', 'Male', '1985-07-04', 'O-', '654 Garden Lane', 'Pune', 'active', 10, '2026-03-15');

-- Sample donations
INSERT INTO donations (donor_id, donation_date, units, blood_group, status) VALUES
(1, '2026-03-01', 1.0, 'O+', 'stored'),
(2, '2026-02-15', 1.0, 'A+', 'stored'),
(3, '2026-03-10', 1.0, 'B+', 'stored'),
(4, '2026-01-20', 1.0, 'AB+', 'used'),
(5, '2026-03-15', 1.0, 'O-', 'stored');

-- Sample blood requests
INSERT INTO blood_requests (patient_name, hospital_name, blood_group, units_needed, urgency, contact_person, contact_phone, reason, status) VALUES
('Kiran Desai', 'City Hospital', 'A+', 2, 'urgent', 'Dr. Mehta', '9988776655', 'Surgery scheduled', 'pending'),
('Meena Joshi', 'General Hospital', 'O+', 3, 'critical', 'Dr. Agarwal', '9988776656', 'Accident victim', 'pending'),
('Ravi Nair', 'Apollo Hospital', 'B-', 1, 'normal', 'Dr. Iyer', '9988776657', 'Thalassemia treatment', 'approved');

-- Sample blood camps
INSERT INTO blood_camps (camp_name, location, camp_date, start_time, end_time, organizer, contact_phone, expected_donors, status, description) VALUES
('World Blood Donor Day Camp', 'City Convention Center, Mumbai', '2026-06-14', '09:00:00', '17:00:00', 'Red Cross Society', '9900112233', 100, 'upcoming', 'Annual blood donation drive on World Blood Donor Day'),
('Corporate Blood Drive', 'Tech Park, Bangalore', '2026-04-20', '10:00:00', '16:00:00', 'TechCorp CSR', '9900112234', 50, 'upcoming', 'Blood donation camp for corporate employees');
