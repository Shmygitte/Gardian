# Gardian – Vollständiges Projekt-Setup

Dieses Dokument beschreibt das komplette Setup des Gardian-Projekts.
Verwende es als Prompt, um ein identisches Projekt neu zu erstellen.

---

## Projektbeschreibung

**Gardian** ist eine Web-Anwendung zur Gartenverwaltung.

- **Frontend**: HTML5, modulares CSS (BEM-Konvention), Vanilla JavaScript
- **Backend**: PHP mit PDO, MySQL-Datenbank
- **Server**: MAMP (MySQL auf Port 8889, PHP-Server auf Port 8888)
- **Build**: npm-Script kopiert Dateien in `../Gardian-runtime/`

**Features:**
- Benutzer-Authentifizierung (Login / Registrierung)
- Gartenplan als Bild hochladen
- Pflanzen-Pins auf der Karte platzieren (Zoom + Pan)
- Dark / Light Theme
- Responsives Design

---

## Verzeichnisstruktur

```
Gardian/
├── assets/
│   ├── icons/          (28 SVG-Icons, siehe unten)
│   ├── maps/           (leer – hier landen hochgeladene Gartenpläne)
│   └── logo.png
├── backend/
│   └── api.php
├── src/
│   ├── css/
│   │   ├── main.css
│   │   ├── variables.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   └── components/
│   │       ├── buttons.css
│   │       ├── cards.css
│   │       ├── forms.css
│   │       ├── header.css
│   │       ├── sidebar.css
│   │       └── map.css
│   ├── db/
│   │   └── schema_final.sql
│   ├── db.php
│   └── js/
│       └── app.js
├── index.html
├── login.html
├── package.json
├── setup.sql
└── .gitignore
```

---

## package.json

```json
{
  "name": "gardian",
  "version": "1.0.0",
  "scripts": {
    "build": "rm -rf ../Gardian-runtime/* && mkdir -p ../Gardian-runtime/src ../Gardian-runtime/backend && cp -r backend/* ../Gardian-runtime/backend/ && cp -r src/* ../Gardian-runtime/src/ && cp -r assets ../Gardian-runtime/ && cp index.html login.html ../Gardian-runtime/",
    "start": "php -S localhost:8888 -t ../Gardian-runtime/"
  }
}
```

---

## .gitignore

```
# Betriebssystem
.DS_Store
Thumbs.db

# Node / npm
node_modules/
npm-debug.log*

# Editoren
.vscode/
.idea/
*.swp
*.swo

# Temporäre Dateien
.env
```

---

## Datenbank-Verbindung: src/db.php

```php
<?php
function getDB() {
    return new PDO(
        "mysql:host=127.0.0.1;port=8889;dbname=gardian;charset=utf8mb4",
        "root",
        "root",
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]
    );
}
```

---

## Datenbank-Schema: src/db/schema_final.sql

