-- EduEats database schema
-- Run with: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS edueats_db;
USE edueats_db;

-- one row per student
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    grade VARCHAR(20),
    room_no VARCHAR(10),
    parent_email VARCHAR(150),
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255),
    photo_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- one row per class/study session a student starts
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    duration_min INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- one row per mood check-in (CNN detection result)
CREATE TABLE IF NOT EXISTS moods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    session_id INT,
    mood VARCHAR(20) NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- food suggested by the rule engine for a given mood check-in
CREATE TABLE IF NOT EXISTS food_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mood_id INT NOT NULL,
    food_name VARCHAR(100) NOT NULL,
    FOREIGN KEY (mood_id) REFERENCES moods(id)
);

-- alerts sent to the parent for concerning moods
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mood_id INT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mood_id) REFERENCES moods(id)
);
