<?php
// Gardian – Plant Types Module (public, for all logged-in users)

if ($action === 'getPlantTypes') {
    $stmt = $db->query("SELECT id, `key`, label, icon, sort_order, marker_size, marker_color FROM gd_plant_types ORDER BY sort_order, id");
    echo json_encode(['success' => true, 'types' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    exit;
}
