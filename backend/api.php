<?php
ini_set('display_errors', 1);
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
        echo json_encode(['success' => true]);
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
                dg.name,
                COALESCE(ug.type, dg.type) as type,
                COALESCE(p.marker_color, ug.marker_color, dg.marker_color) as marker_color,
                COALESCE(p.marker_icon, ug.marker_icon, dg.marker_icon) as marker_icon,
                COALESCE(p.evergreen, dg.evergreen) as evergreen,
                p.group_id
            FROM gd_user_plants p
            JOIN gd_default_groups dg ON p.group_id = dg.id
            LEFT JOIN gd_user_groups ug ON p.group_id = ug.group_id AND p.user_id = ug.user_id
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
                ug.type, ug.bloom_start, ug.bloom_end,
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

        // Pflanzen je Gruppe laden
        $stmtPlants = $db->prepare("
            SELECT
                p.id, p.group_id, p.pos_x, p.pos_y,
                p.bloom_start, p.bloom_end,
                p.marker_icon, p.marker_color, p.marker_size,
                p.height, p.location, p.spacing,
                p.care, p.water, p.hardy, p.scented,
                p.cutflower, p.lifespan, p.features, p.evergreen,
                p.created_at
            FROM gd_user_plants p
            WHERE p.user_id = ? AND p.group_id = ?
        ");

        foreach ($groups as &$group) {
            $stmtPlants->execute([$_SESSION['user_id'], $group['group_id'] ?? 0]);
            $group['plants'] = $stmtPlants->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode(['success' => true, 'groups' => $groups]);
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
        $stmt = $db->prepare("SELECT id, name, type, marker_icon, marker_color FROM gd_default_groups ORDER BY name");
        $stmt->execute();
        echo json_encode(['success' => true, 'groups' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// =========================
// ADD PLANT
// =========================
if ($action === 'addPlant') {
    $groupId = $data['group_id'] ?? null;
    $posX    = $data['pos_x']   ?? null;
    $posY    = $data['pos_y']   ?? null;
    if (!$groupId || $posX === null || $posY === null) {
        echo json_encode(['success' => false, 'error' => 'Fehlende Parameter']);
        exit;
    }
    try {
        // User-Gruppe anlegen falls noch nicht vorhanden
        $check = $db->prepare("SELECT id FROM gd_user_groups WHERE user_id = ? AND group_id = ?");
        $check->execute([$_SESSION['user_id'], $groupId]);
        if (!$check->fetch()) {
            $ins = $db->prepare("INSERT INTO gd_user_groups (user_id, group_id) VALUES (?, ?)");
            $ins->execute([$_SESSION['user_id'], $groupId]);
        }

        $stmt = $db->prepare("INSERT INTO gd_user_plants (user_id, group_id, pos_x, pos_y) VALUES (?, ?, ?, ?)");
        $stmt->execute([$_SESSION['user_id'], $groupId, $posX, $posY]);
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
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
