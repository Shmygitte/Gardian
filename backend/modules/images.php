<?php
// Gardian – Images Module (uploadImage, getImages, deleteImage, getImagesForPin, getAllImages, cleanupImages)

if ($action === 'uploadImage') {
    $type        = $_POST['type']          ?? null;
    $groupId     = $_POST['group_id']      ?? null;
    $plantId     = $_POST['plant_id']      ?? null;
    $userGroupId = $_POST['user_group_id'] ?? null;
    if (!$type || !isset($_FILES['image'])) {
        echo json_encode(['success' => false, 'error' => 'Parameter fehlen']); exit;
    }
    if ($type === 'default') requireAdmin($db, $_SESSION['user_id']);

    $dir = __DIR__ . '/../../assets/images/';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $ts = time();

    $file = $_FILES['image'];
    $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg','jpeg','png','webp','gif'])) {
        echo json_encode(['success' => false, 'error' => 'Ungültiges Dateiformat']); exit;
    }
    $filenameThumb = 'img_' . $_SESSION['user_id'] . '_' . $ts . '_thumb.' . $ext;
    $dbPathThumb   = 'assets/images/' . $filenameThumb;
    if (!move_uploaded_file($file['tmp_name'], $dir . $filenameThumb)) {
        echo json_encode(['success' => false, 'error' => 'Upload fehlgeschlagen']); exit;
    }

    $dbPathGallery = null;
    if (isset($_FILES['image_gallery'])) {
        $fileGal = $_FILES['image_gallery'];
        $extGal  = strtolower(pathinfo($fileGal['name'], PATHINFO_EXTENSION));
        if (in_array($extGal, ['jpg','jpeg','png','webp','gif'])) {
            $filenameGal = 'img_' . $_SESSION['user_id'] . '_' . $ts . '_gallery.' . $extGal;
            $dbPathGallery = 'assets/images/' . $filenameGal;
            move_uploaded_file($fileGal['tmp_name'], $dir . $filenameGal);
        }
    }

    try {
        $userId = ($type === 'default') ? null : $_SESSION['user_id'];
        $db->prepare("INSERT INTO gd_images (type, group_id, plant_id, user_group_id, user_id, file_path, file_path_gallery, is_primary)
                      VALUES (?, ?, ?, ?, ?, ?, ?, 0)")
           ->execute([$type, $groupId ?: null, $plantId ?: null, $userGroupId ?: null, $userId, $dbPathThumb, $dbPathGallery]);
        echo json_encode(['success' => true, 'path' => $dbPathThumb, 'id' => $db->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'getImages') {
    $type        = $data['type']          ?? null;
    $groupId     = $data['group_id']      ?? null;
    $plantId     = $data['plant_id']      ?? null;
    $userGroupId = $data['user_group_id'] ?? null;
    try {
        if ($type === 'plant' && $plantId) {
            $stmt = $db->prepare("SELECT * FROM gd_images WHERE type='plant' AND plant_id=? ORDER BY is_primary DESC, uploaded_at DESC");
            $stmt->execute([$plantId]);
        } elseif ($type === 'group' && ($userGroupId || $groupId)) {
            $userImages = [];
            if ($userGroupId) {
                $stmtUser = $db->prepare("SELECT * FROM gd_images WHERE type='group' AND user_group_id=? AND user_id=? ORDER BY is_primary DESC, uploaded_at DESC");
                $stmtUser->execute([$userGroupId, $_SESSION['user_id']]);
                $userImages = $stmtUser->fetchAll(PDO::FETCH_ASSOC);
            }
            if (count($userImages) > 0) {
                echo json_encode(['success' => true, 'images' => $userImages]);
                exit;
            }
            if ($groupId) {
                $stmt = $db->prepare("SELECT * FROM gd_images WHERE type='default' AND group_id=? ORDER BY is_primary DESC, uploaded_at DESC");
                $stmt->execute([$groupId]);
            } else {
                echo json_encode(['success' => true, 'images' => []]); exit;
            }
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

if ($action === 'deleteImage') {
    $id = $data['id'] ?? null;
    if (!$id) { echo json_encode(['success' => false, 'error' => 'ID fehlt']); exit; }
    try {
        $stmt = $db->prepare("SELECT * FROM gd_images WHERE id=?");
        $stmt->execute([$id]);
        $img = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$img) { echo json_encode(['success' => false, 'error' => 'Nicht gefunden']); exit; }
        if ($img['user_id'] === null || $img['user_id'] != $_SESSION['user_id']) requireAdmin($db, $_SESSION['user_id']);
        $db->prepare("DELETE FROM gd_images WHERE id=?")->execute([$id]);
        $filePath = __DIR__ . '/../../' . $img['file_path'];
        if (file_exists($filePath)) unlink($filePath);
        if (!empty($img['file_path_gallery'])) {
            $galleryPath = __DIR__ . '/../../' . $img['file_path_gallery'];
            if (file_exists($galleryPath)) unlink($galleryPath);
        }
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'getImagesForPin') {
    $plantId     = $data['plant_id']      ?? null;
    $groupId     = $data['group_id']      ?? null;
    $userGroupId = $data['user_group_id'] ?? null;
    if (!$plantId) { echo json_encode(['success' => false, 'error' => 'Parameter fehlen']); exit; }
    try {
        $stmtPlant = $db->prepare("SELECT file_path, is_primary, 'plant' as src FROM gd_images WHERE type='plant' AND plant_id=? AND user_id=? ORDER BY is_primary DESC");
        $stmtPlant->execute([$plantId, $_SESSION['user_id']]);
        $plantImages = $stmtPlant->fetchAll(PDO::FETCH_ASSOC);

        $groupImages = [];
        if ($userGroupId) {
            $stmtUG = $db->prepare("SELECT file_path, is_primary, 'group' as src FROM gd_images WHERE type='group' AND user_group_id=? AND user_id=? ORDER BY is_primary DESC");
            $stmtUG->execute([$userGroupId, $_SESSION['user_id']]);
            $groupImages = $stmtUG->fetchAll(PDO::FETCH_ASSOC);
        }
        if (empty($groupImages) && $groupId) {
            $stmtDG = $db->prepare("SELECT file_path, is_primary, 'default' as src FROM gd_images WHERE type='default' AND group_id=? ORDER BY is_primary DESC");
            $stmtDG->execute([$groupId]);
            $groupImages = $stmtDG->fetchAll(PDO::FETCH_ASSOC);
        }

        $all = array_merge($plantImages, $groupImages);
        $all = array_slice($all, 0, 5);
        echo json_encode(['success' => true, 'images' => $all]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'getAllImages') {
    try {
        $stmt = $db->prepare("
            SELECT
                i.id, i.file_path, i.file_path_gallery, i.type, i.plant_id, i.group_id,
                i.user_group_id,
                p.user_group_id AS plant_user_group_id,
                p.group_id      AS plant_group_id,
                p.name          AS plant_name,
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
        $userImages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $userGroupIdsWithPhotos = [];
        foreach ($userImages as $img) {
            if ($img['type'] === 'group' && $img['user_group_id']) {
                $ugStmt = $db->prepare("SELECT group_id FROM gd_user_groups WHERE id = ?");
                $ugStmt->execute([$img['user_group_id']]);
                $ug = $ugStmt->fetch(PDO::FETCH_ASSOC);
                if ($ug && $ug['group_id']) $userGroupIdsWithPhotos[] = $ug['group_id'];
            }
        }

        $stmtDefaults = $db->prepare("
            SELECT
                i.id, i.file_path, i.file_path_gallery, i.type, i.plant_id, i.group_id,
                i.user_group_id,
                NULL AS plant_user_group_id,
                NULL AS plant_group_id,
                dg.name AS group_name,
                dg.type AS group_type
            FROM gd_images i
            JOIN gd_default_groups dg ON i.group_id = dg.id
            WHERE i.type = 'default'
              AND i.group_id IN (
                  SELECT DISTINCT ug.group_id FROM gd_user_groups ug WHERE ug.user_id = ? AND ug.group_id IS NOT NULL
              )
            ORDER BY dg.name, i.id
        ");
        $stmtDefaults->execute([$_SESSION['user_id']]);
        $allDefaults = $stmtDefaults->fetchAll(PDO::FETCH_ASSOC);

        $defaultImages = [];
        foreach ($allDefaults as $def) {
            if (!in_array($def['group_id'], $userGroupIdsWithPhotos)) {
                $defaultImages[] = $def;
            }
        }

        $rows = array_merge($userImages, $defaultImages);
        usort($rows, function($a, $b) {
            return strcmp($a['group_name'] ?? '', $b['group_name'] ?? '') ?: ($a['id'] - $b['id']);
        });
        echo json_encode(['success' => true, 'images' => $rows]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'cleanupImages') {
    $deleted = 0;

    $stmt = $db->prepare("
        SELECT i.id, i.file_path, i.file_path_gallery FROM gd_images i
        LEFT JOIN gd_user_plants p ON i.plant_id = p.id
        WHERE i.user_id = ? AND i.plant_id IS NOT NULL AND p.id IS NULL
    ");
    $stmt->execute([$_SESSION['user_id']]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $img) {
        $path = __DIR__ . '/../../' . $img['file_path'];
        if (file_exists($path)) unlink($path);
        if (!empty($img['file_path_gallery'])) {
            $gp = __DIR__ . '/../../' . $img['file_path_gallery'];
            if (file_exists($gp)) unlink($gp);
        }
        $db->prepare("DELETE FROM gd_images WHERE id = ?")->execute([$img['id']]);
        $deleted++;
    }

    $stmt = $db->prepare("
        SELECT id, file_path, file_path_gallery FROM gd_images
        WHERE user_id = ? AND type = 'group' AND group_id IS NULL AND user_group_id IS NULL AND plant_id IS NULL
    ");
    $stmt->execute([$_SESSION['user_id']]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $img) {
        $path = __DIR__ . '/../../' . $img['file_path'];
        if (file_exists($path)) unlink($path);
        if (!empty($img['file_path_gallery'])) {
            $gp = __DIR__ . '/../../' . $img['file_path_gallery'];
            if (file_exists($gp)) unlink($gp);
        }
        $db->prepare("DELETE FROM gd_images WHERE id = ?")->execute([$img['id']]);
        $deleted++;
    }

    echo json_encode(['success' => true, 'deleted' => $deleted]);
    exit;
}
