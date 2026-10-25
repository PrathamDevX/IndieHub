-- Migration: Add status column to users table for suspension support
USE indiehub;

ALTER TABLE users
  ADD COLUMN status ENUM('active', 'suspended') NOT NULL DEFAULT 'active' AFTER role,
  ADD INDEX idx_users_status (status);
