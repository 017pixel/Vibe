document.addEventListener('DOMContentLoaded', () => {

    // --- DATABASE MANAGEMENT (IndexedDB) ---
    const db = {
        _db: null,
        _dbName: 'VibeDB',
        _storeName: 'AppState',
        init() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this._dbName, 1);
                request.onerror = (event) => reject("IndexedDB error: " + request.error);
                request.onsuccess = (event) => {
                    this._db = event.target.result;
                    resolve(this);
                };
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    db.createObjectStore(this._storeName);
                };
            });
        },
        get(key) {
            return new Promise((resolve, reject) => {
                if (!this._db) return reject("DB not initialized");
                const transaction = this._db.transaction([this._storeName], "readonly");
                const store = transaction.objectStore(this._storeName);
                const request = store.get(key);
                request.onerror = (event) => reject("Error getting data from DB: " + request.error);
                request.onsuccess = (event) => resolve(request.result);
            });
        },
        set(key, value) {
            return new Promise((resolve, reject) => {
                if (!this._db) return reject("DB not initialized");
                const transaction = this._db.transaction([this._storeName], "readwrite");
                const store = transaction.objectStore(this._storeName);
                const request = store.put(value, key);
                request.onerror = (event) => reject("Error setting data in DB: " + request.error);
                request.onsuccess = (event) => resolve(request.result);
            });
        }
    };

    // --- STATE MANAGEMENT ---
    let state = {};
    const defaultState = {
        userData: {
            coins: 0,
            unlockedEmojis: ['🌲', '🍄'],
            streak: 0,
            lastSessionDate: null,
            lastCheckedDate: null, // Datum der letzten Streak-Prüfung
        },
        sessions: [],
        settings: {
            theme: 'light',
            language: 'de',
        },
        currentScreen: 'focus',
        isSessionActive: false,
        timer: {
            mode: 'pomodoro',
            intervalId: null,
            startTime: 0,
            pomodoroDuration: 25 * 60,
            elapsedSeconds: 0,
        },
        selectedEmoji: '🌲'
    };

    // --- CONSTANTS ---
    const SHOP_ITEMS = [
        // Basics
        { emoji: '🌲', price: 0, name: { de: 'Nadelbaum', en: 'Conifer' } },
        { emoji: '🍄', price: 0, name: { de: 'Pilz', en: 'Mushroom' } },
        
        // Forest Plants
        { emoji: '🌳', price: 100, name: { de: 'Laubbaum', en: 'Deciduous Tree' } },
        { emoji: '🌿', price: 120, name: { de: 'Kraut', en: 'Herb' } },
        { emoji: '☘️', price: 150, name: { de: 'Klee', en: 'Shamrock' } },
        { emoji: '🍁', price: 250, name: { de: 'Ahorn', en: 'Maple' } },
        { emoji: '🍂', price: 280, name: { de: 'Herbstblatt', en: 'Fallen Leaf' } },
        { emoji: '🪵', price: 300, name: { de: 'Holz', en: 'Wood' } },

        // Garden Flowers
        { emoji: '🌸', price: 200, name: { de: 'Kirschblüte', en: 'Cherry Blossom' } },
        { emoji: '🌷', price: 220, name: { de: 'Tulpe', en: 'Tulip' } },
        { emoji: '🌹', price: 300, name: { de: 'Rose', en: 'Rose' } },
        { emoji: '🌻', price: 350, name: { de: 'Sonnenblume', en: 'Sunflower' } },
        { emoji: '🌼', price: 400, name: { de: 'Gänseblümchen', en: 'Blossom' } },
        { emoji: '🌺', price: 450, name: { de: 'Hibiskus', en: 'Hibiscus' } },
        { emoji: '🪷', price: 700, name: { de: 'Lotus', en: 'Lotus' } },

        // Exotic & Special Plants
        { emoji: '🌴', price: 500, name: { de: 'Palme', en: 'Palm Tree' } },
        { emoji: '🌵', price: 600, name: { de: 'Kaktus', en: 'Cactus' } },
        { emoji: '🌾', price: 800, name: { de: 'Reispflanze', en: 'Sheaf of Rice' } },
        { emoji: '🎋', price: 1200, name: { de: 'Bambus', en: 'Tanabata Tree' } },
        { emoji: '🪴', price: 1500, name: { de: 'Topfpflanze', en: 'Potted Plant' } },
        { emoji: '✨', price: 2000, name: { de: 'Glitzer', en: 'Sparkles' } },

        // Small Creatures
        { emoji: '🐛', price: 150, name: { de: 'Raupe', en: 'Bug' } },
        { emoji: '🐌', price: 180, name: { de: 'Schnecke', en: 'Snail' } },
        { emoji: '🐜', price: 220, name: { de: 'Ameise', en: 'Ant' } },
        { emoji: '🐝', price: 300, name: { de: 'Biene', en: 'Honeybee' } },
        { emoji: '🐞', price: 350, name: { de: 'Marienkäfer', en: 'Lady Beetle' } },
        { emoji: '🦋', price: 600, name: { de: 'Schmetterling', en: 'Butterfly' } },
        { emoji: '🦗', price: 650, name: { de: 'Grille', en: 'Cricket' } },
        { emoji: '🪲', price: 700, name: { de: 'Käfer', en: 'Beetle' } },

        // Forest & Mythical Animals
        { emoji: '🐿️', price: 800, name: { de: 'Eichhörnchen', en: 'Squirrel' } },
        { emoji: '🦔', price: 900, name: { de: 'Igel', en: 'Hedgehog' } },
        { emoji: '🐇', price: 1000, name: { de: 'Hase', en: 'Rabbit' } },
        { emoji: '🦊', price: 1500, name: { de: 'Fuchs', en: 'Fox' } },
        { emoji: '🐻', price: 1800, name: { de: 'Bär', en: 'Bear' } },
        { emoji: '🦉', price: 2000, name: { de: 'Eule', en: 'Owl' } },
        { emoji: '🦌', price: 2500, name: { de: 'Hirsch', en: 'Deer' } },
        { emoji: '🐺', price: 2800, name: { de: 'Wolf', en: 'Wolf' } },
        { emoji: '🦝', price: 3000, name: { de: 'Waschbär', en: 'Raccoon' } },
        { emoji: '🦄', price: 7500, name: { de: 'Einhorn', en: 'Unicorn' } },
        { emoji: '🐉', price: 10000, name: { de: 'Drache', en: 'Dragon' } },
        
        // Special Items
        { emoji: '🏕️', price: 3000, name: { de: 'Zelt', en: 'Camping' } },
        { emoji: '🏡', price: 4000, name: { de: 'Häuschen', en: 'Cottage' } },
        { emoji: '🛖', price: 4500, name: { de: 'Hütte', en: 'Hut' } },
        { emoji: '⛲', price: 5000, name: { de: 'Brunnen', en: 'Fountain' } },
        { emoji: '🗿', price: 6000, name: { de: 'Moai', en: 'Moyai' } },
        { emoji: '🔮', price: 8000, name: { de: 'Kristallkugel', en: 'Crystal Ball' } },
        { emoji: '💎', price: 12000, name: { de: 'Diamant', en: 'Gem Stone' } },
    ];

    const I18N = {
        de: {
            nav_focus: 'Fokus', nav_forest: 'Wald', nav_shop: 'Shop', nav_stats: 'Statistik',
            settings_title: 'Einstellungen', settings_theme: 'Dark Mode / Light Mode', settings_language: 'Sprache',
            settings_export: 'Daten exportieren', settings_import: 'Daten importieren',
            focus_start: 'Start', focus_stop: 'Stopp',
            focus_pomodoro: 'Pomodoro', focus_stopwatch: 'Stopuhr',
            shop_buy: 'Kaufen', shop_unlocked: 'Frei', stat_streak: 'Aktueller Streak', stat_streak_days: 'Tage',
            stat_total: 'Sitzungen gesamt', stat_total_hours: 'Stunden insgesamt', stat_weekly: 'Minuten diese Woche',
            stat_yearly: 'Jahresübersicht', stat_day_sun: 'So', stat_day_mon: 'Mo', stat_day_tue: 'Di',
            stat_day_wed: 'Mi', stat_day_thu: 'Do', stat_day_fri: 'Fr', stat_day_sat: 'Sa',
            widget_header: 'Pflanze als Nächstes:', widget_planted: 'Gepflanzt', widget_random_name: 'Zufällig', widget_select_title: 'Pflanze wählen'
        },
        en: {
            nav_focus: 'Focus', nav_forest: 'Forest', nav_shop: 'Shop', nav_stats: 'Stats',
            settings_title: 'Settings', settings_theme: 'Dark Mode / Light Mode', settings_language: 'Language',
            settings_export: 'Export Data', settings_import: 'Import Data',
            focus_start: 'Start', focus_stop: 'Stop',
            focus_pomodoro: 'Pomodoro', focus_stopwatch: 'Stopwatch',
            shop_buy: 'Buy', shop_unlocked: 'Owned', stat_streak: 'Current Streak', stat_streak_days: 'Days',
            stat_total: 'Total Sessions', stat_total_hours: 'Total Hours', stat_weekly: 'Minutes this week',
            stat_yearly: 'Yearly Activity', stat_day_sun: 'Sun', stat_day_mon: 'Mon', stat_day_tue: 'Tue',
            stat_day_wed: 'Wed', stat_day_thu: 'Thu', stat_day_fri: 'Fri', stat_day_sat: 'Sat',
            widget_header: 'Plant next:', widget_planted: 'Planted', widget_random_name: 'Random', widget_select_title: 'Select Plant'
        }
    };
    
    const MOTIVATIONAL_QUOTES = {
        de: ["Jeder Schritt zählt.", "Konzentration ist der Schlüssel.", "Bleib dran, du schaffst das!", "Eine Minute nach der anderen.", "Wachstum braucht Zeit und Fokus."],
        en: ["Every step counts.", "Concentration is the key.", "Keep going, you can do it!", "One minute at a time.", "Growth needs time and focus."]
    };

    // --- DOM ELEMENTS ---
    const mainContent = document.getElementById('main-content');
    const coinCountEl = document.getElementById('coin-count');
    const streakCountEl = document.getElementById('streak-count');
    const navButtons = document.querySelectorAll('.nav-button');
    const settingsButton = document.getElementById('settings-button');
    const settingsSheet = document.getElementById('settings-sheet');
    const themeToggle = document.getElementById('theme-toggle');
    const languageSelect = document.getElementById('language-select');
    const bottomNav = document.getElementById('bottom-nav');
    const mainHeader = document.getElementById('main-header');
    const emojiSelectionSheet = document.getElementById('emoji-selection-sheet');
    const emojiGridContainer = document.getElementById('emoji-grid-container');
    const exportDataButton = document.getElementById('export-data-button');
    const importDataButton = document.getElementById('import-data-button');
    const importFileInput = document.getElementById('import-file-input');

    // --- DATA PERSISTENCE ---
    async function saveData() {
        try {
            await db.set('appState', state);
        } catch (error) {
            console.error("Failed to save state:", error);
        }
    }

    async function loadData() {
        try {
            const savedState = await db.get('appState');
            if (savedState) {
                state = {
                    ...defaultState,
                    ...savedState,
                    userData: { ...defaultState.userData, ...savedState.userData },
                    settings: { ...defaultState.settings, ...savedState.settings },
                    timer: { ...defaultState.timer, ...savedState.timer }
                };
                state.isSessionActive = false;
                state.timer.intervalId = null;
            } else {
                state = { ...defaultState };
            }
        } catch (error) {
            console.error("Failed to load state, using default state:", error);
            state = { ...defaultState };
        }
    }

    // --- DATA MANAGEMENT ---
    function exportData() {
        try {
            const stateToExport = JSON.parse(JSON.stringify(state));
            delete stateToExport.isSessionActive;
            if (stateToExport.timer) {
                delete stateToExport.timer.intervalId;
            }

            const dataStr = JSON.stringify(stateToExport, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `vibe-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('Daten erfolgreich exportiert!');
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Fehler beim Exportieren der Daten.');
        }
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedState = JSON.parse(e.target.result);

                if (importedState.userData && importedState.sessions && importedState.settings) {
                    const mergedState = {
                        ...defaultState,
                        ...importedState,
                        userData: { ...defaultState.userData, ...importedState.userData },
                        settings: { ...defaultState.settings, ...importedState.settings },
                        timer: { ...defaultState.timer, ...importedState.timer }
                    };
                    
                    state = mergedState;
                    state.isSessionActive = false;
                    state.timer.intervalId = null;

                    // *** DIE ENTSCHEIDENDE KORREKTUR ***
                    // Setze das Prüfdatum auf heute, um zu verhindern,
                    // dass checkStreak() den importierten Streak sofort zurücksetzt.
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    state.userData.lastCheckedDate = today.toISOString().split('T')[0];

                    await saveData();
                    alert('Daten erfolgreich importiert! Die App wird neu geladen.');
                    location.reload();
                } else {
                    alert('Ungültige Datei. Bitte wähle eine gültige Vibe-Backup-Datei.');
                }
            } catch (error) {
                console.error('Error importing data:', error);
                alert('Fehler beim Importieren der Daten. Die Datei ist möglicherweise beschädigt oder hat ein falsches Format.');
            } finally {
                importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    }

    // --- CORE LOGIC ---
    function completeSession(minutes) {
        if (minutes < 1) return;

        const coinsEarned = minutes;
        state.userData.coins += coinsEarned;

        let plantedEmoji = state.selectedEmoji === 'random'
            ? state.userData.unlockedEmojis[Math.floor(Math.random() * state.userData.unlockedEmojis.length)]
            : state.selectedEmoji;

        state.sessions.push({
            date: new Date().toISOString(),
            duration: minutes,
            emoji: plantedEmoji,
        });

        updateStreak();
        stopTimer();
        saveData();
        updateUI();
    }

    function buyEmoji(emoji, price) {
        if (state.userData.coins >= price && !state.userData.unlockedEmojis.includes(emoji)) {
            state.userData.coins -= price;
            state.userData.unlockedEmojis.push(emoji);
            saveData();
            updateUI();
        }
    }

    function checkStreak() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        if (state.userData.lastCheckedDate === todayStr) {
            return;
        }

        if (state.userData.lastSessionDate) {
            const lastSession = new Date(state.userData.lastSessionDate);
            lastSession.setHours(0, 0, 0, 0);

            const diffTime = today - lastSession;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 1) {
                state.userData.streak = 0;
            }
        } else {
             state.userData.streak = 0;
        }

        state.userData.lastCheckedDate = todayStr;
        saveData();
    }

    function updateStreak() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastSession = state.userData.lastSessionDate ? new Date(state.userData.lastSessionDate) : null;
        if (lastSession) {
            lastSession.setHours(0, 0, 0, 0);
        }

        state.userData.lastSessionDate = today.toISOString();

        if (!lastSession) {
            state.userData.streak = 1;
            return;
        }
        
        if (lastSession.getTime() === today.getTime()) {
            if (state.userData.streak === 0) {
                state.userData.streak = 1;
            }
            return;
        }

        const diffTime = today - lastSession;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            state.userData.streak += 1;
        } else if (diffDays > 1) {
            state.userData.streak = 1;
        }
    }

    // --- TIMER FUNCTIONS ---
    function startTimer() {
        state.isSessionActive = true;
        state.timer.startTime = Date.now();
        state.timer.elapsedSeconds = state.timer.mode === 'pomodoro' ? state.timer.pomodoroDuration : 0;

        updateTimerDisplay();
        state.timer.intervalId = setInterval(updateTimer, 1000);
        
        toggleDistractionFreeMode(true);
        updateFocusScreen();
    }

    function stopTimer() {
        clearInterval(state.timer.intervalId);
        state.isSessionActive = false;
        state.timer.intervalId = null;
        
        toggleDistractionFreeMode(false);
        renderScreen(state.currentScreen);
    }

    function updateTimer() {
        if (!state.isSessionActive) return;

        if (state.timer.mode === 'pomodoro') {
            state.timer.elapsedSeconds--;
            if (state.timer.elapsedSeconds <= 0) {
                const minutes = Math.floor(state.timer.pomodoroDuration / 60);
                completeSession(minutes);
                alert(`Pomodoro (${minutes} min) complete!`);
            }
        } else { // Stopwatch mode
            state.timer.elapsedSeconds++;
        }
        updateTimerDisplay();
    }
    
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.textContent = formatTime(state.timer.elapsedSeconds);
        }
    }

    function toggleDistractionFreeMode(isActive) {
        bottomNav.style.display = isActive ? 'none' : 'flex';
        mainHeader.style.display = isActive ? 'none' : 'flex';
    }

    // --- UI RENDERING ---
    function updateUI() {
        coinCountEl.textContent = state.userData.coins;
        streakCountEl.textContent = state.userData.streak;
        
        streakCountEl.classList.remove('active-streak', 'streak-in-danger');
        if (state.userData.streak > 0 && state.userData.lastSessionDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const lastSessionDate = new Date(state.userData.lastSessionDate);
            lastSessionDate.setHours(0, 0, 0, 0);

            if (lastSessionDate.getTime() < today.getTime()) {
                streakCountEl.classList.add('streak-in-danger');
            } else {
                streakCountEl.classList.add('active-streak');
            }
        }
        
        applyTheme();
        renderScreen(state.currentScreen);
        applyLanguage();
    }
    
    function renderScreen(screenName) {
        mainContent.innerHTML = '';
        state.currentScreen = screenName;

        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screenName);
        });

        switch (screenName) {
            case 'focus': renderFocusScreen(); break;
            case 'forest': renderForestScreen(); break;
            case 'shop': renderShopScreen(); break;
            case 'stats': renderStatsScreen(); break;
        }
        applyLanguage();
    }

    // --- SCREEN RENDER FUNCTIONS ---

    function renderFocusScreen() {
        mainContent.innerHTML = `<div class="focus-screen"></div>`;
        const focusScreen = mainContent.querySelector('.focus-screen');
        const isPomodoro = state.timer.mode === 'pomodoro';
        focusScreen.innerHTML = `
            <div class="timer-mode-selector">
                <button class="mode-button ${isPomodoro ? 'active' : ''}" data-mode="pomodoro" data-lang-key="focus_pomodoro"></button>
                <button class="mode-button ${!isPomodoro ? 'active' : ''}" data-mode="stopwatch" data-lang-key="focus_stopwatch"></button>
            </div>
            <div class="timer-display">${formatTime(isPomodoro ? state.timer.pomodoroDuration : 0)}</div>
            <div class="motivational-quote"></div>
            <div class="pomodoro-options" style="display: ${isPomodoro ? 'flex' : 'none'}">
                ${[15, 25, 50].map(min => `
                    <button class="time-option ${state.timer.pomodoroDuration === min * 60 ? 'selected' : ''}" data-minutes="${min}">${min} min</button>
                `).join('')}
            </div>
            <button class="start-stop-button" id="start-stop-btn" data-lang-key="${state.isSessionActive ? 'focus_stop' : 'focus_start'}"></button>
        `;
        addFocusScreenListeners();
    }
    
    function addFocusScreenListeners() {
        document.getElementById('start-stop-btn')?.addEventListener('click', () => {
            if (state.isSessionActive) {
                const elapsedMinutes = Math.floor(state.timer.elapsedSeconds / 60);
                if (state.timer.mode === 'stopwatch' && elapsedMinutes > 0) {
                    completeSession(elapsedMinutes);
                } else {
                    stopTimer();
                }
            } else {
                startTimer();
            }
        });
        
        document.querySelectorAll('.mode-button').forEach(btn => {
            btn.onclick = (e) => {
                if(state.isSessionActive) return;
                state.timer.mode = e.target.dataset.mode;
                renderFocusScreen();
                saveData();
            };
        });

        document.querySelectorAll('.time-option').forEach(btn => {
            btn.onclick = (e) => {
                if(state.isSessionActive) return;
                state.timer.pomodoroDuration = parseInt(e.target.dataset.minutes) * 60;
                renderFocusScreen();
                saveData();
            };
        });

        updateFocusScreen();
    }

    function updateFocusScreen() {
        const quoteEl = document.querySelector('.motivational-quote');
        if (quoteEl) {
            if (state.isSessionActive) {
                const quotes = MOTIVATIONAL_QUOTES[state.settings.language];
                quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
            } else {
                quoteEl.textContent = '';
            }
        }
        const startStopBtn = document.getElementById('start-stop-btn');
        if(startStopBtn) {
            const key = state.isSessionActive ? 'focus_stop' : 'focus_start';
            startStopBtn.setAttribute('data-lang-key', key);
        }
        applyLanguage();
    }

    function renderForestScreen() {
        const lang = state.settings.language;
        let selected = state.selectedEmoji;
        let emojiToDisplay = '🎲';
        let emojiName = I18N[lang].widget_random_name;
        let plantedCount = state.sessions.length;

        if (selected !== 'random') {
            const item = SHOP_ITEMS.find(i => i.emoji === selected);
            if(item) {
                emojiToDisplay = item.emoji;
                emojiName = item.name[lang];
                plantedCount = state.sessions.filter(s => s.emoji === selected).length;
            }
        }

        mainContent.innerHTML = `
            <div class="forest-screen">
                ${state.sessions.map(session => {
                    const top = Math.random() * 70; // Keep plants above the widget
                    const left = Math.random() * 90;
                    return `<span class="planted-emoji" style="top: ${top}%; left: ${left}%;">${session.emoji}</span>`
                }).join('')}
                <div id="plant-next-widget">
                    <div class="widget-header" data-lang-key="widget_header"></div>
                    <div class="widget-body">
                        <div class="widget-emoji">${emojiToDisplay}</div>
                        <div class="widget-details">
                            <div class="widget-name">${emojiName}</div>
                            <div class="widget-count">${I18N[lang].widget_planted}: ${plantedCount}</div>
                        </div>
                        <div class="widget-change-indicator">›</div>
                    </div>
                </div>
            </div>`;
        
        document.getElementById('plant-next-widget').onclick = () => {
            renderEmojiSelectionSheet();
            toggleEmojiSheet(true);
        };
    }

    function renderShopScreen() {
        mainContent.innerHTML = `<div class="shop-grid"></div>`;
        const shopGrid = mainContent.querySelector('.shop-grid');
        shopGrid.innerHTML = `
            ${SHOP_ITEMS.map(item => {
                const isUnlocked = state.userData.unlockedEmojis.includes(item.emoji);
                const canAfford = state.userData.coins >= item.price;
                return `
                <div class="shop-item">
                    <div class="shop-item-emoji">${item.emoji}</div>
                    <div class="shop-item-price">💰 ${item.price}</div>
                    <button class="buy-button" data-emoji="${item.emoji}" data-price="${item.price}" ${isUnlocked || !canAfford ? 'disabled' : ''}>
                       <span data-lang-key="${isUnlocked ? 'shop_unlocked' : 'shop_buy'}"></span>
                    </button>
                </div>
            `}).join('')}
        `;

        document.querySelectorAll('.buy-button').forEach(btn => {
            if (!btn.disabled) {
                btn.onclick = () => buyEmoji(btn.dataset.emoji, parseInt(btn.dataset.price));
            }
        });
    }

    function renderStatsScreen() {
        mainContent.innerHTML = `<div class="stats-container"></div>`;
        const statsContainer = mainContent.querySelector('.stats-container');
        
        const totalSessions = state.sessions.length;
        const totalMinutes = state.sessions.reduce((sum, s) => sum + s.duration, 0);
        const totalHours = (totalMinutes / 60).toFixed(1);

        const dayLabels = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => I18N[state.settings.language][`stat_day_${d}`]);
        const weeklyMinutes = Array(7).fill(0);
        
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(new Date(today).setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);

        state.sessions.forEach(session => {
            const sessionDate = new Date(session.date);
            if (sessionDate >= startOfWeek) {
                const dayIndex = sessionDate.getDay();
                const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                weeklyMinutes[adjustedIndex] += session.duration;
            }
        });
        const totalWeeklyMinutes = weeklyMinutes.reduce((a, b) => a + b, 0);

        const maxMinutesInWeek = Math.max(...weeklyMinutes);
        let yAxisMax;
        if (maxMinutesInWeek <= 5) {
            yAxisMax = 5;
        } else if (maxMinutesInWeek <= 10) {
            yAxisMax = 10;
        } else if (maxMinutesInWeek <= 15) {
            yAxisMax = 15;
        } else if (maxMinutesInWeek <= 30) {
            yAxisMax = 30;
        } else if (maxMinutesInWeek <= 60) {
            yAxisMax = 60;
        } else {
            yAxisMax = Math.ceil(maxMinutesInWeek / 30) * 30;
        }
        if (maxMinutesInWeek === 0) yAxisMax = 10;
        
        const dailyActivity = {};
        state.sessions.forEach(s => {
            const dateStr = new Date(s.date).toISOString().split('T')[0];
            dailyActivity[dateStr] = (dailyActivity[dateStr] || 0) + s.duration;
        });

        let heatmapHTML = '';
        const daysInYear = 365;
        let d = new Date();
        d.setDate(d.getDate() - daysInYear + 1);
        const dayOffset = d.getDay();
        d.setDate(d.getDate() - dayOffset);

        for (let i = 0; i < daysInYear + dayOffset; i++) {
            const dateStr = d.toISOString().split('T')[0];
            const activity = dailyActivity[dateStr] || 0;
            let level = 0;
            if (activity > 0) level = 1; if (activity >= 30) level = 2; if (activity >= 60) level = 3; if (activity >= 120) level = 4;
            heatmapHTML += `<div class="heatmap-day" data-level="${level}" title="${dateStr}: ${activity} min"></div>`;
            d.setDate(d.getDate() + 1);
        }

        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Allgemein</h3>
                <div class="stat-row">
                    <span data-lang-key="stat_streak"></span>
                    <span class="stat-value">${state.userData.streak} <span style="font-size: 1rem;" data-lang-key="stat_streak_days"></span></span>
                </div>
                 <div class="stat-row">
                    <span data-lang-key="stat_total"></span>
                    <span class="stat-value">${totalSessions}</span>
                </div>
                <div class="stat-row">
                    <span data-lang-key="stat_total_hours"></span>
                    <span class="stat-value">${totalHours} <span style="font-size: 1rem;">h</span></span>
                </div>
            </div>
            <div class="stat-card">
                <h3 data-lang-key="stat_weekly"></h3>
                 <div class="stat-row" style="margin-bottom: 1rem;">
                    <span>Total</span>
                    <span class="stat-value">${totalWeeklyMinutes} <span style="font-size: 1rem;">min</span></span>
                </div>
                <div class="weekly-chart-wrapper">
                    <div class="y-axis">
                        <span>${yAxisMax}</span>
                        <span>${Math.round(yAxisMax / 2)}</span>
                        <span>0</span>
                    </div>
                    <div class="chart-container">
                        ${weeklyMinutes.map((mins, i) => `
                            <div class="chart-bar" style="height: ${yAxisMax > 0 ? (mins / yAxisMax) * 100 : 0}%" title="${dayLabels[i]}: ${mins} min">
                                <div class="bar-label">${dayLabels[i]}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="stat-card">
                <h3 data-lang-key="stat_yearly"></h3>
                <div class="heatmap-wrapper"><div class="heatmap-container">${heatmapHTML}</div></div>
            </div>
        `;

        const heatmapWrapper = document.querySelector('.heatmap-wrapper');
        if (heatmapWrapper) {
            heatmapWrapper.scrollLeft = heatmapWrapper.scrollWidth;
        }
    }


    // --- MODALS & SHEETS ---
    function applyTheme() {
        document.body.classList.toggle('dark', state.settings.theme === 'dark');
        themeToggle.checked = state.settings.theme === 'dark';
    }

    function applyLanguage() {
        const lang = state.settings.language;
        if (!I18N[lang]) return;
        languageSelect.value = lang;
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            if (I18N[lang][key]) {
                el.textContent = I18N[lang][key];
            }
        });
    }

    function toggleSettingsSheet(show) {
        settingsSheet.classList.toggle('hidden', !show);
    }
    
    function toggleEmojiSheet(show) {
        emojiSelectionSheet.classList.toggle('hidden', !show);
    }

    function renderEmojiSelectionSheet() {
        emojiGridContainer.innerHTML = '';
        const options = ['random', ...state.userData.unlockedEmojis];
        options.forEach(emoji => {
            const item = document.createElement('div');
            item.className = 'emoji-selection-item';
            item.dataset.emoji = emoji;
            item.textContent = emoji === 'random' ? '🎲' : emoji;
            if (state.selectedEmoji === emoji) {
                item.classList.add('selected');
            }
            emojiGridContainer.appendChild(item);
        });
    }

    // --- EVENT LISTENERS ---
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!state.isSessionActive) {
                renderScreen(button.dataset.screen);
            }
        });
    });

    settingsButton.addEventListener('click', () => toggleSettingsSheet(true));
    settingsSheet.addEventListener('click', (e) => {
        if(e.target === settingsSheet) toggleSettingsSheet(false);
    });

    exportDataButton.addEventListener('click', exportData);
    importDataButton.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importData);

    emojiSelectionSheet.addEventListener('click', (e) => {
        if (e.target === emojiSelectionSheet) {
            toggleEmojiSheet(false);
        }
    });

    emojiGridContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.emoji-selection-item');
        if (target) {
            state.selectedEmoji = target.dataset.emoji;
            saveData();
            renderForestScreen();
            toggleEmojiSheet(false);
        }
    });

    themeToggle.addEventListener('change', (e) => {
        state.settings.theme = e.target.checked ? 'dark' : 'light';
        applyTheme();
        saveData();
    });

    languageSelect.addEventListener('change', (e) => {
        state.settings.language = e.target.value;
        saveData();
        updateUI();
    });

    // --- INITIALIZATION ---
    async function init() {
        try {
            await db.init();
            await loadData();
            checkStreak(); 
            updateUI();
        } catch (error) {
            console.error("Application initialization failed:", error);
            document.body.innerHTML = "Error: Could not load application data. Please try again later.";
        }
    }

    init();
});