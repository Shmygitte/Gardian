<?php
// Gardian – User Module (getAvatar, getUser, updateUser, uploadAvatar)

if ($action === 'getAvatar') {
    $stmt = $db->prepare("SELECT username, avatar_path, role FROM gd_users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'avatar' => $row['avatar_path'], 'role' => $row['role'], 'username' => $row['username']]);
    exit;
}

if ($action === 'getUser') {
    $stmt = $db->prepare("SELECT username, email, avatar_path FROM gd_users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'user' => $row]);
    exit;
}

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
    $targetDir = __DIR__ . '/../../assets/avatars/';
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
