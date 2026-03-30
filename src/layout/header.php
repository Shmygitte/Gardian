    <header class="l-header">
        <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.5);backdrop-filter:blur(4px);padding:4px 14px 4px 4px;border-radius:999px;border:1px solid rgba(0,0,0,0.06);">
<?php if (!empty($hasAvatarUpload)): ?>
            <label style="cursor:pointer; display:flex;" title="Profilbild ändern">
                <img id="user-avatar" src="assets/logo.png" alt="Profilbild" style="height:34px;width:34px;border-radius:50%;object-fit:cover;border:2px solid var(--primary-light);box-shadow:0 0 0 1px rgba(0,0,0,0.05);">
                <input type="file" id="avatar-upload" accept="image/*" style="display:none;">
            </label>
<?php else: ?>
            <img id="user-avatar" src="assets/logo.png" alt="" style="height:34px;width:34px;border-radius:50%;object-fit:cover;border:2px solid var(--primary-light);box-shadow:0 0 0 1px rgba(0,0,0,0.05);">
<?php endif; ?>
            <span id="user-name" style="font-size:0.82rem;font-weight:600;color:var(--text-main);"></span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
            <img src="assets/logo.png" alt="Gardian" style="height:38px;width:38px;border-radius:50%;object-fit:cover;">
            <h1 style="font-size:1.5rem;color:var(--primary-dark);">Gardian</h1>
        </div>
<?php if (!empty($headerRightExtra)): ?>
        <div style="display:flex;align-items:center;gap:12px;">
            <?= $headerRightExtra ?>
            <button class="c-btn c-btn--text" onclick="doLogout()" style="font-size:0.8rem;">Abmelden</button>
        </div>
<?php else: ?>
        <button class="c-btn c-btn--text" onclick="doLogout()" style="font-size:0.8rem;">Abmelden</button>
<?php endif; ?>
    </header>
