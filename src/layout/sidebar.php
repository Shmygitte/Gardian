        <aside class="l-sidebar">
            <div class="c-form-group">
                <label class="c-label">Menü</label>
                <nav style="display: flex; flex-direction: column; gap: 4px;">
<?php
$isIndexPage = in_array($pageId, ['dashboard', 'pflanzen', 'galerie', 'einstellungen', 'admin']);
$navItems = [
    ['id' => 'dashboard',     'label' => 'Gartenkarte',    'indexView' => true],
    ['id' => 'pflanzen',      'label' => 'Pflanzen',       'indexView' => true],
    ['id' => 'galerie',       'label' => 'Galerie',        'indexView' => true],
    ['id' => 'tabelle',       'label' => 'Tabelle',        'href' => 'tabelle.php'],
    ['id' => 'kalender',      'label' => 'Gartenkalender',  'href' => 'kalender.php'],
    ['id' => 'einstellungen', 'label' => 'Einstellungen',  'indexView' => true],
    ['id' => 'admin',         'label' => 'Admin',          'indexView' => true, 'admin' => true],
];

foreach ($navItems as $item):
    $isActive = ($item['id'] === $pageId);
    $btnClass = $isActive ? 'c-btn--secondary' : 'c-btn--text';
    $style = 'justify-content: flex-start;';
    if (!empty($item['admin'])) $style .= ' display:none; color: var(--danger);';

    $onclick = '';
    if (!empty($item['indexView'])) {
        if ($isIndexPage) {
            // Auf index.php: immer showView(), auch für den aktiven Button
            $onclick = "showView('{$item['id']}')";
        } elseif (!$isActive) {
            $onclick = "location.href='index.php?fx=nav-{$item['id']}#{$item['id']}'";
        }
    } elseif (!$isActive) {
        $onclick = "location.href='{$item['href']}?fx=nav-{$item['id']}'";
    }
?>
                    <button id="nav-<?= $item['id'] ?>" class="c-btn <?= $btnClass ?>" style="<?= $style ?>"<?= $onclick ? " onclick=\"{$onclick}\"" : '' ?>><?= $item['label'] ?></button>
<?php endforeach; ?>
                </nav>
            </div>
<?php if (!empty($sidebarExtra)): ?>
            <hr style="border:none; border-top:1px solid var(--border); margin:8px 0;">
            <?= $sidebarExtra ?>
<?php endif; ?>
        </aside>
