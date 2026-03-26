<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

session_start();
require_once __DIR__ . '/../src/db.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? $_POST['action'] ?? $_GET['action'] ?? null;
$db = getDB();

// Schema-Migration: user_group_id in gd_images (einmalig)
try { $db->exec("ALTER TABLE gd_images ADD COLUMN user_group_id INT NULL DEFAULT NULL"); } catch (PDOException $e) {}
// Schema-Migration: Aufgaben-Typen (einmalig)
try { $db->exec("CREATE TABLE IF NOT EXISTS gd_care_task_types (
    id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    icon VARCHAR(10)  NULL DEFAULT NULL
)"); } catch (PDOException $e) {}
// Schema-Migration: Pflegekalender-Tabellen (einmalig)
try { $db->exec("CREATE TABLE IF NOT EXISTS gd_care_tasks (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NOT NULL,
    name          VARCHAR(200) NOT NULL,
    plant_id      INT UNSIGNED NULL,
    user_group_id INT UNSIGNED NULL,
    months        INT UNSIGNED NOT NULL DEFAULT 0,
    notes         TEXT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)"); } catch (PDOException $e) {}
try { $db->exec("ALTER TABLE gd_care_tasks ADD COLUMN task_type_id INT UNSIGNED NULL DEFAULT NULL"); } catch (PDOException $e) {}
try { $db->exec("ALTER TABLE gd_care_tasks MODIFY COLUMN name VARCHAR(200) NULL DEFAULT NULL"); } catch (PDOException $e) {}
try { $db->exec("CREATE TABLE IF NOT EXISTS gd_care_done (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id  INT UNSIGNED NOT NULL,
    task_id  INT UNSIGNED NOT NULL,
    year     SMALLINT UNSIGNED NOT NULL,
    month    TINYINT UNSIGNED NOT NULL,
    UNIQUE KEY uk_done (user_id, task_id, year, month)
)"); } catch (PDOException $e) {}
// Schema-Migration: planted_month_year in gd_user_plants (einmalig)
try { $db->exec("ALTER TABLE gd_user_plants ADD COLUMN planted_month_year CHAR(7) NULL DEFAULT NULL COMMENT 'Format YYYY-MM'"); } catch (PDOException $e) {}
// Schema-Migration: removed_month_year + removed_reason in gd_user_plants (einmalig)
try { $db->exec("ALTER TABLE gd_user_plants ADD COLUMN removed_month_year CHAR(7) NULL DEFAULT NULL COMMENT 'Format YYYY-MM'"); } catch (PDOException $e) {}
try { $db->exec("ALTER TABLE gd_user_plants ADD COLUMN removed_reason ENUM('manuell','selbst') NULL DEFAULT NULL"); } catch (PDOException $e) {}

// =========================
// PROTECTION
// =========================
if (!in_array($action, ['login', 'register'])) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false]);
        exit;
    }
}

function requireAdmin($db, $userId) {
    $stmt = $db->prepare("SELECT role FROM gd_users WHERE id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || $row['role'] !== 'admin') {
        echo json_encode(['success' => false, 'error' => 'Kein Zugriff']);
        exit;
    }
}

// =========================
// LOGOUT
// =========================
if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

