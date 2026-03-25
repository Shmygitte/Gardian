<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

session_start();
require_once __DIR__ . '/../src/db.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? $_POST['action'] ?? $_GET['action'] ?? null;
$db = getDB();

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
                p.id, p.group_id, p.user_group_id, p.pos_x, p.pos_y,
                p.bloom_months,
                p.marker_icon, p.marker_color, p.marker_size,
                p.height, p.location, p.spacing,
                p.care, p.water, p.hardy, p.scented,
                p.cutflower, p.lifespan, p.features, p.evergreen,
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
    $fields = ['name','type','bloom_months','marker_icon','marker_color','marker_size','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
    $set  = implode(', ', array_map(fn($f) => "$f = ?", $fields));
    $vals = array_map(fn($f) => (($data[$f] ?? null) !== '' && ($data[$f] ?? null) !== null) ? $data[$f] : null, $fields);
    $vals[] = $_SESSION['user_id'];
    $vals[] = $id;
    try {
        $db->prepare("UPDATE gd_user_groups SET $set WHERE user_id = ? AND id = ?")->execute($vals);
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
    $allowed = ['marker_color','marker_size','marker_icon','bloom_months'];
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
