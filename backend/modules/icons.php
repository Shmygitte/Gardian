<?php
// Gardian – Icons Module (getIconLibrary, getUserIcons, uploadIcon, adminUpdateIcon, deleteIcon)

if ($action === 'getIconLibrary') {
    $stmt = $db->query("SELECT id, name, file_path, category FROM gd_icon_library ORDER BY category, name");
    echo json_encode(['success' => true, 'icons' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($action === 'getUserIcons') {
    $stmt = $db->prepare("SELECT id, name, file_path FROM gd_user_icons WHERE user_id = ? ORDER BY name");
    $stmt->execute([$_SESSION['user_id']]);
    echo json_encode(['success' => true, 'icons' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}

if ($action === 'uploadIcon') {
    $target = $_POST['target'] ?? null;
    $name   = trim($_POST['name'] ?? '');
    $category = trim($_POST['category'] ?? '') ?: null;

    if (!$target || !in_array($target, ['library', 'user'])) {
        echo json_encode(['success' => false, 'error' => 'Ungültiges Ziel']); exit;
    }
    if ($target === 'library') requireAdmin($db, $_SESSION['user_id']);

    if (!isset($_FILES['icon'])) {
        echo json_encode(['success' => false, 'error' => 'Keine Datei']); exit;
    }
    $file = $_FILES['icon'];
    $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($ext !== 'svg') {
        echo json_encode(['success' => false, 'error' => 'Nur SVG-Dateien erlaubt']); exit;
    }
    if ($file['size'] > 51200) {
        echo json_encode(['success' => false, 'error' => 'Datei zu groß (max. 50KB)']); exit;
    }

    $svgContent = file_get_contents($file['tmp_name']);
    if (preg_match('/<script/i', $svgContent) || preg_match('/\bon\w+\s*=/i', $svgContent)) {
        echo json_encode(['success' => false, 'error' => 'SVG enthält unsicheren Code']); exit;
    }

    if (!$name) $name = pathinfo($file['name'], PATHINFO_FILENAME);

    if ($target === 'library') {
        $targetDir = __DIR__ . '/../../assets/icons/library/';
        $dbPrefix  = 'assets/icons/library/';
    } else {
        $userId    = $_SESSION['user_id'];
        $targetDir = __DIR__ . '/../../assets/icons/user_' . $userId . '/';
        $dbPrefix  = 'assets/icons/user_' . $userId . '/';
    }
    if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);

    $filename = 'icon_' . time() . '_' . mt_rand(100, 999) . '.svg';
    $targetPath = $targetDir . $filename;
    $dbPath     = $dbPrefix . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        if ($target === 'library') {
            $stmt = $db->prepare("INSERT INTO gd_icon_library (name, file_path, category) VALUES (?, ?, ?)");
            $stmt->execute([$name, $dbPath, $category]);
        } else {
            $stmt = $db->prepare("INSERT INTO gd_user_icons (user_id, name, file_path) VALUES (?, ?, ?)");
            $stmt->execute([$_SESSION['user_id'], $name, $dbPath]);
        }
        echo json_encode(['success' => true, 'id' => $db->lastInsertId(), 'file_path' => $dbPath, 'name' => $name]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Upload fehlgeschlagen']);
    }
    exit;
}

if ($action === 'adminUpdateIcon') {
    requireAdmin($db, $_SESSION['user_id']);
    $id       = $data['id'] ?? null;
    $name     = trim($data['name'] ?? '');
    $category = trim($data['category'] ?? '');
    if (!$id || !$name) { echo json_encode(['success' => false, 'error' => 'Name fehlt']); exit; }
    $db->prepare("UPDATE gd_icon_library SET name=?, category=? WHERE id=?")->execute([$name, $category ?: null, $id]);
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'deleteIcon') {
    $target = $data['target'] ?? null;
    $id     = $data['id']     ?? null;
    if (!$id || !$target) { echo json_encode(['success' => false, 'error' => 'Parameter fehlen']); exit; }

    if ($target === 'library') {
        requireAdmin($db, $_SESSION['user_id']);
        $stmt = $db->prepare("SELECT file_path FROM gd_icon_library WHERE id = ?");
        $stmt->execute([$id]);
        $icon = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$icon) { echo json_encode(['success' => false, 'error' => 'Nicht gefunden']); exit; }
        $filePath = __DIR__ . '/../../' . $icon['file_path'];
        if (file_exists($filePath)) unlink($filePath);
        $db->prepare("DELETE FROM gd_icon_library WHERE id = ?")->execute([$id]);
    } else {
        $stmt = $db->prepare("SELECT file_path FROM gd_user_icons WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $_SESSION['user_id']]);
        $icon = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$icon) { echo json_encode(['success' => false, 'error' => 'Nicht gefunden']); exit; }
        $filePath = __DIR__ . '/../../' . $icon['file_path'];
        if (file_exists($filePath)) unlink($filePath);
        $db->prepare("DELETE FROM gd_user_icons WHERE id = ? AND user_id = ?")->execute([$id, $_SESSION['user_id']]);
    }
    echo json_encode(['success' => true]);
    exit;
}
