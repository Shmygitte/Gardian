-- ============================================================
-- Gardian – Database Setup & Schema (Final)
-- ============================================================
 
CREATE DATABASE IF NOT EXISTS `dev-gardian`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `dev-gardian`;
 
-- ============================================================
-- Gardian – Database Schema (Final)
-- Convention:
--   gd_default_*  = Admin-defined standards
--   gd_user_*     = User-specific overrides
--
-- Inheritance pattern:
--   gd_default_groups → gd_user_groups → gd_user_plants
--
-- Resolve fields with:
--   COALESCE(user_plant.field, user_group.field, default_group.field)
-- ============================================================
 
-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gd_users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(100)  NOT NULL UNIQUE,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    avatar_path   VARCHAR(500)  NULL,
    last_login    TIMESTAMP     NULL,
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
 
-- ------------------------------------------------------------
-- DEFAULT GROUPS (Admin-defined, all fields required)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gd_default_groups (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150)  NOT NULL UNIQUE,
    -- Plant type
    type          ENUM('tree', 'shrub', 'flower', 's_flower') NOT NULL,
    -- Bloom
    bloom_start   TINYINT UNSIGNED NULL COMMENT '1-12 (month)',
    bloom_end     TINYINT UNSIGNED NULL COMMENT '1-12 (month)',
    -- Marker
    marker_icon   VARCHAR(255)  NULL COMMENT 'Path or identifier to SVG icon',
    marker_color  VARCHAR(50)   NULL COMMENT 'Hex color, e.g. #4CAF50',
    marker_size   TINYINT UNSIGNED NULL COMMENT 'Size in px, e.g. 32',
    -- Fact Sheet
    height        VARCHAR(50)   NULL COMMENT 'e.g. 50-80cm',
    location      VARCHAR(100)  NULL COMMENT 'e.g. Sonne, Halbschatten, Schatten',
    spacing       VARCHAR(50)   NULL COMMENT 'Pflanzabstand',
    care          TEXT          NULL,
    water         TEXT          NULL,
    hardy         TINYINT(1)    NULL COMMENT 'Winterhart',
    scented       TINYINT(1)    NULL,
    cutflower     TINYINT(1)    NULL COMMENT 'Schnittblume',
    lifespan      VARCHAR(50)   NULL COMMENT 'e.g. einjährig, mehrjährig',
    features      TEXT          NULL,
    evergreen     TINYINT(1)    NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
 
-- ------------------------------------------------------------
-- USER GROUP OVERRIDES
-- All fields nullable – NULL means "inherit from gd_default_groups"
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gd_user_groups (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED  NOT NULL,
    name          VARCHAR(150)  NULL COMMENT 'Eigenständiger Gruppenname (kein Default-Backing nötig)',
    group_id      INT UNSIGNED  NULL COMMENT 'FK zu gd_default_groups, NULL = eigenständige User-Gruppe',
    -- Plant type
    type          ENUM('tree', 'shrub', 'flower', 's_flower') NULL,
    -- Bloom
    bloom_start   TINYINT UNSIGNED NULL,
    bloom_end     TINYINT UNSIGNED NULL,
    -- Marker
    marker_icon   VARCHAR(255)  NULL,
    marker_color  VARCHAR(50)   NULL,
    marker_size   TINYINT UNSIGNED NULL,
    -- Fact Sheet
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
    CONSTRAINT fk_ug_user  FOREIGN KEY (user_id)  REFERENCES gd_users(id),
    CONSTRAINT fk_ug_group FOREIGN KEY (group_id) REFERENCES gd_default_groups(id)
);
 
-- ------------------------------------------------------------
-- USER PLANTS (individual plant instances per user)
-- group_id links to the parent group for inheritance
-- pos_x / pos_y = position on the garden map
-- All fact sheet fields nullable – NULL means "inherit from gd_user_groups or gd_default_groups"
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gd_user_plants (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED  NOT NULL,
    group_id      INT UNSIGNED  NOT NULL,
    -- Map position
    pos_x         DECIMAL(6,2)  NULL COMMENT 'X coordinate on map',
    pos_y         DECIMAL(6,2)  NULL COMMENT 'Y coordinate on map',
    -- Bloom
    bloom_start   TINYINT UNSIGNED NULL,
    bloom_end     TINYINT UNSIGNED NULL,
    -- Marker
    marker_icon   VARCHAR(255)  NULL,
    marker_color  VARCHAR(50)   NULL,
    marker_size   TINYINT UNSIGNED NULL,
    -- Fact Sheet
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
 
-- ------------------------------------------------------------
-- ICON LIBRARY (Admin-defined, visible to all users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gd_icon_library (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150)  NOT NULL,
    file_path     VARCHAR(500)  NOT NULL,
    category      VARCHAR(100)  NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- USER ICONS (per user, only visible to owner)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gd_user_icons (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED  NOT NULL,
    name          VARCHAR(150)  NOT NULL,
    file_path     VARCHAR(500)  NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_uicon_user FOREIGN KEY (user_id) REFERENCES gd_users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- IMAGES
-- type defines the level: 'default' = admin, 'group' = user group, 'plant' = user plant
-- Only the relevant FK is set, others are NULL
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gd_images (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type          ENUM('default', 'group', 'plant') NOT NULL,
    group_id      INT UNSIGNED  NULL COMMENT 'Set for type=default or type=group',
    plant_id      INT UNSIGNED  NULL COMMENT 'Set for type=plant',
    user_id       INT UNSIGNED  NULL COMMENT 'NULL for admin default images',
    file_path     VARCHAR(500)  NOT NULL,
    is_primary    TINYINT(1)    NOT NULL DEFAULT 0,
    uploaded_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_img_group FOREIGN KEY (group_id) REFERENCES gd_default_groups(id),
    CONSTRAINT fk_img_plant FOREIGN KEY (plant_id) REFERENCES gd_user_plants(id),
    CONSTRAINT fk_img_user  FOREIGN KEY (user_id)  REFERENCES gd_users(id)
);
 
-- ------------------------------------------------------------
-- USEFUL LINKS (Admin-defined)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gd_useful_links (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    url           VARCHAR(500)  NOT NULL,
    label         VARCHAR(255)  NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- USER GARDEN CONFIG (one row per user)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gd_user_garden_config (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED  NOT NULL UNIQUE,
    -- Map
    map_image_path      VARCHAR(500)  NULL,
    zoom                DECIMAL(6,2)  NULL DEFAULT 1.00,
    pan_x               DECIMAL(8,2)  NULL DEFAULT 0.00,
    pan_y               DECIMAL(8,2)  NULL DEFAULT 0.00,
    -- UI Preferences
    show_hover_gallery  TINYINT(1)    NULL DEFAULT 1,
    hover_gallery_size  ENUM('small', 'medium', 'large') NULL DEFAULT 'small',
    hovers_locked       TINYINT(1)    NULL DEFAULT 0,
    theme               VARCHAR(50)   NULL DEFAULT 'light',
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_config_user FOREIGN KEY (user_id) REFERENCES gd_users(id)
);
