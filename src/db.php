<?php
function getDB() {
    return new PDO(
        "mysql:host=localhost;dbname=gardian;charset=utf8",
        "root",
        "root",
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]
    );
}
