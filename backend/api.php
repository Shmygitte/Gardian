<?php
/**
 * Gardian – API Router
 * Zentrale Eingangs-Datei, leitet Actions an Module weiter.
 */
ini_set('display_errors', 0);
error_reporting(E_ALL);

session_start();
require_once __DIR__ . '/../src/db.php';
header('Content-Type: application/json');

$data   = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? $_POST['action'] ?? $_GET['action'] ?? null;
$db     = getDB();

// =========================
// PROTECTION
// =========================
if (!in_array($action, ['login', 'register'])) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false]);
        exit;
    }
}

function requireAdmin($db, $userId) {
    $stmt = $db->prepare("SELECT role FROM gd_users WHERE id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || $row['role'] !== 'admin') {
        echo json_encode(['success' => false, 'error' => 'Kein Zugriff']);
        exit;
    }
}

// =========================
// ROUTING
// =========================
$moduleMap = [
    // Auth
    'login'    => 'auth',
    'logout'   => 'auth',
    'register' => 'auth',

    // User
    'getAvatar'    => 'user',
    'getUser'      => 'user',
    'updateUser'   => 'user',
    'uploadAvatar' => 'user',

    // Map
    'getPins'          => 'map',
    'getGardenConfig'  => 'map',
    'saveGardenConfig' => 'map',
    'uploadGardenPlan' => 'map',

    // Plants
    'getPlantsList'   => 'plants',
    'getPlantDetails' => 'plants',
    'addPlant'        => 'plants',
    'updatePlant'     => 'plants',
    'movePlant'       => 'plants',
    'duplicatePlant'  => 'plants',
    'deletePlant'     => 'plants',

    // Plant Types
    'getPlantTypes'    => 'plant-types',

    // Groups
    'getGroups'        => 'groups',
    'createUserGroup'  => 'groups',
    'updateUserGroup'  => 'groups',
    'deleteUserGroup'  => 'groups',

    // Bloom
    'getAllBloomObservations' => 'bloom',
    'getBloomObservations'   => 'bloom',
    'saveBloomObservation'   => 'bloom',

    // Images
    'uploadImage'     => 'images',
    'getImages'       => 'images',
    'deleteImage'     => 'images',
    'getImagesForPin' => 'images',
    'getAllImages'     => 'images',
    'cleanupImages'   => 'images',

    // Icons
    'getIconLibrary'  => 'icons',
    'getUserIcons'    => 'icons',
    'uploadIcon'      => 'icons',
    'adminUpdateIcon' => 'icons',
    'deleteIcon'      => 'icons',

    // Care / Kalender
    'getCareTasksList' => 'care',
    'saveCareTask'     => 'care',
    'deleteCareTask'   => 'care',
    'getCareTaskTypes' => 'care',
    'toggleCareDone'   => 'care',

    // Admin
    'adminGetUsers'           => 'admin',
    'adminUpdateRole'         => 'admin',
    'adminDeleteUser'         => 'admin',
    'adminGetGroups'          => 'admin',
    'adminAddGroup'           => 'admin',
    'adminUpdateGroup'        => 'admin',
    'adminDeleteGroup'        => 'admin',
    'adminGetPlantTypes'      => 'admin',
    'adminSavePlantType'      => 'admin',
    'adminDeletePlantType'    => 'admin',
    'adminGetCareTaskTypes'   => 'admin',
    'adminSaveCareTaskType'   => 'admin',
    'adminDeleteCareTaskType' => 'admin',
    'adminGetLinks'           => 'admin',
    'adminAddLink'            => 'admin',
    'adminReorderLinks'       => 'admin',
    'adminUpdateLink'         => 'admin',
    'adminDeleteLink'         => 'admin',
];

if ($action && isset($moduleMap[$action])) {
    require __DIR__ . '/modules/' . $moduleMap[$action] . '.php';
    exit;
}

echo json_encode(['success' => false, 'error' => 'Unbekannte Action']);