```sql
-- ============================================================
-- Gardian – Database Setup & Schema (Final)
-- ============================================================

CREATE DATABASE IF NOT EXISTS gardian
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE gardian;

-- ============================================================
-- Vererbungs-Prinzip:
--   gd_default_groups → gd_user_groups → gd_user_plants
--
-- Felder auflösen mit:
--   COALESCE(user_plant.field, user_group.field, default_group.field)
-- ============================================================

-- USERS
CREATE TABLE IF NOT EXISTS gd_users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(100)  NOT NULL UNIQUE,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- DEFAULT GROUPS (Admin-defined)
CREATE TABLE IF NOT EXISTS gd_default_groups (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150)  NOT NULL UNIQUE,
    type          ENUM('tree', 'shrub', 'flower', 's_flower') NOT NULL,
    bloom_start   TINYINT UNSIGNED NULL COMMENT '1-12 (month)',
    bloom_end     TINYINT UNSIGNED NULL COMMENT '1-12 (month)',
    marker_icon   VARCHAR(255)  NULL,
    marker_color  VARCHAR(50)   NULL,
    marker_size   TINYINT UNSIGNED NULL,
    height        VARCHAR(50)   NULL,
    location      VARCHAR(100)  NULL,
    spacing       VARCHAR(50)   NULL,
    care          TEXT          NULL,
    water         TEXT          NULL,
    hardy         TINYINT(1)    NULL,
    scented       TINYINT(1)    NULL,
    cutflower     TINYINT(1)    NULL,
    lifespan      VARCHAR(50)   NULL,
    features      TEXT          NULL,
    evergreen     TINYINT(1)    NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- USER GROUP OVERRIDES (NULL = von gd_default_groups erben)
CREATE TABLE IF NOT EXISTS gd_user_groups (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED  NOT NULL,
    group_id      INT UNSIGNED  NOT NULL,
    type          ENUM('tree', 'shrub', 'flower', 's_flower') NULL,
    bloom_start   TINYINT UNSIGNED NULL,
    bloom_end     TINYINT UNSIGNED NULL,
    marker_icon   VARCHAR(255)  NULL,
    marker_color  VARCHAR(50)   NULL,
    marker_size   TINYINT UNSIGNED NULL,
    height        VARCHAR(50)   NULL,
    location      VARCHAR(100)  NULL,
    spacing       VARCHAR(50)   NULL,
    care          TEXT          NULL,
    water         TEXT          NULL,
    hardy         TINYINT(1)    NULL,
    scented       TINYINT(1)    NULL,
    cutflower     TINYINT(1)    NULL,
    lifespan      VARCHAR(50)   NULL,
    features      TEXT          NULL,
    evergreen     TINYINT(1)    NULL,
    UNIQUE KEY uq_user_group (user_id, group_id),
    CONSTRAINT fk_ug_user  FOREIGN KEY (user_id)  REFERENCES gd_users(id),
    CONSTRAINT fk_ug_group FOREIGN KEY (group_id) REFERENCES gd_default_groups(id)
);

-- USER PLANTS (einzelne Pflanzen-Instanzen, auf Karte positionierbar)
CREATE TABLE IF NOT EXISTS gd_user_plants (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED  NOT NULL,
    group_id      INT UNSIGNED  NOT NULL,
    pos_x         DECIMAL(6,2)  NULL,
    pos_y         DECIMAL(6,2)  NULL,
    bloom_start   TINYINT UNSIGNED NULL,
    bloom_end     TINYINT UNSIGNED NULL,
    marker_icon   VARCHAR(255)  NULL,
    marker_color  VARCHAR(50)   NULL,
    marker_size   TINYINT UNSIGNED NULL,
    height        VARCHAR(50)   NULL,
    location      VARCHAR(100)  NULL,
    spacing       VARCHAR(50)   NULL,
    care          TEXT          NULL,
    water         TEXT          NULL,
    hardy         TINYINT(1)    NULL,
    scented       TINYINT(1)    NULL,
    cutflower     TINYINT(1)    NULL,
    lifespan      VARCHAR(50)   NULL,
    features      TEXT          NULL,
    evergreen     TINYINT(1)    NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_up_user  FOREIGN KEY (user_id)  REFERENCES gd_users(id),
    CONSTRAINT fk_up_group FOREIGN KEY (group_id) REFERENCES gd_default_groups(id)
);

-- IMAGES
CREATE TABLE IF NOT EXISTS gd_images (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type          ENUM('default', 'group', 'plant') NOT NULL,
    group_id      INT UNSIGNED  NULL,
    plant_id      INT UNSIGNED  NULL,
    user_id       INT UNSIGNED  NULL,
    file_path     VARCHAR(500)  NOT NULL,
    is_primary    TINYINT(1)    NOT NULL DEFAULT 0,
    uploaded_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_img_group FOREIGN KEY (group_id) REFERENCES gd_default_groups(id),
    CONSTRAINT fk_img_plant FOREIGN KEY (plant_id) REFERENCES gd_user_plants(id),
    CONSTRAINT fk_img_user  FOREIGN KEY (user_id)  REFERENCES gd_users(id)
);

-- USER GARDEN CONFIG (eine Zeile pro Nutzer)
CREATE TABLE IF NOT EXISTS gd_user_garden_config (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED  NOT NULL UNIQUE,
    map_image_path      VARCHAR(500)  NULL,
    zoom                DECIMAL(6,2)  NULL DEFAULT 1.00,
    pan_x               DECIMAL(8,2)  NULL DEFAULT 0.00,
    pan_y               DECIMAL(8,2)  NULL DEFAULT 0.00,
    show_hover_gallery  TINYINT(1)    NULL DEFAULT 1,
    hover_gallery_size  ENUM('small', 'medium', 'large') NULL DEFAULT 'small',
    hovers_locked       TINYINT(1)    NULL DEFAULT 0,
    theme               VARCHAR(50)   NULL DEFAULT 'light',
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_config_user FOREIGN KEY (user_id) REFERENCES gd_users(id)
);
```