// =========================
// REGISTER
// =========================
if ($action === 'register') {
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (!$username || !$password) {
        echo json_encode(['success' => false]);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    try {
        $stmt = $db->prepare("
            INSERT INTO gd_users (username, email, password_hash)
            VALUES (?, ?, ?)
        ");
        $email = $data['email'] ?? $username . '@gardian.local';
        $stmt->execute([$username, $email, $hash]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// LOGIN
// =========================
if ($action === 'login') {
    $stmt = $db->prepare("
        SELECT * FROM gd_users WHERE username = ?
    ");
    $stmt->execute([$data['username']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($data['password'], $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $db->prepare("UPDATE gd_users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);
        echo json_encode(['success' => true, 'avatar' => $user['avatar_path'], 'role' => $user['role']]);
    } else {
        echo json_encode(['success' => false]);
    }
    exit;
}

// =========================
// GET PINS (Map Markers)
// =========================
if ($action === 'getPins') {
    try {
        $stmt = $db->prepare("
            SELECT
                p.id,
                p.pos_x,
                p.pos_y,
                p.name as plant_name,
                COALESCE(ug_direct.name, dg.name) as name,
                COALESCE(ug_direct.type, ug.type, dg.type) as type,
                COALESCE(p.marker_color, ug_direct.marker_color, ug.marker_color, dg.marker_color) as marker_color,
                COALESCE(p.marker_icon, ug_direct.marker_icon, ug.marker_icon, dg.marker_icon) as marker_icon,
                COALESCE(p.evergreen, ug_direct.evergreen, ug.evergreen, dg.evergreen) as evergreen,
                COALESCE(p.bloom_months, ug_direct.bloom_months, ug.bloom_months, dg.bloom_months) as bloom_months_resolved,
                p.group_id,
                p.user_group_id
            FROM gd_user_plants p
            LEFT JOIN gd_default_groups dg ON p.group_id = dg.id
            LEFT JOIN gd_user_groups ug ON p.group_id = ug.group_id AND p.user_id = ug.user_id
            LEFT JOIN gd_user_groups ug_direct ON p.user_group_id = ug_direct.id
            WHERE p.user_id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $pins = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'pins' => $pins]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// GET PLANT DETAILS
// =========================
if ($action === 'getPlantDetails') {
    $plantId = $data['id'] ?? null;
    if (!$plantId) {
        echo json_encode(['success' => false, 'message' => 'Missing ID']);
        exit;
    }
    
    try {
        $stmt = $db->prepare("
            SELECT 
                p.*,
                COALESCE(p.name, ug.group_name, dg.group_name) as name,
                COALESCE(p.type, ug.type, dg.type) as type,
                COALESCE(p.bloom_history, ug.bloom_months, dg.bloom_months) as bloom_months,
                COALESCE(p.is_evergreen, ug.is_evergreen, dg.is_evergreen) as is_evergreen,
                COALESCE(p.fact_sheet_details, ug.fact_sheet_details, dg.fact_sheet_details) as fact_sheet
            FROM gd_user_plants p
            JOIN gd_default_groups dg ON p.group_id = dg.id
            LEFT JOIN gd_user_groups ug ON p.group_id = ug.group_id AND p.user_id = ug.user_id
            WHERE p.id = ? AND p.user_id = ?
        ");
        $stmt->execute([$plantId, $_SESSION['user_id']]);
        $plant = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($plant) {
            $plant['fact_sheet'] = json_decode($plant['fact_sheet'], true);
            echo json_encode(['success' => true, 'plant' => $plant]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Plant not found']);
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// GET AVATAR
// =========================
if ($action === 'getAvatar') {
    $stmt = $db->prepare("SELECT avatar_path, role FROM gd_users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'avatar' => $row['avatar_path'], 'role' => $row['role']]);
    exit;
}

// =========================
// GET USER PROFILE
// =========================
if ($action === 'getUser') {
    $stmt = $db->prepare("SELECT username, email, avatar_path FROM gd_users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'user' => $row]);
    exit;
}

// =========================
// UPDATE USER PROFILE
// =========================
if ($action === 'updateUser') {
    $email    = trim($data['email']    ?? '');
    $password = trim($data['password'] ?? '');
    if ($email) {
        $db->prepare("UPDATE gd_users SET email = ? WHERE id = ?")
           ->execute([$email, $_SESSION['user_id']]);
    }
    if ($password) {
        $db->prepare("UPDATE gd_users SET password_hash = ? WHERE id = ?")
           ->execute([password_hash($password, PASSWORD_DEFAULT), $_SESSION['user_id']]);
    }
    echo json_encode(['success' => true]);
    exit;
}

// =========================
// UPLOAD AVATAR
// =========================
if ($action === 'uploadAvatar') {
    if (!isset($_FILES['avatar'])) {
        echo json_encode(['success' => false, 'message' => 'Keine Datei']);
        exit;
    }
    $file      = $_FILES['avatar'];
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed   = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($extension, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Ungültiges Dateiformat']);
        exit;
    }
    $targetDir = __DIR__ . '/../assets/avatars/';
    if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);

    $filename   = 'user_' . $_SESSION['user_id'] . '.' . $extension;
    $targetPath = $targetDir . $filename;
    $dbPath     = 'assets/avatars/' . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        $stmt = $db->prepare("UPDATE gd_users SET avatar_path = ? WHERE id = ?");
        $stmt->execute([$dbPath, $_SESSION['user_id']]);
        echo json_encode(['success' => true, 'avatar' => $dbPath]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Upload fehlgeschlagen']);
    }
    exit;
}

// =========================
// GET PLANTS LIST (Pflanzen-View)
// =========================
if ($action === 'getPlantsList') {
    try {
        // User-Gruppen laden (inkl. Default-Gruppen-Name als Fallback)
        $stmt = $db->prepare("
            SELECT
                ug.id,
                COALESCE(ug.name, dg.name) AS name,
                ug.group_id,
                ug.type, ug.bloom_months,
                COALESCE(ug.bloom_months, dg.bloom_months) AS bloom_months_resolved,
                ug.marker_icon, ug.marker_color, ug.marker_size,
                ug.height, ug.location, ug.spacing,
                ug.care, ug.water, ug.hardy, ug.scented,
                ug.cutflower, ug.lifespan, ug.features, ug.evergreen
            FROM gd_user_groups ug
            LEFT JOIN gd_default_groups dg ON ug.group_id = dg.id
            WHERE ug.user_id = ?
            ORDER BY name
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Pflanzen je Gruppe laden (Standard-Gruppen via group_id, eigene via user_group_id)
        $stmtPlants = $db->prepare("
            SELECT
                p.id, p.name as plant_name, p.group_id, p.user_group_id, p.pos_x, p.pos_y,
                p.bloom_months,
                p.marker_icon, p.marker_color, p.marker_size,
                p.height, p.location, p.spacing,
                p.care, p.water, p.hardy, p.scented,
                p.cutflower, p.lifespan, p.features, p.evergreen,
                p.planted_month_year,
                p.removed_month_year, p.removed_reason,
                p.created_at
            FROM gd_user_plants p
            WHERE p.user_id = ? AND (p.group_id = ? OR p.user_group_id = ?)
        ");

        foreach ($groups as &$group) {
            $stmtPlants->execute([$_SESSION['user_id'], $group['group_id'] ?? 0, $group['id']]);
            $group['plants'] = $stmtPlants->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode(['success' => true, 'groups' => $groups]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// GET ALL BLOOM OBSERVATIONS (für Karten-Slider)
// =========================
if ($action === 'getAllBloomObservations') {
    try {
        $stmt = $db->prepare("
            SELECT bo.plant_id, bo.user_group_id, ug.group_id, bo.year, bo.bloom_months
            FROM gd_bloom_observations bo
            LEFT JOIN gd_user_groups ug ON bo.user_group_id = ug.id
            WHERE bo.user_id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
        echo json_encode(['success' => true, 'observations' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// GET BLOOM OBSERVATIONS
// =========================
if ($action === 'getBloomObservations') {
    $plantId     = $data['plant_id']      ?? null;
    $userGroupId = $data['user_group_id'] ?? null;
    if (!$plantId && !$userGroupId) { echo json_encode(['success' => false, 'error' => 'Fehlende ID']); exit; }
    try {
        if ($plantId) {
            $stmt = $db->prepare("SELECT year, bloom_months FROM gd_bloom_observations WHERE user_id = ? AND plant_id = ? ORDER BY year DESC");
            $stmt->execute([$_SESSION['user_id'], $plantId]);
        } else {
            $stmt = $db->prepare("SELECT year, bloom_months FROM gd_bloom_observations WHERE user_id = ? AND user_group_id = ? ORDER BY year DESC");
            $stmt->execute([$_SESSION['user_id'], $userGroupId]);
        }
        echo json_encode(['success' => true, 'observations' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// SAVE BLOOM OBSERVATION
// =========================
if ($action === 'saveBloomObservation') {
    $plantId     = $data['plant_id']      ?? null;
    $userGroupId = $data['user_group_id'] ?? null;
    $year        = (int)($data['year']        ?? 0);
    $bloomMonths = (int)($data['bloom_months'] ?? 0);
    if ((!$plantId && !$userGroupId) || !$year) { echo json_encode(['success' => false, 'error' => 'Fehlende Parameter']); exit; }
    try {
        if ($plantId) {
            $db->prepare("INSERT INTO gd_bloom_observations (user_id, plant_id, year, bloom_months)
                          VALUES (?, ?, ?, ?)
                          ON DUPLICATE KEY UPDATE bloom_months = VALUES(bloom_months)")
               ->execute([$_SESSION['user_id'], $plantId, $year, $bloomMonths]);
        } else {
            $db->prepare("INSERT INTO gd_bloom_observations (user_id, user_group_id, year, bloom_months)
                          VALUES (?, ?, ?, ?)
                          ON DUPLICATE KEY UPDATE bloom_months = VALUES(bloom_months)")
               ->execute([$_SESSION['user_id'], $userGroupId, $year, $bloomMonths]);
        }
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// GET DEFAULT GROUPS (Pflanzenwahl-Modal)
// =========================
if ($action === 'getGroups') {
    try {
        // Standard-Gruppen vom Admin
        $stmt = $db->prepare("SELECT id, name, type, marker_icon, marker_color, 'default' AS source FROM gd_default_groups ORDER BY name");
        $stmt->execute();
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Eigene User-Gruppen (ohne Default-Backing)
        $stmtUser = $db->prepare("SELECT id, name, type, marker_icon, marker_color, 'user' AS source FROM gd_user_groups WHERE user_id = ? AND group_id IS NULL ORDER BY name");
        $stmtUser->execute([$_SESSION['user_id']]);
        $userGroups = $stmtUser->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'groups' => array_merge($groups, $userGroups)]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// CREATE USER GROUP
// =========================
if ($action === 'createUserGroup') {
    $name = trim($data['name'] ?? '');
    if (!$name) {
        echo json_encode(['success' => false, 'error' => 'Name erforderlich']);
        exit;
    }
    $fields = ['name','group_id','type','bloom_months','marker_icon','marker_color','marker_size','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
    $vals   = array_map(fn($f) => ($data[$f] ?? null) !== '' ? ($data[$f] ?? null) : null, $fields);
    $cols   = implode(',', $fields);
    $ph     = implode(',', array_fill(0, count($fields), '?'));
    try {
        $db->prepare("INSERT INTO gd_user_groups (user_id, $cols) VALUES (?, $ph)")->execute(array_merge([$_SESSION['user_id']], $vals));
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// ADD PLANT
// =========================
if ($action === 'addPlant') {
    $groupId     = $data['group_id']      ?? null;
    $userGroupId = $data['user_group_id'] ?? null;
    $posX        = $data['pos_x']         ?? null;
    $posY        = $data['pos_y']         ?? null;

    if ((!$groupId && !$userGroupId) || $posX === null || $posY === null) {
        echo json_encode(['success' => false, 'error' => 'Fehlende Parameter']);
        exit;
    }
    try {
        if ($userGroupId) {
            // Eigene User-Gruppe — direkt speichern
            $stmt = $db->prepare("INSERT INTO gd_user_plants (user_id, user_group_id, pos_x, pos_y) VALUES (?, ?, ?, ?)");
            $stmt->execute([$_SESSION['user_id'], $userGroupId, $posX, $posY]);
        } else {
            // Standard-Gruppe — User-Gruppe anlegen falls noch nicht vorhanden
            $check = $db->prepare("SELECT id FROM gd_user_groups WHERE user_id = ? AND group_id = ?");
            $check->execute([$_SESSION['user_id'], $groupId]);
            if (!$check->fetch()) {
                $ins = $db->prepare("INSERT INTO gd_user_groups (user_id, group_id) VALUES (?, ?)");
                $ins->execute([$_SESSION['user_id'], $groupId]);
            }
            $stmt = $db->prepare("INSERT INTO gd_user_plants (user_id, group_id, pos_x, pos_y) VALUES (?, ?, ?, ?)");
            $stmt->execute([$_SESSION['user_id'], $groupId, $posX, $posY]);
        }
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// UPDATE USER GROUP
// =========================
if ($action === 'updateUserGroup') {
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false, 'error' => 'ID fehlt']); exit; }
    $allowed = ['name','type','bloom_months','marker_icon','marker_color','marker_size','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
    $sets = []; $vals = [];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $data)) {
            $sets[] = "$f = ?";
            $vals[] = ($data[$f] !== '' && $data[$f] !== null) ? $data[$f] : null;
        }
    }
    if (!$sets) { echo json_encode(['success' => true]); exit; }
    $vals[] = $_SESSION['user_id'];
    $vals[] = $id;
    try {
        $db->prepare("UPDATE gd_user_groups SET " . implode(', ', $sets) . " WHERE user_id = ? AND id = ?")->execute($vals);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// UPDATE PLANT
// =========================
if ($action === 'updatePlant') {
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false, 'error' => 'ID fehlt']); exit; }
    $allowed = ['name','marker_color','marker_size','marker_icon','bloom_months','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen','pos_x','pos_y','planted_month_year','removed_month_year','removed_reason'];
    $sets = []; $vals = [];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $data)) {
            $sets[] = "$f = ?";
            $vals[] = ($data[$f] !== '' && $data[$f] !== null) ? $data[$f] : null;
        }
    }
    if (!$sets) { echo json_encode(['success' => false, 'error' => 'Keine Felder']); exit; }
    $vals[] = $_SESSION['user_id'];
    $vals[] = $id;
    try {
        $db->prepare("UPDATE gd_user_plants SET " . implode(', ', $sets) . " WHERE user_id = ? AND id = ?")->execute($vals);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// MOVE PLANT
// =========================
if ($action === 'movePlant') {
    $plantId = $data['id']    ?? null;
    $posX    = $data['pos_x'] ?? null;
    $posY    = $data['pos_y'] ?? null;
    if (!$plantId || $posX === null || $posY === null) {
        echo json_encode(['success' => false, 'error' => 'Fehlende Parameter']);
        exit;
    }
    try {
        $stmt = $db->prepare("UPDATE gd_user_plants SET pos_x = ?, pos_y = ? WHERE id = ? AND user_id = ?");
        $stmt->execute([$posX, $posY, $plantId, $_SESSION['user_id']]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// DUPLICATE PLANT
// =========================
if ($action === 'duplicatePlant') {
    $plantId = $data['id'] ?? null;
    if (!$plantId) {
        echo json_encode(['success' => false, 'error' => 'Fehlende ID']);
        exit;
    }
    try {
        $stmt = $db->prepare("SELECT * FROM gd_user_plants WHERE id = ? AND user_id = ?");
        $stmt->execute([$plantId, $_SESSION['user_id']]);
        $plant = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$plant) {
            echo json_encode(['success' => false, 'error' => 'Pflanze nicht gefunden']);
            exit;
        }
        $newX = min(100, $plant['pos_x'] + 3);
        $newY = min(100, $plant['pos_y'] + 3);
        $stmt = $db->prepare("INSERT INTO gd_user_plants (user_id, group_id, pos_x, pos_y, bloom_start, bloom_end, marker_icon, marker_color, marker_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$_SESSION['user_id'], $plant['group_id'], $newX, $newY, $plant['bloom_start'], $plant['bloom_end'], $plant['marker_icon'], $plant['marker_color'], $plant['marker_size']]);
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// GET GARDEN CONFIG
// =========================
if ($action === 'getGardenConfig') {
    try {
        $stmt = $db->prepare("SELECT * FROM gd_user_garden_config WHERE user_id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $config = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'config' => $config]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// SAVE GARDEN CONFIG
// =========================
if ($action === 'saveGardenConfig') {
    $fields = ['zoom', 'pan_x', 'pan_y', 'theme'];
    $sets   = []; $vals = [];
    foreach ($fields as $f) {
        if (array_key_exists($f, $data)) { $sets[] = $f; $vals[] = $data[$f]; }
    }
    if (!$sets) { echo json_encode(['success' => true]); exit; }
    $cols    = implode(', ', $sets);
    $placeholders = implode(', ', array_fill(0, count($sets), '?'));
    $updates = implode(', ', array_map(fn($f) => "$f = VALUES($f)", $sets));
    try {
        $db->prepare("INSERT INTO gd_user_garden_config (user_id, $cols) VALUES (?, $placeholders)
                      ON DUPLICATE KEY UPDATE $updates")
           ->execute(array_merge([$_SESSION['user_id']], $vals));
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// UPLOAD GARDEN PLAN
// =========================
if ($action === 'uploadGardenPlan') {
    if (!isset($_FILES['map'])) {
        echo json_encode(['success' => false, 'message' => 'No file uploaded']);
        exit;
    }

    $userId = $_SESSION['user_id'];
    $file = $_FILES['map'];
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $targetDir = __DIR__ . '/../assets/maps/';
    if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);

    $filename = "user_" . $userId . "_" . time() . "." . $extension;
    $targetPath = $targetDir . $filename;
    $dbPath = "assets/maps/" . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        try {
            $stmt = $db->prepare("
                INSERT INTO gd_user_garden_config (user_id, map_image_path) 
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE map_image_path = ?
            ");
            $stmt->execute([$userId, $dbPath, $dbPath]);
            echo json_encode(['success' => true, 'url' => $dbPath]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to move file']);
    }
    exit;
}

// =========================
// UPLOAD IMAGE
// =========================
if ($action === 'uploadImage') {
    $type        = $_POST['type']          ?? null; // 'default', 'group', 'plant'
    $groupId     = $_POST['group_id']      ?? null;
    $plantId     = $_POST['plant_id']      ?? null;
    $userGroupId = $_POST['user_group_id'] ?? null;
    if (!$type || !isset($_FILES['image'])) {
        echo json_encode(['success' => false, 'error' => 'Parameter fehlen']); exit;
    }
    if ($type === 'default') requireAdmin($db, $_SESSION['user_id']);
    $file = $_FILES['image'];
    $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg','jpeg','png','webp','gif'])) {
        echo json_encode(['success' => false, 'error' => 'Ungültiges Dateiformat']); exit;
    }
    $dir = __DIR__ . '/../assets/images/';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $filename = 'img_' . $_SESSION['user_id'] . '_' . time() . '.' . $ext;
    $path     = $dir . $filename;
    $dbPath   = 'assets/images/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $path)) {
        echo json_encode(['success' => false, 'error' => 'Upload fehlgeschlagen']); exit;
    }
    try {
        $db->prepare("INSERT INTO gd_images (type, group_id, plant_id, user_group_id, user_id, file_path, is_primary)
                      VALUES (?, ?, ?, ?, ?, ?, 0)")
           ->execute([$type, $groupId ?: null, $plantId ?: null, $userGroupId ?: null, $_SESSION['user_id'], $dbPath]);
        echo json_encode(['success' => true, 'path' => $dbPath, 'id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// GET IMAGES
// =========================
if ($action === 'getImages') {
    $type    = $data['type']     ?? null;
    $groupId = $data['group_id'] ?? null;
    $plantId = $data['plant_id'] ?? null;
    try {
        if ($type === 'plant' && $plantId) {
            $stmt = $db->prepare("SELECT * FROM gd_images WHERE type='plant' AND plant_id=? ORDER BY is_primary DESC, uploaded_at DESC");
            $stmt->execute([$plantId]);
        } elseif ($type === 'group' && $groupId) {
            // User-Gruppe zuerst, dann Default
            $stmt = $db->prepare("SELECT * FROM gd_images WHERE (type='group' AND group_id=? AND user_id=?) OR (type='default' AND group_id=?) ORDER BY type ASC, is_primary DESC, uploaded_at DESC");
            $stmt->execute([$groupId, $_SESSION['user_id'], $groupId]);
        } elseif ($type === 'default' && $groupId) {
            $stmt = $db->prepare("SELECT * FROM gd_images WHERE type='default' AND group_id=? ORDER BY is_primary DESC, uploaded_at DESC");
            $stmt->execute([$groupId]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Parameter fehlen']); exit;
        }
        echo json_encode(['success' => true, 'images' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// DELETE IMAGE
// =========================
if ($action === 'deleteImage') {
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false, 'error' => 'ID fehlt']); exit; }
    try {
        $stmt = $db->prepare("SELECT * FROM gd_images WHERE id=?");
        $stmt->execute([$id]);
        $img = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$img) { echo json_encode(['success' => false, 'error' => 'Nicht gefunden']); exit; }
        // Nur eigene Bilder oder Admin
        if ($img['user_id'] != $_SESSION['user_id']) requireAdmin($db, $_SESSION['user_id']);
        $db->prepare("DELETE FROM gd_images WHERE id=?")->execute([$id]);
        $filePath = __DIR__ . '/../' . $img['file_path'];
        if (file_exists($filePath)) unlink($filePath);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// GET IMAGES FOR PIN (Hover)
// =========================
if ($action === 'getImagesForPin') {
    $plantId = $data['plant_id'] ?? null;
    $groupId = $data['group_id'] ?? null;   // default_group_id
    if (!$plantId) { echo json_encode(['success' => false, 'error' => 'Parameter fehlen']); exit; }
    try {
        // Pflanze zuerst, dann User-Gruppe, dann Default
        $stmt = $db->prepare("
            (SELECT file_path, is_primary, 'plant' as src FROM gd_images WHERE type='plant' AND plant_id=? AND user_id=?)
            UNION ALL
            (SELECT file_path, is_primary, 'group' as src FROM gd_images WHERE type='group' AND group_id=? AND user_id=?)
            UNION ALL
            (SELECT file_path, is_primary, 'default' as src FROM gd_images WHERE type='default' AND group_id=?)
            ORDER BY FIELD(src,'plant','group','default'), is_primary DESC
            LIMIT 5
        ");
        $stmt->execute([$plantId, $_SESSION['user_id'], $groupId, $_SESSION['user_id'], $groupId]);
        echo json_encode(['success' => true, 'images' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// ADMIN: GET USERS
// =========================
if ($action === 'adminGetUsers') {
    requireAdmin($db, $_SESSION['user_id']);
    $stmt = $db->query("SELECT id, username, email, role, last_login, created_at FROM gd_users ORDER BY created_at DESC");
    echo json_encode(['success' => true, 'users' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

// =========================
// ADMIN: UPDATE USER ROLE
// =========================
if ($action === 'adminUpdateRole') {
    requireAdmin($db, $_SESSION['user_id']);
    $userId = $data['id']   ?? null;
    $role   = $data['role'] ?? null;
    if (!$userId || !in_array($role, ['user', 'admin'])) {
        echo json_encode(['success' => false, 'error' => 'Ungültige Parameter']);
        exit;
    }
    $db->prepare("UPDATE gd_users SET role = ? WHERE id = ?")->execute([$role, $userId]);
    echo json_encode(['success' => true]);
    exit;
}

// =========================
// ADMIN: DELETE USER
// =========================
if ($action === 'adminDeleteUser') {
    requireAdmin($db, $_SESSION['user_id']);
    $userId = $data['id'] ?? null;
    if (!$userId || $userId == $_SESSION['user_id']) {
        echo json_encode(['success' => false, 'error' => 'Ungültig oder eigener Account']);
        exit;
    }
    $db->prepare("DELETE FROM gd_users WHERE id = ?")->execute([$userId]);
    echo json_encode(['success' => true]);
    exit;
}

// =========================
// ADMIN: GET DEFAULT GROUPS
// =========================
if ($action === 'adminGetGroups') {
    requireAdmin($db, $_SESSION['user_id']);
    $stmt = $db->query("SELECT * FROM gd_default_groups ORDER BY name");
    echo json_encode(['success' => true, 'groups' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

// =========================
// ADMIN: ADD DEFAULT GROUP
// =========================
if ($action === 'adminAddGroup') {
    requireAdmin($db, $_SESSION['user_id']);
    $name = trim($data['name'] ?? '');
    $type = $data['type'] ?? null;
    if (!$name || !in_array($type, ['tree','shrub','flower','s_flower'])) {
        echo json_encode(['success' => false, 'error' => 'Name und Typ erforderlich']);
        exit;
    }
    $fields = ['name','type','bloom_months','marker_icon','marker_color','marker_size','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
    $vals = array_map(fn($f) => $data[$f] ?? null, $fields);
    $placeholders = implode(',', array_fill(0, count($fields), '?'));
    $cols = implode(',', $fields);
    $db->prepare("INSERT INTO gd_default_groups ($cols) VALUES ($placeholders)")->execute($vals);
    echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
    exit;
}

// =========================
// ADMIN: UPDATE DEFAULT GROUP
// =========================
if ($action === 'adminUpdateGroup') {
    requireAdmin($db, $_SESSION['user_id']);
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false]); exit; }
    $fields = ['name','type','bloom_months','marker_icon','marker_color','marker_size','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
    $set  = implode(',', array_map(fn($f) => "$f=?", $fields));
    $vals = array_map(fn($f) => $data[$f] ?? null, $fields);
    $vals[] = $id;
    $db->prepare("UPDATE gd_default_groups SET $set WHERE id=?")->execute($vals);
    echo json_encode(['success' => true]);
    exit;
}

// =========================
// ADMIN: DELETE DEFAULT GROUP
// =========================
if ($action === 'adminDeleteGroup') {
    requireAdmin($db, $_SESSION['user_id']);
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false]); exit; }
    $db->prepare("DELETE FROM gd_default_groups WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

// =========================
// CLEANUP ORPHANED IMAGES
// =========================
if ($action === 'cleanupImages') {
    $deleted = 0;

    // 1. Verwaiste Pflanzenbilder (plant_id existiert nicht mehr)
    $stmt = $db->prepare("
        SELECT i.id, i.file_path FROM gd_images i
        LEFT JOIN gd_user_plants p ON i.plant_id = p.id
        WHERE i.user_id = ? AND i.plant_id IS NOT NULL AND p.id IS NULL
    ");
    $stmt->execute([$_SESSION['user_id']]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $img) {
        $path = __DIR__ . '/../' . $img['file_path'];
        if (file_exists($path)) unlink($path);
        $db->prepare("DELETE FROM gd_images WHERE id = ?")->execute([$img['id']]);
        $deleted++;
    }

    // 2. Gruppenbilder ohne Zuordnung (type='group', group_id NULL, user_group_id NULL)
    $stmt = $db->prepare("
        SELECT id, file_path FROM gd_images
        WHERE user_id = ? AND type = 'group' AND group_id IS NULL AND user_group_id IS NULL AND plant_id IS NULL
    ");
    $stmt->execute([$_SESSION['user_id']]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $img) {
        $path = __DIR__ . '/../' . $img['file_path'];
        if (file_exists($path)) unlink($path);
        $db->prepare("DELETE FROM gd_images WHERE id = ?")->execute([$img['id']]);
        $deleted++;
    }

    echo json_encode(['success' => true, 'deleted' => $deleted]);
    exit;
}

// =========================
// GET ALL IMAGES (Galerie)
// =========================
if ($action === 'getAllImages') {
    try {
        $stmt = $db->prepare("
            SELECT
                i.id, i.file_path, i.type, i.plant_id, i.group_id,
                p.user_group_id AS plant_user_group_id,
                p.group_id      AS plant_group_id,
                COALESCE(ug_direct.name, ug_via_plant.name, ug_img.name, dg_via_plant.name, dg_direct.name, '(Unbenannt)') AS group_name,
                COALESCE(ug_direct.type, ug_via_plant.type, ug_img.type, dg_via_plant.type, dg_direct.type)                AS group_type
            FROM gd_images i
            LEFT JOIN gd_user_plants    p             ON i.plant_id = p.id
            LEFT JOIN gd_user_groups    ug_direct     ON p.user_group_id = ug_direct.id
            LEFT JOIN gd_user_groups    ug_via_plant  ON p.group_id = ug_via_plant.group_id AND ug_via_plant.user_id = i.user_id
            LEFT JOIN gd_user_groups    ug_img        ON i.user_group_id = ug_img.id
            LEFT JOIN gd_default_groups dg_via_plant  ON p.group_id = dg_via_plant.id
            LEFT JOIN gd_default_groups dg_direct     ON i.group_id = dg_direct.id
            WHERE i.user_id = ?
              AND (
                  (i.plant_id IS NOT NULL AND p.id IS NOT NULL)
                  OR (i.type IN ('group','default') AND i.group_id IS NOT NULL)
                  OR i.user_group_id IS NOT NULL
              )
            ORDER BY group_name, i.id
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'images' => $rows]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// DELETE PLANT
// =========================
if ($action === 'deletePlant') {
    $plantId = $data['plant_id'] ?? null;
    if (!$plantId) { echo json_encode(['success' => false, 'error' => 'Keine plant_id']); exit; }

    // Sicherheit: nur eigene Pflanzen
    $stmt = $db->prepare("SELECT id FROM gd_user_plants WHERE id = ? AND user_id = ?");
    $stmt->execute([$plantId, $_SESSION['user_id']]);
    if (!$stmt->fetch()) { echo json_encode(['success' => false, 'error' => 'Keine Berechtigung']); exit; }

    // Bilder löschen (Dateien + DB)
    $imgs = $db->prepare("SELECT file_path FROM gd_images WHERE plant_id = ? AND user_id = ?");
    $imgs->execute([$plantId, $_SESSION['user_id']]);
    foreach ($imgs->fetchAll(PDO::FETCH_ASSOC) as $img) {
        $path = __DIR__ . '/../' . $img['file_path'];
        if (file_exists($path)) unlink($path);
    }
    $db->prepare("DELETE FROM gd_images WHERE plant_id = ? AND user_id = ?")->execute([$plantId, $_SESSION['user_id']]);

    // Bloom-Observations löschen
    $db->prepare("DELETE FROM gd_bloom_observations WHERE plant_id = ? AND user_id = ?")->execute([$plantId, $_SESSION['user_id']]);

    // Pflanze löschen
    $db->prepare("DELETE FROM gd_user_plants WHERE id = ? AND user_id = ?")->execute([$plantId, $_SESSION['user_id']]);

    echo json_encode(['success' => true]);
    exit;
}

// =========================
// DELETE USER GROUP
// =========================
if ($action === 'deleteUserGroup') {
    $groupId = $data['group_id'] ?? null;
    if (!$groupId) { echo json_encode(['success' => false, 'error' => 'Keine group_id']); exit; }

    // Sicherheit: nur eigene Gruppen
    $stmt = $db->prepare("SELECT id FROM gd_user_groups WHERE id = ? AND user_id = ?");
    $stmt->execute([$groupId, $_SESSION['user_id']]);
    if (!$stmt->fetch()) { echo json_encode(['success' => false, 'error' => 'Keine Berechtigung']); exit; }

    // Alle Pflanzen der Gruppe ermitteln
    $plantStmt = $db->prepare("SELECT id FROM gd_user_plants WHERE user_group_id = ? AND user_id = ?");
    $plantStmt->execute([$groupId, $_SESSION['user_id']]);
    $plantIds = array_column($plantStmt->fetchAll(PDO::FETCH_ASSOC), 'id');

    // Bilder der Pflanzen löschen
    foreach ($plantIds as $pid) {
        $imgs = $db->prepare("SELECT file_path FROM gd_images WHERE plant_id = ? AND user_id = ?");
        $imgs->execute([$pid, $_SESSION['user_id']]);
        foreach ($imgs->fetchAll(PDO::FETCH_ASSOC) as $img) {
            $path = __DIR__ . '/../' . $img['file_path'];
            if (file_exists($path)) unlink($path);
        }
        $db->prepare("DELETE FROM gd_images WHERE plant_id = ? AND user_id = ?")->execute([$pid, $_SESSION['user_id']]);
        $db->prepare("DELETE FROM gd_bloom_observations WHERE plant_id = ? AND user_id = ?")->execute([$pid, $_SESSION['user_id']]);
    }

    // Gruppenbilder löschen
    $grpImgs = $db->prepare("SELECT file_path FROM gd_images WHERE type='group' AND group_id = (SELECT group_id FROM gd_user_groups WHERE id = ?) AND user_id = ?");
    $grpImgs->execute([$groupId, $_SESSION['user_id']]);
    foreach ($grpImgs->fetchAll(PDO::FETCH_ASSOC) as $img) {
        $path = __DIR__ . '/../' . $img['file_path'];
        if (file_exists($path)) unlink($path);
    }
    $db->prepare("DELETE FROM gd_images WHERE type='group' AND group_id = (SELECT group_id FROM gd_user_groups WHERE id = ?) AND user_id = ?")->execute([$groupId, $_SESSION['user_id']]);

    // Bloom-Observations der Gruppe löschen
    $db->prepare("DELETE FROM gd_bloom_observations WHERE user_group_id = ? AND user_id = ?")->execute([$groupId, $_SESSION['user_id']]);

    // Pflanzen löschen
    if ($plantIds) {
        $db->prepare("DELETE FROM gd_user_plants WHERE user_group_id = ? AND user_id = ?")->execute([$groupId, $_SESSION['user_id']]);
    }

    // Gruppe löschen
    $db->prepare("DELETE FROM gd_user_groups WHERE id = ? AND user_id = ?")->execute([$groupId, $_SESSION['user_id']]);

    echo json_encode(['success' => true]);
    exit;
}

// =========================
// PFLEGEKALENDER
// =========================
if ($action === 'getCareTasksList') {
    $year = intval($data['year'] ?? date('Y'));
    try {
        $stmt = $db->prepare("
            SELECT t.id, COALESCE(tt.name, t.name) as name, t.task_type_id,
                   tt.icon as icon,
                   t.plant_id, t.user_group_id, t.months, t.notes,
                   p.name as plant_name,
                   COALESCE(ug.name, dg.name) as group_name,
                   ug.group_id as user_group_default_group_id
            FROM gd_care_tasks t
            LEFT JOIN gd_care_task_types tt ON t.task_type_id = tt.id
            LEFT JOIN gd_user_plants p      ON t.plant_id = p.id
            LEFT JOIN gd_user_groups ug     ON t.user_group_id = ug.id
            LEFT JOIN gd_default_groups dg  ON ug.group_id = dg.id
            WHERE t.user_id = ?
            ORDER BY name
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $doneStmt = $db->prepare("SELECT task_id, month FROM gd_care_done WHERE user_id = ? AND year = ?");
        $doneStmt->execute([$_SESSION['user_id'], $year]);
        $doneMap = [];
        foreach ($doneStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $doneMap[$row['task_id']][] = intval($row['month']);
        }
        foreach ($tasks as &$task) {
            $task['done_months'] = $doneMap[$task['id']] ?? [];
            $task['months']      = intval($task['months']);
        }
        echo json_encode(['success' => true, 'tasks' => $tasks, 'year' => $year]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'saveCareTask') {
    $id            = $data['id'] ?? null;
    $task_type_id  = $data['task_type_id']  ?: null;
    $name          = $task_type_id ? null : trim($data['name'] ?? '');
    $plant_id      = $data['plant_id']      ?: null;
    $user_group_id = $data['user_group_id'] ?: null;
    $months        = intval($data['months'] ?? 0);
    $notes         = $data['notes']         ?: null;
    if (!$task_type_id && !$name) { echo json_encode(['success' => false, 'error' => 'Name fehlt']); exit; }
    try {
        if ($id) {
            $db->prepare("UPDATE gd_care_tasks SET name=?, task_type_id=?, plant_id=?, user_group_id=?, months=?, notes=? WHERE id=? AND user_id=?")
               ->execute([$name, $task_type_id, $plant_id, $user_group_id, $months, $notes, $id, $_SESSION['user_id']]);
        } else {
            $db->prepare("INSERT INTO gd_care_tasks (user_id, name, task_type_id, plant_id, user_group_id, months, notes) VALUES (?,?,?,?,?,?,?)")
               ->execute([$_SESSION['user_id'], $name, $task_type_id, $plant_id, $user_group_id, $months, $notes]);
            $id = $db->lastInsertId();
        }
        echo json_encode(['success' => true, 'id' => $id]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'deleteCareTask') {
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false]); exit; }
    $db->prepare("DELETE FROM gd_care_done  WHERE task_id=? AND user_id=?")->execute([$id, $_SESSION['user_id']]);
    $db->prepare("DELETE FROM gd_care_tasks WHERE id=?      AND user_id=?")->execute([$id, $_SESSION['user_id']]);
    echo json_encode(['success' => true]);
    exit;
}

// Aufgaben-Typen (öffentlich lesbar, Admin schreibt)
if ($action === 'getCareTaskTypes') {
    $stmt = $db->query("SELECT id, name, icon FROM gd_care_task_types ORDER BY name");
    echo json_encode(['success' => true, 'types' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($action === 'adminGetCareTaskTypes') {
    requireAdmin($db, $_SESSION['user_id']);
    $stmt = $db->query("SELECT id, name, icon FROM gd_care_task_types ORDER BY name");
    echo json_encode(['success' => true, 'types' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($action === 'adminSaveCareTaskType') {
    requireAdmin($db, $_SESSION['user_id']);
    $id   = $data['id']   ?? null;
    $name = trim($data['name'] ?? '');
    $icon = $data['icon'] ?: null;
    if (!$name) { echo json_encode(['success' => false, 'error' => 'Name fehlt']); exit; }
    try {
        if ($id) {
            $db->prepare("UPDATE gd_care_task_types SET name=?, icon=? WHERE id=?")->execute([$name, $icon, $id]);
        } else {
            $db->prepare("INSERT INTO gd_care_task_types (name, icon) VALUES (?,?)")->execute([$name, $icon]);
            $id = $db->lastInsertId();
        }
        echo json_encode(['success' => true, 'id' => $id]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'adminDeleteCareTaskType') {
    requireAdmin($db, $_SESSION['user_id']);
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false]); exit; }
    $db->prepare("UPDATE gd_care_tasks SET task_type_id=NULL WHERE task_type_id=?")->execute([$id]);
    $db->prepare("DELETE FROM gd_care_task_types WHERE id=?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'toggleCareDone') {
    $task_id = $data['task_id'] ?? null;
    $year    = intval($data['year']  ?? date('Y'));
    $month   = intval($data['month'] ?? 1);
    $done    = (bool)($data['done']  ?? false);
    if (!$task_id) { echo json_encode(['success' => false]); exit; }
    if ($done) {
        $db->prepare("INSERT IGNORE INTO gd_care_done (user_id, task_id, year, month) VALUES (?,?,?,?)")
           ->execute([$_SESSION['user_id'], $task_id, $year, $month]);
    } else {
        $db->prepare("DELETE FROM gd_care_done WHERE user_id=? AND task_id=? AND year=? AND month=?")
           ->execute([$_SESSION['user_id'], $task_id, $year, $month]);
    }
    echo json_encode(['success' => true]);
    exit;
}
