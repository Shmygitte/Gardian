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
