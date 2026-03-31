<?php
/**
 * Gardian – Migration-System
 * GET  → Ausstehende + Historie anzeigen
 * POST → Ausstehende Migrationen ausführen
 */

require_once __DIR__ . '/../src/db.php';
session_start();

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

header('Content-Type: application/json');

// Auth-Check: nur eingeloggte Admins
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Nicht eingeloggt']);
    exit;
}
$stmt = $db->prepare("SELECT role, username FROM gd_users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user || $user['role'] !== 'admin') {
    echo json_encode(['success' => false, 'error' => 'Kein Zugriff']);
    exit;
}

// Tracking-Tabelle sicherstellen
$db->exec("CREATE TABLE IF NOT EXISTS `gd_migrations` (
    `id` int AUTO_INCREMENT PRIMARY KEY,
    `name` varchar(255) NOT NULL UNIQUE,
    `executed_by` varchar(100) NOT NULL,
    `status` enum('success','error') NOT NULL,
    `error_message` text DEFAULT NULL,
    `executed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// ─── MIGRATION DEFINITIONS ───
function getMigrations() {
    return [
        [
            'name' => '001_images_user_group_id',
            'sql'  => "ALTER TABLE gd_images ADD COLUMN user_group_id INT NULL DEFAULT NULL"
        ],
        [
            'name' => '002_images_file_path_gallery',
            'sql'  => "ALTER TABLE gd_images ADD COLUMN file_path_gallery VARCHAR(500) NULL DEFAULT NULL"
        ],
        [
            'name' => '003_plants_marker_icon_color',
            'sql'  => "ALTER TABLE gd_user_plants ADD COLUMN marker_icon_color VARCHAR(7) NULL DEFAULT NULL"
        ],
        [
            'name' => '004_default_groups_marker_icon_color',
            'sql'  => "ALTER TABLE gd_default_groups ADD COLUMN marker_icon_color VARCHAR(7) NULL DEFAULT NULL"
        ],
        [
            'name' => '005_user_groups_marker_icon_color',
            'sql'  => "ALTER TABLE gd_user_groups ADD COLUMN marker_icon_color VARCHAR(7) NULL DEFAULT NULL"
        ],
        [
            'name' => '006_fix_default_images_user_id',
            'sql'  => "UPDATE gd_images SET user_id = NULL WHERE type = 'default'"
        ],
        [
            'name' => '007_create_care_task_types',
            'sql'  => "CREATE TABLE IF NOT EXISTS gd_care_task_types (
                id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL UNIQUE,
                icon VARCHAR(10)  NULL DEFAULT NULL
            )"
        ],
        [
            'name' => '008_create_care_tasks',
            'sql'  => "CREATE TABLE IF NOT EXISTS gd_care_tasks (
                id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id       INT UNSIGNED NOT NULL,
                name          VARCHAR(200) NOT NULL,
                plant_id      INT UNSIGNED NULL,
                user_group_id INT UNSIGNED NULL,
                months        INT UNSIGNED NOT NULL DEFAULT 0,
                notes         TEXT NULL,
                created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )"
        ],
        [
            'name' => '009_care_tasks_task_type_id',
            'sql'  => "ALTER TABLE gd_care_tasks ADD COLUMN task_type_id INT UNSIGNED NULL DEFAULT NULL"
        ],
        [
            'name' => '010_care_tasks_name_nullable',
            'sql'  => "ALTER TABLE gd_care_tasks MODIFY COLUMN name VARCHAR(200) NULL DEFAULT NULL"
        ],
        [
            'name' => '011_create_care_done',
            'sql'  => "CREATE TABLE IF NOT EXISTS gd_care_done (
                id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id  INT UNSIGNED NOT NULL,
                task_id  INT UNSIGNED NOT NULL,
                year     SMALLINT UNSIGNED NOT NULL,
                month    TINYINT UNSIGNED NOT NULL,
                UNIQUE KEY uk_done (user_id, task_id, year, month)
            )"
        ],
        [
            'name' => '012_plants_planned_month_year',
            'sql'  => "ALTER TABLE gd_user_plants ADD COLUMN planned_month_year CHAR(7) NULL DEFAULT NULL COMMENT 'Format YYYY-MM'"
        ],
        [
            'name' => '013_plants_planted_month_year',
            'sql'  => "ALTER TABLE gd_user_plants ADD COLUMN planted_month_year CHAR(7) NULL DEFAULT NULL COMMENT 'Format YYYY-MM'"
        ],
        [
            'name' => '014_plants_removed_month_year',
            'sql'  => "ALTER TABLE gd_user_plants ADD COLUMN removed_month_year CHAR(7) NULL DEFAULT NULL COMMENT 'Format YYYY-MM'"
        ],
        [
            'name' => '015_plants_removed_reason',
            'sql'  => "ALTER TABLE gd_user_plants ADD COLUMN removed_reason ENUM('manuell','selbst') NULL DEFAULT NULL"
        ],
        [
            'name' => '016_create_garden_config',
            'sql'  => "CREATE TABLE IF NOT EXISTS gd_user_garden_config (
                user_id         INT UNSIGNED PRIMARY KEY,
                zoom            DECIMAL(10,2) NULL,
                pan_x           DECIMAL(10,2) NULL,
                pan_y           DECIMAL(10,2) NULL,
                theme           VARCHAR(50)   NULL,
                effects_enabled TINYINT(1)    NOT NULL DEFAULT 0
            )"
        ],
        [
            'name' => '017_garden_config_effects_enabled',
            'sql'  => "ALTER TABLE gd_user_garden_config ADD COLUMN effects_enabled TINYINT(1) NOT NULL DEFAULT 0"
        ],
        [
            'name' => '018_links_sort_order',
            'sql'  => "ALTER TABLE gd_useful_links ADD COLUMN sort_order INT UNSIGNED NOT NULL DEFAULT 0"
        ],
        [
            'name' => '019_type_enum_add_climber_default_groups',
            'sql'  => "ALTER TABLE gd_default_groups MODIFY COLUMN type ENUM('tree','shrub','flower','climber','s_flower') NOT NULL"
        ],
        [
            'name' => '020_type_enum_add_climber_user_groups',
            'sql'  => "ALTER TABLE gd_user_groups MODIFY COLUMN type ENUM('tree','shrub','flower','climber','s_flower') NULL"
        ],
    ];
}

// ─── GET: Status anzeigen ───
if ($method === 'GET') {
    // Datenbankstruktur abfragen
    if (isset($_GET['action']) && $_GET['action'] === 'structure') {
        $dbName = 'dev-gardian';
        $tables = $db->query("
            SELECT TABLE_NAME, TABLE_ROWS
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = '$dbName'
            ORDER BY TABLE_NAME
        ")->fetchAll(PDO::FETCH_ASSOC);

        $structure = [];
        foreach ($tables as $t) {
            $tName = $t['TABLE_NAME'];
            $cols = $db->query("
                SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, EXTRA
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = '$dbName' AND TABLE_NAME = '$tName'
                ORDER BY ORDINAL_POSITION
            ")->fetchAll(PDO::FETCH_ASSOC);
            $structure[] = [
                'name'    => $tName,
                'rows'    => (int)$t['TABLE_ROWS'],
                'columns' => $cols
            ];
        }
        echo json_encode(['success' => true, 'tables' => $structure]);
        exit;
    }

    $executed   = $db->query("SELECT name, executed_by, status, error_message, executed_at FROM gd_migrations ORDER BY executed_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    $migrations = array_map(fn($m) => $m['name'], getMigrations());
    $successNames = array_column(array_filter($executed, fn($r) => $r['status'] === 'success'), 'name');
    $pending = array_values(array_diff($migrations, $successNames));
    echo json_encode(['success' => true, 'history' => $executed, 'pending' => $pending]);
    exit;
}

// ─── POST: Migrationen ausführen ───
if ($method === 'POST') {
    $migrations  = getMigrations();
    $alreadyDone = $db->query("SELECT name FROM gd_migrations WHERE status = 'success'")->fetchAll(PDO::FETCH_COLUMN);
    $username    = $user['username'];

    $results = [];
    foreach ($migrations as $migration) {
        if (in_array($migration['name'], $alreadyDone)) {
            $results[] = ['name' => $migration['name'], 'status' => 'skipped'];
            continue;
        }

        try {
            $db->exec($migration['sql']);
            $ins = $db->prepare("INSERT INTO gd_migrations (name, executed_by, status) VALUES (?, ?, 'success')
                                 ON DUPLICATE KEY UPDATE status = 'success', error_message = NULL, executed_by = ?, executed_at = NOW()");
            $ins->execute([$migration['name'], $username, $username]);
            $results[] = ['name' => $migration['name'], 'status' => 'success'];
        } catch (Exception $e) {
            // "Column already exists" / "Duplicate column" = Spalte war schon da → als Erfolg werten
            if (str_contains($e->getMessage(), 'Duplicate column') || str_contains($e->getMessage(), 'already exists')) {
                $ins = $db->prepare("INSERT INTO gd_migrations (name, executed_by, status) VALUES (?, ?, 'success')
                                     ON DUPLICATE KEY UPDATE status = 'success', error_message = NULL, executed_by = ?, executed_at = NOW()");
                $ins->execute([$migration['name'], $username, $username]);
                $results[] = ['name' => $migration['name'], 'status' => 'success'];
            } else {
                $ins = $db->prepare("INSERT INTO gd_migrations (name, executed_by, status, error_message) VALUES (?, ?, 'error', ?)
                                     ON DUPLICATE KEY UPDATE status = 'error', error_message = ?, executed_by = ?, executed_at = NOW()");
                $ins->execute([$migration['name'], $username, $e->getMessage(), $e->getMessage(), $username]);
                $results[] = ['name' => $migration['name'], 'status' => 'error', 'error' => $e->getMessage()];
            }
        }
    }
    echo json_encode(['success' => true, 'results' => $results]);
    exit;
}