---

## Backend: backend/api.php

```php
<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start();
require_once __DIR__ . '/../src/db.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? $_POST['action'] ?? $_GET['action'] ?? null;
$db = getDB();

// PROTECTION
if (!in_array($action, ['login', 'register'])) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false]);
        exit;
    }
}

// REGISTER
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
            INSERT INTO gd_users (username, email, password_hash)
            VALUES (?, ?, ?)
        ");
        $email = $data['email'] ?? $username . '@gardian.local';
        $stmt->execute([$username, $email, $hash]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// LOGIN
if ($action === 'login') {
    $stmt = $db->prepare("SELECT * FROM gd_users WHERE username = ?");
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

// GET PINS
if ($action === 'getPins') {
    try {
        $stmt = $db->prepare("
            SELECT
                p.id, p.pos_x AS x, p.pos_y AS y,
                COALESCE(p.marker_icon, ug.marker_icon, dg.marker_icon) as marker_icon,
                COALESCE(p.marker_color, ug.marker_color, dg.marker_color) as marker_color,
                dg.name as name,
                COALESCE(p.evergreen, ug.evergreen, dg.evergreen) as is_evergreen,
                p.group_id
            FROM gd_user_plants p
            JOIN gd_default_groups dg ON p.group_id = dg.id
            LEFT JOIN gd_user_groups ug ON p.group_id = ug.group_id AND p.user_id = ug.user_id
            WHERE p.user_id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $pins = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'pins' => $pins]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// GET PLANT DETAILS
if ($action === 'getPlantDetails') {
    $plantId = $data['id'] ?? null;
    if (!$plantId) {
        echo json_encode(['success' => false, 'message' => 'Missing ID']);
        exit;
    }

    try {
        $stmt = $db->prepare("
            SELECT
                p.*,
                dg.name as name,
                COALESCE(p.evergreen, ug.evergreen, dg.evergreen) as is_evergreen
            FROM gd_user_plants p
            JOIN gd_default_groups dg ON p.group_id = dg.id
            LEFT JOIN gd_user_groups ug ON p.group_id = ug.group_id AND p.user_id = ug.user_id
            WHERE p.id = ? AND p.user_id = ?
        ");
        $stmt->execute([$plantId, $_SESSION['user_id']]);
        $plant = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($plant) {
            echo json_encode(['success' => true, 'plant' => $plant]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Plant not found']);
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// GET GARDEN CONFIG
if ($action === 'getGardenConfig') {
    try {
        $stmt = $db->prepare("SELECT * FROM gd_user_garden_config WHERE user_id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $config = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'config' => $config]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// UPLOAD GARDEN PLAN
if ($action === 'uploadGardenPlan') {
    if (!isset($_FILES['map'])) {
        echo json_encode(['success' => false, 'message' => 'No file uploaded']);
        exit;
    }

    $userId = $_SESSION['user_id'];
    $file = $_FILES['map'];
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $targetDir = __DIR__ . '/../assets/maps/';
    if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);

    $filename = "user_" . $userId . "_" . time() . "." . $extension;
    $targetPath = $targetDir . $filename;
    $dbPath = "assets/maps/" . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        try {
            $stmt = $db->prepare("
                INSERT INTO gd_user_garden_config (user_id, map_image_path)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE map_image_path = ?
            ");
            $stmt->execute([$userId, $dbPath, $dbPath]);
            echo json_encode(['success' => true, 'url' => $dbPath]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to move file']);
    }
    exit;
}
```

---

## Frontend: index.html

