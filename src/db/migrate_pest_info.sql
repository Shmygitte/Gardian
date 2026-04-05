-- Migration: gd_default_pest_info
-- KI-generierte Schädlings- und Pflegeinfos pro Pflanze und Monat (read-only)

CREATE TABLE IF NOT EXISTS gd_default_pest_info (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id    INT UNSIGNED NOT NULL,
    monat       TINYINT UNSIGNED NOT NULL COMMENT '1-12',
    pflegetipps TEXT NULL,
    schaedlinge TEXT NULL,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_group_monat (group_id, monat),
    CONSTRAINT fk_pest_group FOREIGN KEY (group_id) REFERENCES gd_default_groups(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
