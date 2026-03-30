<?php
// Gardian – Care Module (getCareTasksList, saveCareTask, deleteCareTask, getCareTaskTypes, toggleCareDone)

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

if ($action === 'getCareTaskTypes') {
    $stmt = $db->query("SELECT id, name, icon FROM gd_care_task_types ORDER BY name");
    echo json_encode(['success' => true, 'types' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
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