```html
<!DOCTYPE html>
<html lang="de" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gardian - Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="src/css/main.css">
</head>
<body>
    <div class="l-app-shell">
        <header class="l-header">
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="assets/logo.png" alt="Logo" style="height: 40px; border-radius: 50%;">
                <h1 style="font-size: 1.5rem; color: var(--primary-dark);">Gardian</h1>
            </div>
            <nav class="c-nav">
                <button class="c-btn c-btn--text" onclick="location.href='login.html'">Abmelden</button>
            </nav>
        </header>

        <div class="l-app-body">
            <aside class="l-sidebar">
                <div class="c-form-group">
                    <label class="c-label">Menü</label>
                    <nav style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="c-btn c-btn--secondary" style="justify-content: flex-start;">Dashboard</button>
                        <button class="c-btn c-btn--text" style="justify-content: flex-start;">Pflanzen</button>
                        <button class="c-btn c-btn--text" style="justify-content: flex-start;">Einstellungen</button>
                    </nav>
                </div>
            </aside>

            <main class="l-main-content">
                <div class="c-card">
                    <div class="c-card__header">
                        <h2 class="c-card__title">Willkommen bei Gardian</h2>
                    </div>
                    <div class="c-card__body">
                        <p>Dein Garten-Manager ist bereit.</p>
                    </div>
                    <div class="c-card__footer">
                        <button class="c-btn c-btn--primary">Pflanze hinzufügen</button>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script src="src/js/app.js"></script>
    <script>
        function toggleTheme() {
            const html = document.documentElement;
            const current = html.getAttribute('data-theme');
            html.setAttribute('data-theme', current === 'light' ? 'dark' : 'light');
        }
    </script>
</body>
</html>
```

---

## Frontend: login.html

```html
<!DOCTYPE html>
<html lang="de" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gardian - Login</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="src/css/main.css">
    <style>
        .l-login-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, var(--bg-app) 0%, var(--primary-light) 100%);
            padding: 20px;
        }
        .c-login-card {
            width: 100%;
            max-width: 420px;
            text-align: center;
            backdrop-filter: blur(10px);
            background-color: rgba(255, 255, 255, 0.82);
            border: 1px solid rgba(255, 255, 255, 0.4);
        }
        [data-theme="dark"] .c-login-card {
            background-color: rgba(45, 55, 72, 0.82);
            border-color: rgba(255, 255, 255, 0.05);
        }
        .c-login-card__logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            border-radius: 50%;
            object-fit: cover;
            box-shadow: var(--shadow-soft);
        }
        .c-login-card__title {
            color: var(--primary-dark);
            margin-bottom: 0.5rem;
            font-size: 2rem;
            font-weight: 800;
        }
        .c-login-card__subtitle {
            margin-bottom: 2.5rem;
            opacity: 0.8;
        }
        .c-message {
            margin-bottom: 1.5rem;
            padding: 10px;
            border-radius: var(--radius-sm);
            font-size: 0.85rem;
            display: none;
        }
        .c-message--error {
            display: block;
            background-color: rgba(231, 76, 60, 0.1);
            color: var(--danger);
        }
    </style>
</head>
<body>
    <div class="l-login-container">
        <div class="c-card c-login-card">
            <img src="assets/logo.png" alt="Gardian Logo" class="c-login-card__logo">
            <h1 class="c-login-card__title">Gardian</h1>
            <p class="c-login-card__subtitle">Dein digitaler Gartenbegleiter</p>

            <div id="error-msg" class="c-message"></div>

            <div class="c-form-group">
                <label class="c-label" for="username">Benutzername</label>
                <input type="text" id="username" class="c-input" placeholder="z.B. GärtnerKlaus">
            </div>

            <div class="c-form-group">
                <label class="c-label" for="password">Passwort</label>
                <input type="password" id="password" class="c-input" placeholder="••••••••">
            </div>

            <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 12px;">
                <button id="btn-login" class="c-btn c-btn--primary" onclick="login()">Anmelden</button>
                <button id="btn-register" class="c-btn c-btn--secondary" onclick="register()">Neues Konto erstellen</button>
            </div>
        </div>
    </div>

    <script>
        const errorMsg = document.getElementById('error-msg');
        const userInp = document.getElementById('username');
        const passInp = document.getElementById('password');

        function showMessage(text, isError = true) {
            errorMsg.textContent = text;
            errorMsg.classList.toggle('c-message--error', isError);
            errorMsg.style.display = 'block';
        }

        async function register() {
            if (!userInp.value || !passInp.value) {
                showMessage('Bitte Benutzername und Passwort eingeben');
                return;
            }
            try {
                await fetch('/backend/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'register', username: userInp.value, password: passInp.value })
                });
                showMessage('Erfolgreich registriert!', false);
            } catch (err) {
                showMessage('Registrierung fehlgeschlagen: ' + err.message);
            }
        }

        async function login() {
            if (!userInp.value || !passInp.value) {
                showMessage('Bitte Benutzername und Passwort eingeben');
                return;
            }
            try {
                const res = await fetch('/backend/api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', username: userInp.value, password: passInp.value })
                });
                const data = await res.json();
                if (data.success) {
                    location.href = 'index.html';
                } else {
                    showMessage('Login fehlgeschlagen: Benutzername oder Passwort falsch');
                }
            } catch (err) {
                showMessage('Login-Fehler: ' + err.message);
            }
        }

        [userInp, passInp].forEach(el => {
            el.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
        });
    </script>
</body>
</html>
```

