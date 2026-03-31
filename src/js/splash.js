function showSplash() {
    var splash = document.createElement('div');
    splash.className = 'splash';
    splash.id = 'splash';
    splash.innerHTML =
        '<div class="splash__mist">' +
            '<div class="splash__mist-layer"></div>' +
            '<div class="splash__mist-layer"></div>' +
            '<div class="splash__mist-layer"></div>' +
        '</div>' +
        '<div class="splash__particles" id="splash-particles"></div>' +
        '<div class="splash__glow">' +
            '<img src="assets/logo.png" alt="Gardian" class="splash__logo">' +
        '</div>';
    document.body.appendChild(splash);

    var container = document.getElementById('splash-particles');

    // Kleine Partikel (45 Stück)
    for (var i = 0; i < 45; i++) {
        var p = document.createElement('div');
        var cls = 'splash__particle';
        if (i % 5 === 0) cls += ' splash__particle--gold';
        else if (i % 3 === 0) cls += ' splash__particle--white';
        p.className = cls;

        var angle = Math.random() * Math.PI * 2;
        var dist = 30 + Math.random() * 140;
        p.style.left = (50 + Math.cos(angle) * (dist / 8)) + '%';
        p.style.top = (50 + Math.sin(angle) * (dist / 8)) + '%';

        var dx = (Math.random() - 0.5) * 100;
        var dy = -20 - Math.random() * 90;
        p.style.setProperty('--dx', dx + 'px');
        p.style.setProperty('--dy', dy + 'px');
        p.style.setProperty('--dx2', dx * 0.6 + (Math.random() - 0.5) * 50 + 'px');
        p.style.setProperty('--dy2', dy * 1.4 + 'px');
        p.style.setProperty('--dur', (2 + Math.random() * 2) + 's');
        p.style.setProperty('--delay', (Math.random() * 1.5) + 's');
        container.appendChild(p);
    }

    // Große Elfen-Glühwürmchen (10 Stück)
    for (var j = 0; j < 10; j++) {
        var f = document.createElement('div');
        f.className = 'splash__particle splash__particle--fairy';

        var fAngle = Math.random() * Math.PI * 2;
        var fDist = 20 + Math.random() * 80;
        f.style.left = (50 + Math.cos(fAngle) * (fDist / 6)) + '%';
        f.style.top = (50 + Math.sin(fAngle) * (fDist / 6)) + '%';

        var fdx = (Math.random() - 0.5) * 120;
        var fdy = -20 - Math.random() * 60;
        f.style.setProperty('--dx', fdx + 'px');
        f.style.setProperty('--dy', fdy + 'px');
        f.style.setProperty('--dx2', fdx * 0.4 + (Math.random() - 0.5) * 60 + 'px');
        f.style.setProperty('--dy2', fdy * 1.2 + 'px');
        f.style.setProperty('--dur', (3 + Math.random() * 2) + 's');
        f.style.setProperty('--delay', (Math.random() * 2) + 's');
        container.appendChild(f);
    }

    // Funkelnde Sterne (20 Stück)
    for (var k = 0; k < 20; k++) {
        var s = document.createElement('div');
        s.className = 'splash__particle splash__particle--star';
        s.style.left = (10 + Math.random() * 80) + '%';
        s.style.top = (10 + Math.random() * 80) + '%';
        s.style.setProperty('--dur', (0.8 + Math.random() * 1.5) + 's');
        s.style.setProperty('--delay', (Math.random() * 2.5) + 's');
        container.appendChild(s);
    }

    splash.addEventListener('click', function() {
        splash.classList.add('splash--hidden');
        setTimeout(function() { splash.remove(); }, 1000);
    });
}
