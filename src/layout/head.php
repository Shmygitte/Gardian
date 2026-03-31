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
<?php if (str_starts_with($_SERVER['HTTP_HOST'] ?? '', 'localhost') || str_starts_with($_SERVER['HTTP_HOST'] ?? '', '127.0.0.1')): ?>
<div style="position:fixed;top:8px;left:8px;z-index:99999;padding:2px 8px;border-radius:var(--radius-sm, 6px);background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);font-size:0.65rem;font-family:monospace;color:rgba(255,255,255,0.7);pointer-events:none;">
<?= trim(@file_get_contents(dirname(__DIR__, 2) . '/.git-branch') ?: 'unknown') ?>
</div>
<?php endif; ?>
<div class="l-app-shell">