---

## CSS: src/css/main.css

```css
/* Main CSS Entry Point */

@import 'variables.css';
@import 'base.css';
@import 'layout.css';
@import 'components/buttons.css';
@import 'components/cards.css';
@import 'components/forms.css';
@import 'components/header.css';
@import 'components/sidebar.css';
@import 'components/map.css';
```

---

## CSS: src/css/variables.css

```css
/* 1. Design Tokens & Theme Support */

:root {
    --font-main: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --radius-lg: 16px;
    --radius-md: 12px;
    --radius-sm: 8px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-fast: 0.2s ease;
    --transition-base: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
}

[data-theme="light"],
:root:not([data-theme="dark"]) {
    --primary: #4CAF50;
    --primary-dark: #388E3C;
    --primary-light: #C8E6C9;
    --accent: #FF9800;
    --danger: #E74C3C;
    --bg-app: #F5F7FA;
    --bg-card: #FFFFFF;
    --text-main: #2C3E50;
    --text-muted: #7F8C8D;
    --color-bg: #F5F7FA;
    --color-surface: #FFFFFF;
    --color-text: #2C3E50;
    --color-text-muted: #7F8C8D;
    --color-primary: #4CAF50;
    --color-primary-dark: #388E3C;
    --color-primary-light: #C8E6C9;
    --color-accent: #FF9800;
    --color-border: #E2E8F0;
    --color-shadow: rgba(0, 0, 0, 0.05);
    --shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.05);
    --shadow-medium: 0 8px 24px rgba(0, 0, 0, 0.08);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
    --primary: #81C784;
    --primary-dark: #4CAF50;
    --primary-light: #1B2E1C;
    --accent: #FFB74D;
    --danger: #EF5350;
    --bg-app: #1A202C;
    --bg-card: #2D3748;
    --text-main: #F7FAFC;
    --text-muted: #A0AEC0;
    --color-bg: #1A202C;
    --color-surface: #2D3748;
    --color-text: #F7FAFC;
    --color-text-muted: #A0AEC0;
    --color-primary: #81C784;
    --color-primary-dark: #4CAF50;
    --color-primary-light: #1B2E1C;
    --color-accent: #FFB74D;
    --color-border: rgba(255, 255, 255, 0.1);
    --color-shadow: rgba(0, 0, 0, 0.3);
    --shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.3);
    --shadow-medium: 0 8px 24px rgba(0, 0, 0, 0.4);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}
```

---

## CSS: src/css/base.css

```css
/* 2. Global Resets & Typography */

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: var(--font-main);
    background-color: var(--bg-app);
    color: var(--text-main);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.2; }
img { max-width: 100%; display: block; }
ul { list-style: none; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; border: none; background: none; cursor: pointer; }
```

---

## CSS: src/css/layout.css

