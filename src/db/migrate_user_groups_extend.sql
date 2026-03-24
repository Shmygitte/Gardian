-- ============================================================
-- Migration: gd_user_groups erweitern
-- - name VARCHAR(150) NULL hinzufügen (eigenständiger Gruppenname)
-- - group_id nullable machen (kein Default-Gruppen-Backing nötig)
-- ============================================================

USE `dev-gardian`;

-- 1. FK-Constraint entfernen (muss vor ALTER TABLE erfolgen)
ALTER TABLE `gd_user_groups` DROP FOREIGN KEY `fk_ug_group`;

-- 2. group_id nullable machen
ALTER TABLE `gd_user_groups` MODIFY COLUMN `group_id` INT UNSIGNED NULL;

-- 3. name-Feld hinzufügen
ALTER TABLE `gd_user_groups` ADD COLUMN `name` VARCHAR(150) NULL AFTER `user_id`;

-- 4. FK-Constraint wieder hinzufügen (jetzt mit NULL erlaubt)
ALTER TABLE `gd_user_groups`
    ADD CONSTRAINT `fk_ug_group`
    FOREIGN KEY (`group_id`) REFERENCES `gd_default_groups`(`id`);

-- ============================================================
-- Fertig.
-- ============================================================
