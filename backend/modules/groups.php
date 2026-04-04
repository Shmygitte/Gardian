<?php
// Gardian – Groups Module (getGroups, createUserGroup, updateUserGroup, deleteUserGroup)

if ($action === 'getGroups') {
    try {
        $stmt = $db->prepare("SELECT id, name, type, marker_icon, marker_color, 'default' AS source FROM gd_default_groups ORDER BY name");
        $stmt->execute();
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtUser = $db->prepare("SELECT id, name, type, marker_icon, marker_color, 'user' AS source FROM gd_user_groups WHERE user_id = ? AND group_id IS NULL ORDER BY name");
        $stmtUser->execute([$_SESSION['user_id']]);
        $userGroups = $stmtUser->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'groups' => array_merge($groups, $userGroups)]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'createUserGroup') {
    $name = trim($data['name'] ?? '');
    if (!$name) {
        echo json_encode(['success' => false, 'error' => 'Name erforderlich']);
        exit;
    }

    $isAdmin = false;
    $defaultGroupId = null;
    $stmt = $db->prepare("SELECT role FROM gd_users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && $row['role'] === 'admin') {
        $isAdmin = true;
        $dgFields = ['name','botanical_name','type','bloom_months','marker_icon','marker_color','marker_size','marker_icon_color','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
        $dgVals = array_map(fn($f) => ($data[$f] ?? null) !== '' ? ($data[$f] ?? null) : null, $dgFields);
        $dgCols = implode(',', $dgFields);
        $dgPh   = implode(',', array_fill(0, count($dgFields), '?'));
        $db->prepare("INSERT INTO gd_default_groups ($dgCols) VALUES ($dgPh)")->execute($dgVals);
        $defaultGroupId = $db->lastInsertId();
    }

    $allowed = ['name','botanical_name','group_id','type','bloom_months','marker_icon','marker_color','marker_size','marker_icon_color','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
    $fields = []; $vals = [];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $data) && $data[$f] !== '' && $data[$f] !== null) {
            $fields[] = $f;
            $vals[] = $data[$f];
        }
    }
    // group_id immer übernehmen wenn vorhanden (auch wenn gerade erst erstellt)
    if ($defaultGroupId && !in_array('group_id', $fields)) {
        $fields[] = 'group_id';
        $vals[] = $defaultGroupId;
    }
    $cols = implode(',', $fields);
    $ph   = implode(',', array_fill(0, count($fields), '?'));
    try {
        $db->prepare("INSERT INTO gd_user_groups (user_id, $cols) VALUES (?, $ph)")->execute(array_merge([$_SESSION['user_id']], $vals));
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'updateUserGroup') {
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false, 'error' => 'ID fehlt']); exit; }
    $allowed = ['name','botanical_name','type','bloom_months','marker_icon','marker_color','marker_size','marker_icon_color','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
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

if ($action === 'deleteUserGroup') {
    $groupId = $data['group_id'] ?? null;
    if (!$groupId) { echo json_encode(['success' => false, 'error' => 'Keine group_id']); exit; }

    $stmt = $db->prepare("SELECT id, group_id FROM gd_user_groups WHERE id = ? AND user_id = ?");
    $stmt->execute([$groupId, $_SESSION['user_id']]);
    $userGroup = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$userGroup) { echo json_encode(['success' => false, 'error' => 'Keine Berechtigung']); exit; }
    $defaultGroupId = $userGroup['group_id'];

    // Pflanzen über user_group_id ODER group_id finden
    $plantStmt = $db->prepare("SELECT id FROM gd_user_plants WHERE (user_group_id = ? OR group_id = ?) AND user_id = ?");
    $plantStmt->execute([$groupId, $defaultGroupId, $_SESSION['user_id']]);
    $plantIds = array_column($plantStmt->fetchAll(PDO::FETCH_ASSOC), 'id');

    foreach ($plantIds as $pid) {
        $imgs = $db->prepare("SELECT file_path, file_path_gallery FROM gd_images WHERE plant_id = ? AND user_id = ?");
        $imgs->execute([$pid, $_SESSION['user_id']]);
        foreach ($imgs->fetchAll(PDO::FETCH_ASSOC) as $img) {
            $path = __DIR__ . '/../../' . $img['file_path'];
            if (file_exists($path)) unlink($path);
            if (!empty($img['file_path_gallery'])) {
                $gp = __DIR__ . '/../../' . $img['file_path_gallery'];
                if (file_exists($gp)) unlink($gp);
            }
        }
        $db->prepare("DELETE FROM gd_images WHERE plant_id = ? AND user_id = ?")->execute([$pid, $_SESSION['user_id']]);
        $db->prepare("DELETE FROM gd_bloom_observations WHERE plant_id = ? AND user_id = ?")->execute([$pid, $_SESSION['user_id']]);
    }

    $grpImgs = $db->prepare("SELECT file_path, file_path_gallery FROM gd_images WHERE type='group' AND group_id = (SELECT group_id FROM gd_user_groups WHERE id = ?) AND user_id = ?");
    $grpImgs->execute([$groupId, $_SESSION['user_id']]);
    foreach ($grpImgs->fetchAll(PDO::FETCH_ASSOC) as $img) {
        $path = __DIR__ . '/../../' . $img['file_path'];
        if (file_exists($path)) unlink($path);
        if (!empty($img['file_path_gallery'])) {
            $gp = __DIR__ . '/../../' . $img['file_path_gallery'];
            if (file_exists($gp)) unlink($gp);
        }
    }
    $db->prepare("DELETE FROM gd_images WHERE type='group' AND group_id = (SELECT group_id FROM gd_user_groups WHERE id = ?) AND user_id = ?")->execute([$groupId, $_SESSION['user_id']]);

    $db->prepare("DELETE FROM gd_bloom_observations WHERE user_group_id = ? AND user_id = ?")->execute([$groupId, $_SESSION['user_id']]);

    if ($plantIds) {
        $db->prepare("DELETE FROM gd_user_plants WHERE (user_group_id = ? OR group_id = ?) AND user_id = ?")->execute([$groupId, $defaultGroupId, $_SESSION['user_id']]);
    }

    $db->prepare("DELETE FROM gd_user_groups WHERE id = ? AND user_id = ?")->execute([$groupId, $_SESSION['user_id']]);

    echo json_encode(['success' => true]);
    exit;
}
