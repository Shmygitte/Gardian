-- ============================================================
-- Migration: Datenbank umbenennen von "gardian" → "dev-gardian"
-- ============================================================
-- Hinweis: MySQL unterstützt kein direktes RENAME DATABASE mehr.
-- Vorgehen: Neue DB anlegen → alle Tabellen verschieben → alte DB löschen.
-- WICHTIG: Backup vorher erstellen!
-- ============================================================

-- 1. Neue Datenbank anlegen
CREATE DATABASE IF NOT EXISTS `dev-gardian`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 2. Tabellen in neue DB verschieben (RENAME verschiebt ohne Datenverlust)
RENAME TABLE
    `gardian`.`gd_users`               TO `dev-gardian`.`gd_users`,
    `gardian`.`gd_default_groups`      TO `dev-gardian`.`gd_default_groups`,
    `gardian`.`gd_user_groups`         TO `dev-gardian`.`gd_user_groups`,
    `gardian`.`gd_user_plants`         TO `dev-gardian`.`gd_user_plants`,
    `gardian`.`gd_images`              TO `dev-gardian`.`gd_images`,
    `gardian`.`gd_user_garden_config`  TO `dev-gardian`.`gd_user_garden_config`;

-- 3. Alte (nun leere) Datenbank löschen
DROP DATABASE IF EXISTS `gardian`;

-- ============================================================
-- Fertig. Verbindungsstring im Code auf "dev-gardian" ändern.
-- ============================================================
