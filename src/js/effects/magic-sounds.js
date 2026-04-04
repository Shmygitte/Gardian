/**
 * Magic Sounds – spielt Sound-Samples bei Effekten ab
 */
const MagicSounds = {
    _cache: {},

    _isEnabled: function() {
        return !!window.soundsEnabled;
    },

    _play: function(src, volume, startTime) {
        if (!this._isEnabled()) return;
        if (!this._cache[src]) {
            this._cache[src] = new Audio(src);
        }
        const audio = this._cache[src];
        audio.volume = volume ?? 0.4;
        audio.currentTime = startTime || 0;
        audio.play().catch(() => {});
    },

    playDuplicate: function() {
        this._play('assets/sounds/duplicate.mp3');
    },

    playMove: function() {
        this._play('assets/sounds/move.mp3');
    },

    playPlace: function() {
        this._play('assets/sounds/platzieren.mp3', 0.7);
    },

    playBubbles: function() {
        this._play('assets/sounds/bubbles.mp3');
    },

    playConfetti: function() {
        this._play('assets/sounds/confetti.mp3', 1.0, 0.3);
    },

    playDelete: function() {
        this._play('assets/sounds/delete.mp3');
    },

    _panFadeTimeout: null,
    _panFadeInterval: null,

    playPan: function() {
        if (!this._isEnabled()) return;
        const src = 'assets/sounds/zoom.mp3';
        if (!this._cache[src]) {
            this._cache[src] = new Audio(src);
            this._cache[src].loop = true;
        }
        const audio = this._cache[src];

        // Fade-Out abbrechen falls laufend
        clearTimeout(this._panFadeTimeout);
        clearInterval(this._panFadeInterval);

        // Starten falls nicht schon laufend
        if (audio.paused) {
            audio.volume = 0.4;
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } else {
            audio.volume = 0.4;
        }

        // Fade-Out starten wenn 150ms kein neuer Pan-Call kommt
        this._panFadeTimeout = setTimeout(() => {
            this._panFadeInterval = setInterval(() => {
                if (audio.volume > 0.02) {
                    audio.volume = Math.max(0, audio.volume - 0.04);
                } else {
                    audio.pause();
                    audio.volume = 0.4;
                    clearInterval(this._panFadeInterval);
                }
            }, 20);
        }, 150);
    },

    _gardenFadeInterval: null,

    playGarden: function() {
        if (!this._isEnabled()) return;
        const src = 'assets/sounds/garden.mp3';
        if (!this._cache[src]) {
            this._cache[src] = new Audio(src);
            this._cache[src].loop = true;
        }
        const audio = this._cache[src];
        clearInterval(this._gardenFadeInterval);
        audio.volume = 0.4;
        audio.currentTime = 0;
        audio.play().catch(() => {});
    },

    stopGarden: function() {
        const src = 'assets/sounds/garden.mp3';
        const audio = this._cache[src];
        if (!audio || audio.paused) return;
        clearInterval(this._gardenFadeInterval);
        this._gardenFadeInterval = setInterval(() => {
            if (audio.volume > 0.02) {
                audio.volume = Math.max(0, audio.volume - 0.02);
            } else {
                audio.pause();
                audio.volume = 0.4;
                clearInterval(this._gardenFadeInterval);
            }
        }, 30);
    },

    _zoomFadeTimeout: null,
    _zoomFadeInterval: null,

    playZoom: function() {
        if (!this._isEnabled()) return;
        const src = 'assets/sounds/zoom.mp3';
        if (!this._cache[src]) {
            this._cache[src] = new Audio(src);
            this._cache[src].loop = true;
        }
        const audio = this._cache[src];

        clearTimeout(this._zoomFadeTimeout);
        clearInterval(this._zoomFadeInterval);

        if (audio.paused) {
            audio.volume = 0.7;
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } else {
            audio.volume = 0.7;
        }

        this._zoomFadeTimeout = setTimeout(() => {
            this._zoomFadeInterval = setInterval(() => {
                if (audio.volume > 0.02) {
                    audio.volume = Math.max(0, audio.volume - 0.04);
                } else {
                    audio.pause();
                    audio.volume = 0.4;
                    clearInterval(this._zoomFadeInterval);
                }
            }, 20);
        }, 150);
    }
};
