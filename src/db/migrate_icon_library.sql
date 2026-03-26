-- ============================================================
-- Migration: Icon-Bibliothek (Admin) + User-Icons
-- ============================================================

-- Admin-Icon-Bibliothek (für alle User sichtbar)
CREATE TABLE IF NOT EXISTS gd_icon_library (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    file_path  VARCHAR(500) NOT NULL,
    category   VARCHAR(100) NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User-eigene Icons (nur für den jeweiligen User)
CREATE TABLE IF NOT EXISTS gd_user_icons (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    name       VARCHAR(150) NOT NULL,
    file_path  VARCHAR(500) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_uicon_user FOREIGN KEY (user_id) REFERENCES gd_users(id) ON DELETE CASCADE
);