```css
/* 3. App Shell Layout */

.l-app-shell, .app { display: flex; flex-direction: column; min-height: 100vh; }

.l-header, .app__header {
    height: 70px;
    background-color: var(--bg-card);
    box-shadow: var(--shadow-soft);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    position: sticky;
    top: 0;
    z-index: 100;
}

.l-app-body, .app__body { display: flex; flex: 1; }

.l-sidebar, .app__sidebar {
    width: 280px;
    background-color: var(--bg-card);
    border-right: 1px solid rgba(0,0,0,0.05);
    padding: 24px;
    transition: var(--transition);
}

.l-main-content, .app__content {
    flex: 1;
    padding: 32px;
    background-color: var(--bg-app);
    overflow-y: auto;
}

@media (max-width: 900px) {
    .l-sidebar, .app__sidebar { width: 80px; padding: 16px; }
    .l-sidebar__text { display: none; }
}

@media (max-width: 600px) {
    .l-app-body, .app__body { flex-direction: column-reverse; }
    .l-sidebar, .app__sidebar {
        width: 100%;
        height: 60px;
        border-right: none;
        border-top: 1px solid rgba(0,0,0,0.05);
        position: fixed;
        bottom: 0;
        padding: 0;
        display: flex;
        justify-content: space-around;
        align-items: center;
    }
}
```

---

## CSS: src/css/components/buttons.css

```css
/* 4. Button Component (.c-btn) */

.c-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 24px;
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    border: none;
    transition: var(--transition);
    white-space: nowrap;
    user-select: none;
}

.c-btn--primary { background-color: var(--primary); color: white; }
.c-btn--primary:hover { background-color: var(--primary-dark); box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3); }
.c-btn--secondary { background-color: var(--primary-light); color: var(--primary-dark); }
.c-btn--secondary:hover { background-color: #B9DAB0; }
.c-btn--danger { background-color: var(--danger); color: white; }
.c-btn--danger:hover { filter: brightness(0.9); }
.c-btn--text { background: transparent; color: var(--text-muted); padding: 8px 12px; }
.c-btn--text:hover { background-color: rgba(0, 0, 0, 0.05); color: var(--text-main); }
[data-theme="dark"] .c-btn--text:hover { background-color: rgba(255, 255, 255, 0.05); }
.c-btn:disabled { opacity: 0.6; cursor: not-allowed; pointer-events: none; }
```

---

## CSS: src/css/components/cards.css

```css
/* 5. Card Component (.c-card) */

.c-card {
    background-color: var(--bg-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-soft);
    padding: 24px;
    transition: var(--transition);
    overflow: hidden;
}

.c-card--interactive:hover { transform: translateY(-4px); box-shadow: var(--shadow-medium); }
.c-card__header { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
.c-card__title { font-size: 1.25rem; font-weight: 600; color: var(--text-main); }
.c-card__body { color: var(--text-muted); font-size: 0.95rem; }
.c-card__footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.05); display: flex; gap: 12px; }
```

---

## CSS: src/css/components/forms.css

```css
/* 6. Form Components */

.c-form-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
.c-label { font-size: 0.9rem; font-weight: 600; color: var(--text-main); }

.c-input {
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(0,0,0,0.1);
    background-color: var(--bg-card);
    color: var(--text-main);
    font-family: inherit;
    font-size: 1rem;
    transition: var(--transition);
    outline: none;
}

.c-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
[data-theme="dark"] .c-input { border-color: rgba(255,255,255,0.1); }
[data-theme="dark"] .c-input:focus { box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2); }
.c-input::placeholder { color: var(--text-muted); opacity: 0.6; }
```

---

## CSS: src/css/components/header.css

```css
/* header.css */

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-lg);
    height: 100%;
}

.header__logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-weight: 800;
    font-size: 1.25rem;
    color: var(--color-primary-dark);
}

.header__nav { display: flex; gap: var(--space-md); }

.header__btn {
    padding: var(--space-sm) var(--space-md);
    border-radius: 8px;
    font-weight: 600;
    color: var(--color-text-muted);
}

.header__btn--active { color: var(--color-primary); background-color: var(--color-primary-light); }
```

---

## CSS: src/css/components/sidebar.css

