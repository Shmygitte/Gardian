<?php
// Gardian – Plants Module (getPlantsList, getPlantDetails, addPlant, updatePlant, movePlant, duplicatePlant, deletePlant)

if ($action === 'getPlantsList') {
    try {
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

        $stmtPlants = $db->prepare("
            SELECT
                p.id, p.name as plant_name, p.group_id, p.user_group_id, p.pos_x, p.pos_y,
                p.bloom_months,
                p.marker_icon, p.marker_color, p.marker_size,
                p.height, p.location, p.spacing,
                p.care, p.water, p.hardy, p.scented,
                p.cutflower, p.lifespan, p.features, p.evergreen,
                p.planned_month_year,
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

if ($action === 'addPlant') {
    $groupId     = $data['group_id']      ?? null;
    $userGroupId = $data['user_group_id'] ?? null;
    $posX        = $data['pos_x']         ?? null;
    $posY        = $data['pos_y']         ?? null;

    $markerIcon      = $data['marker_icon']       ?? null;
    $markerColor     = $data['marker_color']      ?? null;
    $markerSize      = $data['marker_size']       ?? null;
    $markerIconColor = $data['marker_icon_color']  ?? null;
    $plantName       = $data['name']              ?? null;

    if ((!$groupId && !$userGroupId) || $posX === null || $posY === null) {
        echo json_encode(['success' => false, 'error' => 'Fehlende Parameter']);
        exit;
    }
    try {
        if ($userGroupId) {
            $stmt = $db->prepare("INSERT INTO gd_user_plants (user_id, user_group_id, pos_x, pos_y, name, marker_icon, marker_color, marker_size, marker_icon_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$_SESSION['user_id'], $userGroupId, $posX, $posY, $plantName, $markerIcon, $markerColor, $markerSize, $markerIconColor]);
        } else {
            $check = $db->prepare("SELECT id FROM gd_user_groups WHERE user_id = ? AND group_id = ?");
            $check->execute([$_SESSION['user_id'], $groupId]);
            if (!$check->fetch()) {
                $ins = $db->prepare("INSERT INTO gd_user_groups (user_id, group_id) VALUES (?, ?)");
                $ins->execute([$_SESSION['user_id'], $groupId]);
            }
            $stmt = $db->prepare("INSERT INTO gd_user_plants (user_id, group_id, pos_x, pos_y, name, marker_icon, marker_color, marker_size, marker_icon_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$_SESSION['user_id'], $groupId, $posX, $posY, $plantName, $markerIcon, $markerColor, $markerSize, $markerIconColor]);
        }
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'updatePlant') {
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false, 'error' => 'ID fehlt']); exit; }
    $allowed = ['name','marker_color','marker_size','marker_icon','marker_icon_color','bloom_months','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen','pos_x','pos_y','planned_month_year','planted_month_year','removed_month_year','removed_reason'];
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

if ($action === 'deletePlant') {
    $plantId = $data['plant_id'] ?? null;
    if (!$plantId) { echo json_encode(['success' => false, 'error' => 'Keine plant_id']); exit; }

    $stmt = $db->prepare("SELECT id FROM gd_user_plants WHERE id = ? AND user_id = ?");
    $stmt->execute([$plantId, $_SESSION['user_id']]);
    if (!$stmt->fetch()) { echo json_encode(['success' => false, 'error' => 'Keine Berechtigung']); exit; }

    $imgs = $db->prepare("SELECT file_path, file_path_gallery FROM gd_images WHERE plant_id = ? AND user_id = ?");
    $imgs->execute([$plantId, $_SESSION['user_id']]);
    foreach ($imgs->fetchAll(PDO::FETCH_ASSOC) as $img) {
        $path = __DIR__ . '/../../' . $img['file_path'];
        if (file_exists($path)) unlink($path);
        if (!empty($img['file_path_gallery'])) {
            $gp = __DIR__ . '/../../' . $img['file_path_gallery'];
            if (file_exists($gp)) unlink($gp);
        }
    }
    $db->prepare("DELETE FROM gd_images WHERE plant_id = ? AND user_id = ?")->execute([$plantId, $_SESSION['user_id']]);
    $db->prepare("DELETE FROM gd_bloom_observations WHERE plant_id = ? AND user_id = ?")->execute([$plantId, $_SESSION['user_id']]);
    $db->prepare("DELETE FROM gd_user_plants WHERE id = ? AND user_id = ?")->execute([$plantId, $_SESSION['user_id']]);

    echo json_encode(['success' => true]);
    exit;
}
