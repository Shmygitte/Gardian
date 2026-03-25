-- ============================================================
-- Migration: Blühzeit-System
-- Ersetzt bloom_start/bloom_end durch bloom_months (Bitmask)
-- Neue Tabelle gd_bloom_observations für jahresgenaue Beobachtungen
--
-- Bitmask: Bit 0 = Januar, Bit 1 = Februar, ..., Bit 11 = Dezember
-- Beispiel: März + April + September = (1<<2)|(1<<3)|(1<<8) = 268
-- ============================================================

USE `dev-gardian`;

-- 1. bloom_months zu gd_default_groups hinzufügen
ALTER TABLE `gd_default_groups`
    ADD COLUMN `bloom_months` INT UNSIGNED NULL
        COMMENT 'Bitmask: Bit 0=Jan ... Bit 11=Dez'
        AFTER `bloom_end`;

-- 2. Bestehende bloom_start/bloom_end in Bitmask umrechnen
UPDATE `gd_default_groups`
SET `bloom_months` = (
    CASE
        WHEN bloom_start IS NOT NULL AND bloom_end IS NOT NULL AND bloom_end >= bloom_start
        THEN ((1 << (bloom_end - bloom_start + 1)) - 1) << (bloom_start - 1)
        WHEN bloom_start IS NOT NULL AND bloom_end IS NOT NULL AND bloom_end < bloom_start
        -- Jahresübergreifend (z.B. Nov–Feb): beide Hälften
        THEN (((1 << (12 - bloom_start + 1)) - 1) << (bloom_start - 1)) |
             ((1 << bloom_end) - 1)
        ELSE NULL
    END
)
WHERE bloom_start IS NOT NULL;

-- 3. bloom_months zu gd_user_groups hinzufügen (User-Override auf Gruppenebene)
ALTER TABLE `gd_user_groups`
    ADD COLUMN `bloom_months` INT UNSIGNED NULL
        COMMENT 'Bitmask: Bit 0=Jan ... Bit 11=Dez. NULL = von Default erben'
        AFTER `bloom_end`;

-- 4. bloom_months zu gd_user_plants hinzufügen (User-Override auf Pflanzenebene)
ALTER TABLE `gd_user_plants`
    ADD COLUMN `bloom_months` INT UNSIGNED NULL
        COMMENT 'Bitmask: Bit 0=Jan ... Bit 11=Dez. NULL = von Gruppe erben'
        AFTER `bloom_end`;

-- 5. Neue Tabelle: Jahresgenaue Blühbeobachtungen
CREATE TABLE IF NOT EXISTS `gd_bloom_observations` (
    `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id`       INT UNSIGNED NOT NULL,
    `plant_id`      INT UNSIGNED NULL COMMENT 'Gesetzt bei Beobachtung auf Pflanzenebene',
    `user_group_id` INT UNSIGNED NULL COMMENT 'Gesetzt bei Beobachtung auf Gruppenebene',
    `year`          SMALLINT UNSIGNED NOT NULL,
    `bloom_months`  INT UNSIGNED NOT NULL COMMENT 'Bitmask: Bit 0=Jan ... Bit 11=Dez',
    `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_observation_plant`  (`user_id`, `plant_id`,      `year`),
    UNIQUE KEY `uq_observation_group`  (`user_id`, `user_group_id`, `year`),
    CONSTRAINT `fk_obs_user`       FOREIGN KEY (`user_id`)       REFERENCES `gd_users`(`id`),
    CONSTRAINT `fk_obs_plant`      FOREIGN KEY (`plant_id`)      REFERENCES `gd_user_plants`(`id`),
    CONSTRAINT `fk_obs_user_group` FOREIGN KEY (`user_group_id`) REFERENCES `gd_user_groups`(`id`)
);

-- ============================================================
-- Fertig.
-- Auflösungsreihenfolge (plant → user_group → default_group):
--   1. gd_bloom_observations WHERE plant_id = ? AND year = ?
--   2. gd_bloom_observations WHERE user_group_id = ? AND year = ?
--   3. gd_user_groups.bloom_months (allgemeiner User-Override)
--   4. gd_default_groups.bloom_months (Admin-Standard)
-- ============================================================