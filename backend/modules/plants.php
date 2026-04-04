<?php
// Gardian – Plants Module (getPlantsList, getPlantDetails, addPlant, updatePlant, movePlant, duplicatePlant, deletePlant)

if ($action === 'getPlantsList') {
    try {
        $stmt = $db->prepare("
            SELECT
                ug.id,
                COALESCE(ug.name, dg.name) AS name,
                COALESCE(ug.botanical_name, dg.botanical_name) AS botanical_name,
                ug.group_id,
                COALESCE(ug.type, dg.type) AS type,
                ug.bloom_months,
                COALESCE(ug.bloom_months, dg.bloom_months) AS bloom_months_resolved,
                COALESCE(ug.marker_icon, dg.marker_icon) AS marker_icon,
                COALESCE(ug.marker_color, dg.marker_color) AS marker_color,
                COALESCE(ug.marker_size, dg.marker_size) AS marker_size,
                COALESCE(ug.marker_icon_color, dg.marker_icon_color) AS marker_icon_color,
                COALESCE(ug.height, dg.height) AS height,
                COALESCE(ug.location, dg.location) AS location,
                COALESCE(ug.spacing, dg.spacing) AS spacing,
                COALESCE(ug.care, dg.care) AS care,
                COALESCE(ug.water, dg.water) AS water,
                COALESCE(ug.hardy, dg.hardy) AS hardy,
                COALESCE(ug.scented, dg.scented) AS scented,
                COALESCE(ug.cutflower, dg.cutflower) AS cutflower,
                COALESCE(ug.lifespan, dg.lifespan) AS lifespan,
                COALESCE(ug.features, dg.features) AS features,
                COALESCE(ug.evergreen, dg.evergreen) AS evergreen
            FROM gd_user_groups ug
            LEFT JOIN gd_default_groups dg ON ug.group_id = dg.id
            WHERE ug.user_id = ?
            ORDER BY name
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtPlants = $db->prepare("
            SELECT
                p.id, p.name as plant_name, p.botanical_name as plant_botanical_name, p.group_id, p.user_group_id, p.pos_x, p.pos_y,
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
                p.id, p.pos_x, p.pos_y, p.group_id, p.user_group_id,
                p.name as plant_name,
                p.planned_month_year, p.planted_month_year,
                p.removed_month_year, p.removed_reason,
                p.created_at,
                COALESCE(ug_direct.name, dg.name) as name,
                COALESCE(p.botanical_name, ug_direct.botanical_name, ug.botanical_name, dg.botanical_name) as botanical_name,
                COALESCE(p.type, ug_direct.type, ug.type, dg.type) as type,
                COALESCE(p.bloom_months, ug_direct.bloom_months, ug.bloom_months, dg.bloom_months) as bloom_months,
                COALESCE(p.marker_icon, ug_direct.marker_icon, ug.marker_icon, dg.marker_icon) as marker_icon,
                COALESCE(p.marker_color, ug_direct.marker_color, ug.marker_color, dg.marker_color) as marker_color,
                COALESCE(p.marker_size, ug_direct.marker_size, ug.marker_size, dg.marker_size) as marker_size,
                COALESCE(p.marker_icon_color, ug_direct.marker_icon_color, ug.marker_icon_color, dg.marker_icon_color) as marker_icon_color,
                COALESCE(p.height, ug_direct.height, ug.height, dg.height) as height,
                COALESCE(p.location, ug_direct.location, ug.location, dg.location) as location,
                COALESCE(p.spacing, ug_direct.spacing, ug.spacing, dg.spacing) as spacing,
                COALESCE(p.care, ug_direct.care, ug.care, dg.care) as care,
                COALESCE(p.water, ug_direct.water, ug.water, dg.water) as water,
                COALESCE(p.hardy, ug_direct.hardy, ug.hardy, dg.hardy) as hardy,
                COALESCE(p.scented, ug_direct.scented, ug.scented, dg.scented) as scented,
                COALESCE(p.cutflower, ug_direct.cutflower, ug.cutflower, dg.cutflower) as cutflower,
                COALESCE(p.lifespan, ug_direct.lifespan, ug.lifespan, dg.lifespan) as lifespan,
                COALESCE(p.features, ug_direct.features, ug.features, dg.features) as features,
                COALESCE(p.evergreen, ug_direct.evergreen, ug.evergreen, dg.evergreen) as evergreen
            FROM gd_user_plants p
            LEFT JOIN gd_default_groups dg ON p.group_id = dg.id
            LEFT JOIN gd_user_groups ug ON p.group_id = ug.group_id AND p.user_id = ug.user_id
            LEFT JOIN gd_user_groups ug_direct ON p.user_group_id = ug_direct.id
            WHERE p.id = ? AND p.user_id = ?
        ");
        $stmt->execute([$plantId, $_SESSION['user_id']]);
        $plant = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($plant) {
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
    $allowed = ['name','botanical_name','marker_color','marker_size','marker_icon','marker_icon_color','bloom_months','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen','pos_x','pos_y','planned_month_year','planted_month_year','removed_month_year','removed_reason'];
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

if ($action === 'resetPlantFields') {
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false, 'error' => 'ID fehlt']); exit; }
    $resettable = ['name','botanical_name','type','bloom_months','marker_icon','marker_color','marker_size','marker_icon_color','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
    $fields = $data['fields'] ?? $resettable;
    $sets = [];
    foreach ($fields as $f) {
        if (in_array($f, $resettable)) {
            $sets[] = "$f = NULL";
        }
    }
    if (!$sets) { echo json_encode(['success' => true]); exit; }
    try {
        $db->prepare("UPDATE gd_user_plants SET " . implode(', ', $sets) . " WHERE id = ? AND user_id = ?")->execute([$id, $_SESSION['user_id']]);
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
        $stmt = $db->prepare("INSERT INTO gd_user_plants (user_id, group_id, user_group_id, pos_x, pos_y, name, botanical_name, bloom_months, marker_icon, marker_color, marker_size, marker_icon_color, height, location, spacing, care, water, hardy, scented, cutflower, lifespan, features, evergreen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$_SESSION['user_id'], $plant['group_id'], $plant['user_group_id'], $newX, $newY, $plant['name'], $plant['botanical_name'], $plant['bloom_months'], $plant['marker_icon'], $plant['marker_color'], $plant['marker_size'], $plant['marker_icon_color'], $plant['height'], $plant['location'], $plant['spacing'], $plant['care'], $plant['water'], $plant['hardy'], $plant['scented'], $plant['cutflower'], $plant['lifespan'], $plant['features'], $plant['evergreen']]);
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
