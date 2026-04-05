<?php
/**
 * Gardian – Pest Info Module
 * Liefert KI-generierte Schädlings- & Pflegeinfos (read-only)
 */

if ($action === 'getPestInfo') {
    $groupId = $data['group_id'] ?? null;
    $monat   = $data['monat']    ?? null;

    if (!$groupId || !$monat) {
        echo json_encode(['success' => false, 'error' => 'group_id und monat erforderlich']);
        exit;
    }

    try {
        $stmt = $db->prepare("
            SELECT pflegetipps, schaedlinge, updated_at
            FROM gd_default_pest_info
            WHERE group_id = ? AND monat = ?
        ");
        $stmt->execute([$groupId, $monat]);
        $info = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'pest_info' => $info ?: null]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}
