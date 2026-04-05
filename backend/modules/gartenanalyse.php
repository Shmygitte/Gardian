<?php
// Gardian – Gartenanalyse Module (saveGartenanalyse, getGartenanalyseHistory)

if ($action === 'saveGartenanalyse') {
    $content = trim($data['content'] ?? '');
    if (!$content) {
        echo json_encode(['success' => false, 'error' => 'Kein Inhalt']);
        exit;
    }
    $stmt = $db->prepare("INSERT INTO gd_gartenanalyse (user_id, content) VALUES (?, ?)");
    $stmt->execute([$_SESSION['user_id'], $content]);
    echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
    exit;
}

if ($action === 'getGartenanalyseHistory') {
    $stmt = $db->prepare("SELECT id, content, created_at FROM gd_gartenanalyse WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
    $stmt->execute([$_SESSION['user_id']]);
    echo json_encode(['success' => true, 'history' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}
