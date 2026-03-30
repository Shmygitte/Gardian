<!DOCTYPE html>
<html lang="de" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?? 'Gardian' ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="src/css/main.css">
<?= $extraHeadHtml ?? '' ?>
<?php if (!empty($extraHeadStyles)): ?>
    <style>
<?= $extraHeadStyles ?>
    </style>
<?php endif; ?>
</head>
<body>
<div class="l-app-shell">
