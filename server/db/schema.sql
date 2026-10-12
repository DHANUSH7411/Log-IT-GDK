-- =======================================================
-- MovieBox Database Schema (MySQL 8.0+)
-- Safe initialization script: does not drop existing data
-- =======================================================

CREATE DATABASE IF NOT EXISTS moviebox_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE moviebox_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Titles table (locally cached / tracked catalog records from TMDB)
CREATE TABLE IF NOT EXISTS titles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tmdb_id INT NOT NULL,
  media_type ENUM('movie', 'tv') NOT NULL,
  name VARCHAR(255) NOT NULL,
  genres VARCHAR(255) DEFAULT NULL,
  release_date VARCHAR(50) DEFAULT NULL,
  poster_path VARCHAR(255) DEFAULT NULL,
  backdrop_path VARCHAR(255) DEFAULT NULL,
  overview TEXT DEFAULT NULL,
  tmdb_rating DECIMAL(3,1) DEFAULT 0.0,
  total_episodes INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tmdb_media (tmdb_id, media_type),
  INDEX idx_titles_media (media_type),
  INDEX idx_titles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tracker Entries table
CREATE TABLE IF NOT EXISTS tracker_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title_id INT NOT NULL,
  status ENUM('plan_to_watch', 'watching', 'completed', 'dropped') NOT NULL DEFAULT 'plan_to_watch',
  episodes_watched INT NOT NULL DEFAULT 0,
  current_season INT NOT NULL DEFAULT 1,
  current_episode INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_title_tracker (user_id, title_id),
  INDEX idx_tracker_status (status),
  CONSTRAINT fk_tracker_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tracker_title FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ratings table (1 to 5 stars per user per title)
CREATE TABLE IF NOT EXISTS ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title_id INT NOT NULL,
  rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_title_rating (user_id, title_id),
  CONSTRAINT fk_ratings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ratings_title FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reviews_title (title_id),
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_title FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table for express-mysql-session
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  expires INT(11) UNSIGNED NOT NULL,
  data MEDIUMTEXT COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
