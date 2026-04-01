<?php
// Gardian – Admin Module (Users, Groups, Links, CareTaskTypes)

if ($action === 'adminGetUsers') {
    requireAdmin($db, $_SESSION['user_id']);
    $stmt = $db->query("SELECT id, username, email, role, last_login, created_at FROM gd_users ORDER BY created_at DESC");
    echo json_encode(['success' => true, 'users' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

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

if ($action === 'adminGetGroups') {
    requireAdmin($db, $_SESSION['user_id']);
    $stmt = $db->query("SELECT * FROM gd_default_groups ORDER BY name");
    echo json_encode(['success' => true, 'groups' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($action === 'adminAddGroup') {
    requireAdmin($db, $_SESSION['user_id']);
    $name = trim($data['name'] ?? '');
    $type = $data['type'] ?? null;
    $validTypes = $db->query("SELECT `key` FROM gd_plant_types")->fetchAll(PDO::FETCH_COLUMN);
    if (!$name || !in_array($type, $validTypes)) {
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

if ($action === 'adminUpdateGroup') {
    requireAdmin($db, $_SESSION['user_id']);
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false]); exit; }
    $allowed = ['name','type','bloom_months','marker_icon','marker_color','marker_size','height','location','spacing','care','water','hardy','scented','cutflower','lifespan','features','evergreen'];
    $sets = []; $vals = [];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $data)) {
            $sets[] = "$f = ?";
            $vals[] = ($data[$f] !== '' && $data[$f] !== null) ? $data[$f] : null;
        }
    }
    if (!$sets) { echo json_encode(['success' => true]); exit; }
    $vals[] = $id;
    $db->prepare("UPDATE gd_default_groups SET " . implode(', ', $sets) . " WHERE id=?")->execute($vals);
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'adminDeleteGroup') {
    requireAdmin($db, $_SESSION['user_id']);
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false]); exit; }
    try {
        $db->beginTransaction();
        $db->prepare("UPDATE gd_user_plants SET group_id = NULL WHERE group_id = ?")->execute([$id]);
        $db->prepare("UPDATE gd_user_groups SET group_id = NULL WHERE group_id = ?")->execute([$id]);
        $db->prepare("UPDATE gd_images SET group_id = NULL WHERE group_id = ?")->execute([$id]);
        $db->prepare("DELETE FROM gd_default_groups WHERE id = ?")->execute([$id]);
        $db->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $db->rollBack();
        echo json_encode(['success' => false, 'error' => 'Fehler beim Löschen der Gruppe']);
    }
    exit;
}

// Pflanzentypen
if ($action === 'adminGetPlantTypes') {
    requireAdmin($db, $_SESSION['user_id']);
    $stmt = $db->query("SELECT id, `key`, label, icon, sort_order, marker_size, marker_color FROM gd_plant_types ORDER BY sort_order, id");
    echo json_encode(['success' => true, 'types' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($action === 'adminSavePlantType') {
    requireAdmin($db, $_SESSION['user_id']);
    $id    = $data['id'] ?? null;
    $key   = trim($data['key'] ?? '');
    $label = trim($data['label'] ?? '');
    $icon  = $data['icon'] ?? null;
    $markerSize  = isset($data['marker_size']) && $data['marker_size'] !== '' ? (int)$data['marker_size'] : null;
    $markerColor = trim($data['marker_color'] ?? '') ?: null;
    if (!$key || !$label) { echo json_encode(['success' => false, 'error' => 'Name erforderlich']); exit; }
    try {
        if ($id) {
            $db->prepare("UPDATE gd_plant_types SET label=?, icon=?, marker_size=?, marker_color=? WHERE id=?")->execute([$label, $icon, $markerSize, $markerColor, $id]);
        } else {
            $maxOrder = (int)$db->query("SELECT COALESCE(MAX(sort_order),0) FROM gd_plant_types")->fetchColumn();
            $db->prepare("INSERT INTO gd_plant_types (`key`, label, icon, sort_order, marker_size, marker_color) VALUES (?,?,?,?,?,?)")->execute([$key, $label, $icon, $maxOrder + 1, $markerSize, $markerColor]);
            $id = $db->lastInsertId();
        }
        echo json_encode(['success' => true, 'id' => $id]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'adminDeletePlantType') {
    requireAdmin($db, $_SESSION['user_id']);
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false]); exit; }
    $typeKey = $db->prepare("SELECT `key` FROM gd_plant_types WHERE id=?");
    $typeKey->execute([$id]);
    $key = $typeKey->fetchColumn();
    if ($key) {
        $used = $db->prepare("SELECT COUNT(*) FROM gd_default_groups WHERE type=?");
        $used->execute([$key]);
        if ($used->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'error' => 'Typ wird noch verwendet']);
            exit;
        }
        $usedUser = $db->prepare("SELECT COUNT(*) FROM gd_user_groups WHERE type=?");
        $usedUser->execute([$key]);
        if ($usedUser->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'error' => 'Typ wird noch von Benutzergruppen verwendet']);
            exit;
        }
    }
    $db->prepare("DELETE FROM gd_plant_types WHERE id=?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

// Aufgaben-Typen
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

// Nützliche Links
if ($action === 'adminGetLinks') {
    requireAdmin($db, $_SESSION['user_id']);
    $stmt = $db->query("SELECT id, url, label, sort_order, created_at FROM gd_useful_links ORDER BY sort_order ASC, created_at DESC");
    echo json_encode(['success' => true, 'links' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($action === 'adminAddLink') {
    requireAdmin($db, $_SESSION['user_id']);
    $label = trim($data['label'] ?? '');
    $url   = trim($data['url'] ?? '');
    if (!$label || !$url) { echo json_encode(['success' => false, 'error' => 'Bezeichnung und URL sind Pflichtfelder']); exit; }
    $maxOrder = $db->query("SELECT COALESCE(MAX(sort_order),0) FROM gd_useful_links")->fetchColumn();
    $db->prepare("INSERT INTO gd_useful_links (url, label, sort_order) VALUES (?,?,?)")->execute([$url, $label, $maxOrder + 1]);
    echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
    exit;
}

if ($action === 'adminReorderLinks') {
    requireAdmin($db, $_SESSION['user_id']);
    $order = $data['order'] ?? [];
    if (!is_array($order)) { echo json_encode(['success' => false]); exit; }
    $stmt = $db->prepare("UPDATE gd_useful_links SET sort_order=? WHERE id=?");
    foreach ($order as $i => $id) { $stmt->execute([$i, $id]); }
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'adminUpdateLink') {
    requireAdmin($db, $_SESSION['user_id']);
    $id    = $data['id'] ?? null;
    $label = trim($data['label'] ?? '');
    $url   = trim($data['url'] ?? '');
    if (!$id || !$label || !$url) { echo json_encode(['success' => false, 'error' => 'Felder fehlen']); exit; }
    $db->prepare("UPDATE gd_useful_links SET url=?, label=? WHERE id=?")->execute([$url, $label, $id]);
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'adminDeleteLink') {
    requireAdmin($db, $_SESSION['user_id']);
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false]); exit; }
    $db->prepare("DELETE FROM gd_useful_links WHERE id=?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}
