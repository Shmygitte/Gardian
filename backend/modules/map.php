<?php
// Gardian – Map Module (getPins, getGardenConfig, saveGardenConfig, uploadGardenPlan)

if ($action === 'getPins') {
    try {
        // Verwaiste Pflanzen bereinigen
        // 1. user_group_id zeigt auf gelöschte Gruppe
        $db->prepare("
            DELETE p FROM gd_user_plants p
            LEFT JOIN gd_user_groups ug ON p.user_group_id = ug.id
            WHERE p.user_id = ?
              AND p.user_group_id IS NOT NULL
              AND ug.id IS NULL
        ")->execute([$_SESSION['user_id']]);
        // 2. Nur group_id (Default-Gruppe), aber User hat keine user_group mehr dafür
        $db->prepare("
            DELETE p FROM gd_user_plants p
            LEFT JOIN gd_user_groups ug ON p.group_id = ug.group_id AND p.user_id = ug.user_id
            WHERE p.user_id = ?
              AND p.user_group_id IS NULL
              AND p.group_id IS NOT NULL
              AND ug.id IS NULL
        ")->execute([$_SESSION['user_id']]);

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
                COALESCE(p.marker_icon_color, ug_direct.marker_icon_color, ug.marker_icon_color, dg.marker_icon_color) as marker_icon_color,
                p.marker_size,
                COALESCE(p.evergreen, ug_direct.evergreen, ug.evergreen, dg.evergreen) as evergreen,
                COALESCE(p.bloom_months, ug_direct.bloom_months, ug.bloom_months, dg.bloom_months) as bloom_months_resolved,
                p.group_id,
                p.user_group_id
            FROM gd_user_plants p
            LEFT JOIN gd_default_groups dg ON p.group_id = dg.id
            LEFT JOIN gd_user_groups ug ON p.group_id = ug.group_id AND p.user_id = ug.user_id
            LEFT JOIN gd_user_groups ug_direct ON p.user_group_id = ug_direct.id
            WHERE p.user_id = ?
              AND (ug_direct.id IS NOT NULL OR dg.id IS NOT NULL)
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $pins = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'pins' => $pins]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

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

if ($action === 'saveGardenConfig') {
    $fields = ['zoom', 'pan_x', 'pan_y', 'theme', 'effects_enabled'];
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

if ($action === 'uploadGardenPlan') {
    if (!isset($_FILES['map'])) {
        echo json_encode(['success' => false, 'message' => 'No file uploaded']);
        exit;
    }

    $userId = $_SESSION['user_id'];
    $file = $_FILES['map'];
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $targetDir = __DIR__ . '/../../assets/maps/';
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
