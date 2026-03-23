<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
 
session_start();
require_once __DIR__ . '/../src/db.php'; // Laufzeitpfad: Gardian-runtime/src/db.php
header('Content-Type: application/json');
 
$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? null;
$db = getDB();
 
// =========================
// PROTECTION
// =========================
if (!in_array($action, ['login', 'register'])) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false]);
        exit;
    }
}
 
// =========================
// REGISTER
// =========================
if ($action === 'register') {
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
 
    if (!$username || !$password) {
        echo json_encode(['success' => false]);
        exit;
    }
 
    $hash = password_hash($password, PASSWORD_DEFAULT);
 
    try {
        $stmt = $db->prepare("
            INSERT INTO neueapp_users (username, password_hash)
            VALUES (?, ?)
        ");
        $stmt->execute([$username, $hash]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false]);
    }
    exit;
}
 
// =========================
// LOGIN
// =========================
if ($action === 'login') {
    $stmt = $db->prepare("
        SELECT * FROM neueapp_users WHERE username = ?
    ");
    $stmt->execute([$data['username']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
 
    if ($user && password_verify($data['password'], $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false]);
    }
    exit;
}
