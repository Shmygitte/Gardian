-- ============================================================
-- Migration: Botanischer Name
-- Fügt botanical_name zu allen 3 Pflanzentabellen hinzu
-- ============================================================

USE `dev-gardian`;

ALTER TABLE `gd_default_groups`
    ADD COLUMN `botanical_name` VARCHAR(200) NULL
        COMMENT 'Botanischer Name (z.B. Wisteria sinensis)'
        AFTER `name`;

ALTER TABLE `gd_user_groups`
    ADD COLUMN `botanical_name` VARCHAR(200) NULL
        COMMENT 'Botanischer Name. NULL = von Default erben'
        AFTER `name`;

ALTER TABLE `gd_user_plants`
    ADD COLUMN `botanical_name` VARCHAR(200) NULL
        COMMENT 'Botanischer Name. NULL = von Gruppe erben'
        AFTER `name`;

-- ============================================================
-- Fertig.
-- ============================================================
