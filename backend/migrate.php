<?php
/**
 * Gardian – Schema-Migrationen
 * Einmalig ausführen wenn sich das DB-Schema ändert.
 * Aufruf: php backend/migrate.php  ODER  über den Browser
 */

require_once __DIR__ . '/../src/db.php';
$db = getDB();

$migrations = [
    "ALTER TABLE gd_images ADD COLUMN user_group_id INT NULL DEFAULT NULL",
    "ALTER TABLE gd_images ADD COLUMN file_path_gallery VARCHAR(500) NULL DEFAULT NULL",
    "ALTER TABLE gd_user_plants ADD COLUMN marker_icon_color VARCHAR(7) NULL DEFAULT NULL",
    "ALTER TABLE gd_default_groups ADD COLUMN marker_icon_color VARCHAR(7) NULL DEFAULT NULL",
    "ALTER TABLE gd_user_groups ADD COLUMN marker_icon_color VARCHAR(7) NULL DEFAULT NULL",

    "UPDATE gd_images SET user_id = NULL WHERE type = 'default'",

    "CREATE TABLE IF NOT EXISTS gd_care_task_types (
        id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        icon VARCHAR(10)  NULL DEFAULT NULL
    )",

    "CREATE TABLE IF NOT EXISTS gd_care_tasks (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id       INT UNSIGNED NOT NULL,
        name          VARCHAR(200) NOT NULL,
        plant_id      INT UNSIGNED NULL,
        user_group_id INT UNSIGNED NULL,
        months        INT UNSIGNED NOT NULL DEFAULT 0,
        notes         TEXT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )",
    "ALTER TABLE gd_care_tasks ADD COLUMN task_type_id INT UNSIGNED NULL DEFAULT NULL",
    "ALTER TABLE gd_care_tasks MODIFY COLUMN name VARCHAR(200) NULL DEFAULT NULL",

    "CREATE TABLE IF NOT EXISTS gd_care_done (
        id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id  INT UNSIGNED NOT NULL,
        task_id  INT UNSIGNED NOT NULL,
        year     SMALLINT UNSIGNED NOT NULL,
        month    TINYINT UNSIGNED NOT NULL,
        UNIQUE KEY uk_done (user_id, task_id, year, month)
    )",

    "ALTER TABLE gd_user_plants ADD COLUMN planned_month_year CHAR(7) NULL DEFAULT NULL COMMENT 'Format YYYY-MM'",
    "ALTER TABLE gd_user_plants ADD COLUMN planted_month_year CHAR(7) NULL DEFAULT NULL COMMENT 'Format YYYY-MM'",
    "ALTER TABLE gd_user_plants ADD COLUMN removed_month_year CHAR(7) NULL DEFAULT NULL COMMENT 'Format YYYY-MM'",
    "ALTER TABLE gd_user_plants ADD COLUMN removed_reason ENUM('manuell','selbst') NULL DEFAULT NULL",

    "CREATE TABLE IF NOT EXISTS gd_user_garden_config (
        user_id         INT UNSIGNED PRIMARY KEY,
        zoom            DECIMAL(10,2) NULL,
        pan_x           DECIMAL(10,2) NULL,
        pan_y           DECIMAL(10,2) NULL,
        theme           VARCHAR(50)   NULL,
        effects_enabled TINYINT(1)    NOT NULL DEFAULT 0
    )",
    "ALTER TABLE gd_user_garden_config ADD COLUMN effects_enabled TINYINT(1) NOT NULL DEFAULT 0",

    "ALTER TABLE gd_useful_links ADD COLUMN sort_order INT UNSIGNED NOT NULL DEFAULT 0",
];

$ok = 0;
$skipped = 0;
foreach ($migrations as $sql) {
    try {
        $db->exec($sql);
        $ok++;
    } catch (PDOException $e) {
        $skipped++;
    }
}

$msg = "Migrationen: $ok ausgeführt, $skipped übersprungen (bereits vorhanden).";
if (php_sapi_name() === 'cli') {
    echo $msg . "\n";
} else {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => $msg]);
}
