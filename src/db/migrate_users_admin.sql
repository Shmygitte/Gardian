-- ============================================================
-- Migration: last_login zu gd_users + shmygitte als admin
-- ============================================================

USE `dev-gardian`;

-- 1. last_login hinzufügen
ALTER TABLE `gd_users`
    ADD COLUMN `last_login` TIMESTAMP NULL AFTER `avatar_path`;

-- 2. shmygitte als admin setzen
UPDATE `gd_users` SET `role` = 'admin' WHERE `username` = 'shmygitte';

-- ============================================================
-- Fertig.
-- ============================================================
