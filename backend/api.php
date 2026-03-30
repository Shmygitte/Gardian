<?php
/**
 * Gardian – API Router
 * Leitet Actions an die entsprechenden Module weiter.
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
$modules = __DIR__ . '/modules/';

// Auth (login, logout, register)
if (in_array($action, ['login', 'logout', 'register'])) {
    require $modules . 'auth.php';
}

// User (getAvatar, getUser, updateUser, uploadAvatar)
if (in_array($action, ['getAvatar', 'getUser', 'updateUser', 'uploadAvatar'])) {
    require $modules . 'user.php';
}

// Map (getPins, getGardenConfig, saveGardenConfig, uploadGardenPlan)
if (in_array($action, ['getPins', 'getGardenConfig', 'saveGardenConfig', 'uploadGardenPlan'])) {
    require $modules . 'map.php';
}

// Plants (getPlantsList, getPlantDetails, addPlant, updatePlant, movePlant, duplicatePlant, deletePlant)
if (in_array($action, ['getPlantsList', 'getPlantDetails', 'addPlant', 'updatePlant', 'movePlant', 'duplicatePlant', 'deletePlant'])) {
    require $modules . 'plants.php';
}

// Groups (getGroups, createUserGroup, updateUserGroup, deleteUserGroup)
if (in_array($action, ['getGroups', 'createUserGroup', 'updateUserGroup', 'deleteUserGroup'])) {
    require $modules . 'groups.php';
}

// Bloom (getAllBloomObservations, getBloomObservations, saveBloomObservation)
if (in_array($action, ['getAllBloomObservations', 'getBloomObservations', 'saveBloomObservation'])) {
    require $modules . 'bloom.php';
}

// Images (uploadImage, getImages, deleteImage, getImagesForPin, getAllImages, cleanupImages)
if (in_array($action, ['uploadImage', 'getImages', 'deleteImage', 'getImagesForPin', 'getAllImages', 'cleanupImages'])) {
    require $modules . 'images.php';
}

// Icons (getIconLibrary, getUserIcons, uploadIcon, adminUpdateIcon, deleteIcon)
if (in_array($action, ['getIconLibrary', 'getUserIcons', 'uploadIcon', 'adminUpdateIcon', 'deleteIcon'])) {
    require $modules . 'icons.php';
}

// Care (getCareTasksList, saveCareTask, deleteCareTask, getCareTaskTypes, toggleCareDone)
if (in_array($action, ['getCareTasksList', 'saveCareTask', 'deleteCareTask', 'getCareTaskTypes', 'toggleCareDone'])) {
    require $modules . 'care.php';
}

// Admin (adminGet*, adminAdd*, adminUpdate*, adminDelete*, adminReorder*)
if (str_starts_with($action ?? '', 'admin') && !in_array($action, ['adminUpdateIcon'])) {
    require $modules . 'admin.php';
}

// Unbekannte Action
echo json_encode(['success' => false, 'error' => 'Unbekannte Action: ' . ($action ?? 'null')]);
