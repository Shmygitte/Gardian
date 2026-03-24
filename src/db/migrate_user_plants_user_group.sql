-- ============================================================
-- Migration: gd_user_plants für eigene User-Gruppen vorbereiten
-- - group_id nullable machen (kein Default-Gruppen-Backing nötig)
-- - user_group_id hinzufügen (FK → gd_user_groups)
-- ============================================================

USE `dev-gardian`;

-- 1. group_id nullable machen
ALTER TABLE `gd_user_plants` MODIFY COLUMN `group_id` INT UNSIGNED NULL;

-- 2. user_group_id Spalte hinzufügen
ALTER TABLE `gd_user_plants`
    ADD COLUMN `user_group_id` INT UNSIGNED NULL
        COMMENT 'FK zu gd_user_groups, gesetzt wenn eigene User-Gruppe (ohne Default-Backing)'
        AFTER `group_id`;

-- 3. FK-Constraint für user_group_id
ALTER TABLE `gd_user_plants`
    ADD CONSTRAINT `fk_up_user_group`
    FOREIGN KEY (`user_group_id`) REFERENCES `gd_user_groups`(`id`);

-- ============================================================
-- Fertig. Entweder group_id ODER user_group_id ist gesetzt.
-- ============================================================