```css
/* sidebar.css */

.sidebar { padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-lg); height: 100%; }
.sidebar__section { display: flex; flex-direction: column; gap: var(--space-sm); }

.sidebar__title {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--color-text-muted);
    letter-spacing: 0.05em;
    padding-left: var(--space-sm);
}

.sidebar__item {
    padding: var(--space-sm) var(--space-md);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
    transition: var(--transition-fast);
}

.sidebar__item:hover { background-color: var(--color-bg); }
.sidebar__item--active { background-color: var(--color-primary-light); color: var(--color-primary-dark); }
```

---

## CSS: src/css/components/map.css

```css
/* map.css */

.map {
    width: 100%;
    height: 100%;
    background-color: var(--color-surface);
    border-radius: 16px;
    box-shadow: 0 4px 6px var(--color-shadow);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.map__canvas {
    width: 100%;
    height: 100%;
    background-color: #EEE;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    font-style: italic;
}

.map__controls {
    position: absolute;
    top: var(--space-md);
    left: var(--space-md);
    display: flex;
    gap: var(--space-sm);
    z-index: 10;
}

.map__btn {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: var(--space-sm) var(--space-md);
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 2px 4px var(--color-shadow);
}
```

---

## JavaScript: src/js/app.js

```javascript
/**
 * Gardian - Core Application Logic
 */

const state = {
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartPos: { x: 0, y: 0 },
    pins: []
};

let elements = {};

async function init() {
    elements = {
        app: document.querySelector('.app'),
        map: document.querySelector('.map'),
        mapCanvas: document.querySelector('.map__canvas'),
        mapUploadInput: document.getElementById('map-upload-input'),
        mapWrapper: null
    };

    setupMapStructure();
    await loadGardenConfig();
    await loadPins();
    setupEventListeners();
}

function setupMapStructure() {
    elements.mapCanvas.innerHTML = `
        <div class="map__wrapper" style="position: relative; transform-origin: 0 0; width: 100%; height: 100%;">
            <img class="map__img" src="" style="display: none; pointer-events: none; -webkit-user-drag: none;">
            <div class="map__placeholder-bg" style="width: 2000px; height: 1500px; background: #eee; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #ccc; border: 4px dashed #ddd;">
                Gartenplan (Platzhalter)
            </div>
            <div class="map__markers-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events: none;"></div>
        </div>
    `;
    elements.mapWrapper = elements.mapCanvas.querySelector('.map__wrapper');
}

function setupEventListeners() {
    elements.mapCanvas.addEventListener('wheel', handleWheel, { passive: false });
    elements.mapCanvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    if (elements.mapUploadInput) {
        elements.mapUploadInput.addEventListener('change', handleMapUpload);
    }
}

async function loadGardenConfig() {
    try {
        const res = await fetch('/Gardian-runtime/backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getGardenConfig' })
        });
        const data = await res.json();
        if (data.success && data.config) {
            if (data.config.map_image_path) updateMapBackground(data.config.map_image_path);
            if (data.config.zoom_level) state.zoom = parseFloat(data.config.zoom_level);
            if (data.config.pan_x) state.panX = parseInt(data.config.pan_x);
            if (data.config.pan_y) state.panY = parseInt(data.config.pan_y);
            updateTransform();
        }
    } catch (err) {
        console.error("Failed to load map config", err);
    }
}

function updateMapBackground(url) {
    const img = elements.mapWrapper.querySelector('.map__img');
    const placeholder = elements.mapWrapper.querySelector('.map__placeholder-bg');
    if (img && placeholder) {
        img.src = '/Gardian-runtime/' + url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    }
}

async function handleMapUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('action', 'uploadGardenPlan');
    formData.append('map', file);
    try {
        const res = await fetch('/Gardian-runtime/backend/api.php', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) updateMapBackground(data.url);
        else alert("Upload fehlgeschlagen: " + data.message);
    } catch (err) {
        console.error("Upload error", err);
    }
}

async function loadPins() {
    try {
        const res = await fetch('/Gardian-runtime/backend/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getPins' })
        });
        const data = await res.json();
        if (data.success) { state.pins = data.pins; renderMarkers(); }
    } catch (err) {
        console.error("Failed to load pins", err);
    }
}

function renderMarkers() {
    const overlay = elements.mapCanvas.querySelector('.map__markers-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    state.pins.forEach(pin => {
        const marker = document.createElement('div');
        marker.className = 'marker';
        marker.style.cssText = `left:${pin.x}px; top:${pin.y}px; position:absolute; pointer-events:auto; transform:translate(-50%,-50%); cursor:pointer;`;
        marker.innerHTML = `
            <div style="background:#4CAF50;color:white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                <span>${getEmoji(pin.type)}</span>
            </div>`;
        marker.title = pin.name;
        overlay.appendChild(marker);
    });
}

function getEmoji(type) {
    if (type === 'tree') return '🌳';
    if (type === 'shrub') return '🌿';
    return '🌸';
}

function handleWheel(e) {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    let newZoom = Math.max(0.2, Math.min(state.zoom + direction * 0.1, 5));
    const rect = elements.mapCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomRatio = newZoom / state.zoom;
    state.panX = mouseX - (mouseX - state.panX) * zoomRatio;
    state.panY = mouseY - (mouseY - state.panY) * zoomRatio;
    state.zoom = newZoom;
    updateTransform();
}

function handleMouseDown(e) {
    if (e.target.closest('.marker')) return;
    state.isPanning = true;
    state.panStartPos = { x: e.clientX - state.panX, y: e.clientY - state.panY };
    elements.mapCanvas.style.cursor = 'grabbing';
}

function handleMouseMove(e) {
    if (state.isPanning) {
        state.panX = e.clientX - state.panStartPos.x;
        state.panY = e.clientY - state.panStartPos.y;
        updateTransform();
    }
}

function handleMouseUp() {
    state.isPanning = false;
    elements.mapCanvas.style.cursor = 'default';
}

function updateTransform() {
    if (elements.mapWrapper) {
        elements.mapWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    }
}

document.addEventListener('DOMContentLoaded', init);
```

