<?php
// Gardian – Bloom Module (getAllBloomObservations, getBloomObservations, saveBloomObservation)

if ($action === 'getAllBloomObservations') {
    try {
        $stmt = $db->prepare("
            SELECT bo.plant_id, bo.user_group_id, ug.group_id, bo.year, bo.bloom_months
            FROM gd_bloom_observations bo
            LEFT JOIN gd_user_groups ug ON bo.user_group_id = ug.id
            WHERE bo.user_id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
        echo json_encode(['success' => true, 'observations' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'getBloomObservations') {
    $plantId     = $data['plant_id']      ?? null;
    $userGroupId = $data['user_group_id'] ?? null;
    if (!$plantId && !$userGroupId) { echo json_encode(['success' => false, 'error' => 'Fehlende ID']); exit; }
    try {
        if ($plantId) {
            $stmt = $db->prepare("SELECT year, bloom_months FROM gd_bloom_observations WHERE user_id = ? AND plant_id = ? ORDER BY year DESC");
            $stmt->execute([$_SESSION['user_id'], $plantId]);
        } else {
            $stmt = $db->prepare("SELECT year, bloom_months FROM gd_bloom_observations WHERE user_id = ? AND user_group_id = ? ORDER BY year DESC");
            $stmt->execute([$_SESSION['user_id'], $userGroupId]);
        }
        echo json_encode(['success' => true, 'observations' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'saveBloomObservation') {
    $plantId     = $data['plant_id']      ?? null;
    $userGroupId = $data['user_group_id'] ?? null;
    $year        = (int)($data['year']        ?? 0);
    $bloomMonths = (int)($data['bloom_months'] ?? 0);
    if ((!$plantId && !$userGroupId) || !$year) { echo json_encode(['success' => false, 'error' => 'Fehlende Parameter']); exit; }
    try {
        if ($plantId) {
            $db->prepare("INSERT INTO gd_bloom_observations (user_id, plant_id, year, bloom_months)
                          VALUES (?, ?, ?, ?)
                          ON DUPLICATE KEY UPDATE bloom_months = VALUES(bloom_months)")
               ->execute([$_SESSION['user_id'], $plantId, $year, $bloomMonths]);
        } else {
            $db->prepare("INSERT INTO gd_bloom_observations (user_id, user_group_id, year, bloom_months)
                          VALUES (?, ?, ?, ?)
                          ON DUPLICATE KEY UPDATE bloom_months = VALUES(bloom_months)")
               ->execute([$_SESSION['user_id'], $userGroupId, $year, $bloomMonths]);
        }
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}