---

## SVG-Icons in assets/icons/

Folgende 28 SVG-Dateien müssen in `assets/icons/` vorhanden sein (von svgrepo.com heruntergeladen):

```
botanical-nature-plant-leaf-garden-11-svgrepo-com.svg
botanical-nature-plant-leaf-garden-clover-2-svgrepo-com.svg
botanical-nature-plant-leaf-garden-clover-svgrepo-com.svg
botanical-nature-plant-leaf-garden-grass-svgrepo-com.svg
botany-foliage-nature-garden-svgrepo-com.svg
chrysanthemum-svgrepo-com.svg
ecology-flower-forest-garden-leaf-plant-svgrepo-com.svg
ecology-forest-garden-jungle-leaf-plant-svgrepo-com (1).svg
ecology-forest-garden-jungle-leaf-plant-svgrepo-com.svg
flower-with-4-petals-svgrepo-com.svg
garden-butterfly-insect-svgrepo-com.svg
garden-daisy-svgrepo-com.svg
garden-flower-gardening-svgrepo-com.svg
garden-flower-petals-svgrepo-com.svg
garden-gardening-plant-svgrepo-com.svg
garden-plant-flower-svgrepo-com.svg
garden-svgrepo-com (1).svg
garden-svgrepo-com.svg
garden-tree-svgrepo-com (1).svg
garden-tree-svgrepo-com.svg
leaves-plant-environment-foliage-garden-svgrepo-com.svg
leaves-plant-foliage-ecology-garden-svgrepo-com.svg
leaves-plant-foliage-nature-garden-svgrepo-com.svg
maple-leaf-botany-foliage-garden-svgrepo-com.svg
plant-leaf-foliage-nature-garden-svgrepo-com.svg
spring-garden-flower-svgrepo-com.svg
tree-garden-svgrepo-com (1).svg
tree-garden-svgrepo-com.svg
```

---

## Projekt starten

### Voraussetzungen
- MAMP installiert und gestartet (MySQL auf Port 8889, root/root)
- PHP verfügbar im Terminal
- Node.js / npm installiert

### Einmalig: Datenbank anlegen
In MAMP phpMyAdmin: `src/db/schema_final.sql` importieren.

### Entwicklung
```bash
npm run build   # Dateien nach ../Gardian-runtime/ kopieren
npm start       # PHP-Server auf http://localhost:8888 starten
```
