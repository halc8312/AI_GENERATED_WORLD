/* ============================================
   創世界 (Sousekai) - メインコントローラー
   AIが紡ぐ世界のメインエントリーポイント
   ============================================ */

(function () {
    'use strict';

    // 世界の状態
    var world = {
        currentSection: 'genesis',
        isPaused: false,
        speed: 1,
        initialized: false,
        modules: {}
    };

    // ローディングシーケンス
    var loadingSteps = [
        { message: '虚無から空間を紡いでいます...', progress: 10 },
        { message: '宇宙の法則を刻んでいます...', progress: 20 },
        { message: '恒星の火を灯しています...', progress: 35 },
        { message: '大地を隆起させています...', progress: 50 },
        { message: '海を満たしています...', progress: 60 },
        { message: '大気を纏わせています...', progress: 70 },
        { message: '生命の種を蒔いています...', progress: 80 },
        { message: '文明の灯を点しています...', progress: 90 },
        { message: '時間の流れを解き放ちます...', progress: 100 }
    ];

    function runLoadingSequence(callback) {
        var barFill = document.getElementById('loading-bar-fill');
        var statusText = document.getElementById('loading-status');
        var currentStep = 0;

        function nextStep() {
            if (currentStep >= loadingSteps.length) {
                setTimeout(function () {
                    var loadingScreen = document.getElementById('loading-screen');
                    if (loadingScreen) {
                        loadingScreen.classList.add('hidden');
                    }
                    callback();
                }, 500);
                return;
            }

            var step = loadingSteps[currentStep];
            if (barFill) barFill.style.width = step.progress + '%';
            if (statusText) statusText.textContent = step.message;
            currentStep++;

            setTimeout(nextStep, 300 + Math.random() * 200);
        }

        nextStep();
    }

    // ナビゲーション制御
    function setupNavigation() {
        var navLinks = document.querySelectorAll('.nav-link');
        var proceedButtons = document.querySelectorAll('.section-proceed');

        // ナビリンクのクリック
        for (var i = 0; i < navLinks.length; i++) {
            navLinks[i].addEventListener('click', function (e) {
                e.preventDefault();
                var targetSection = this.getAttribute('data-section');
                if (targetSection) {
                    switchSection(targetSection);
                }
            });
        }

        // 「次へ」ボタンのクリック
        for (var j = 0; j < proceedButtons.length; j++) {
            proceedButtons[j].addEventListener('click', function () {
                var nextSection = this.getAttribute('data-next');
                if (nextSection) {
                    switchSection(nextSection);
                }
            });
        }

        // 一時停止ボタン
        var pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function () {
                world.isPaused = !world.isPaused;
                this.textContent = world.isPaused ? '▶' : '⏸';
                this.title = world.isPaused ? '再開' : '一時停止';

                if (world.isPaused) {
                    stopCurrentModule();
                } else {
                    startCurrentModule();
                }
            });
        }

        // 速度ボタン
        var speedBtn = document.getElementById('btn-speed');
        if (speedBtn) {
            speedBtn.addEventListener('click', function () {
                world.speed = world.speed >= 4 ? 1 : world.speed * 2;
                this.textContent = '×' + world.speed;
            });
        }

        // 地質年代セレクター
        var eraSelect = document.getElementById('geological-era');
        if (eraSelect) {
            eraSelect.addEventListener('change', function () {
                GeologyModule.setEra(this.value);
            });
        }

        // 再創造ボタン
        var rebirthBtn = document.getElementById('btn-rebirth');
        if (rebirthBtn) {
            rebirthBtn.addEventListener('click', function () {
                rebirthWorld();
            });
        }
    }

    function switchSection(sectionId) {
        // 現在のセクションを非アクティブに
        stopCurrentModule();

        var sections = document.querySelectorAll('.world-section');
        for (var i = 0; i < sections.length; i++) {
            sections[i].classList.remove('active');
        }

        var navLinks = document.querySelectorAll('.nav-link');
        for (var j = 0; j < navLinks.length; j++) {
            navLinks[j].classList.remove('active');
        }

        // 新しいセクションをアクティブに
        var targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        var targetNav = document.querySelector('.nav-link[data-section="' + sectionId + '"]');
        if (targetNav) {
            targetNav.classList.add('active');
        }

        world.currentSection = sectionId;

        // モジュールの初期化と開始
        initializeModule(sectionId);
        if (!world.isPaused) {
            startCurrentModule();
        }

        // ページトップにスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function initializeModule(sectionId) {
        if (world.modules[sectionId]) return; // 初期化済み

        switch (sectionId) {
            case 'genesis':
                initGenesis();
                world.modules.genesis = true;
                break;
            case 'cosmos':
                UniverseModule.init('cosmos-canvas');
                world.modules.cosmos = true;
                break;
            case 'earth':
                GeologyModule.init('earth-canvas');
                world.modules.earth = true;
                break;
            case 'ocean':
                // 海洋は気象モジュールと統合
                if (!world.modules.atmosphere) {
                    WeatherModule.init('atmosphere-canvas', 'ocean-canvas');
                    world.modules.atmosphere = true;
                    world.modules.ocean = true;
                }
                break;
            case 'atmosphere':
                if (!world.modules.atmosphere) {
                    WeatherModule.init('atmosphere-canvas', 'ocean-canvas');
                    world.modules.atmosphere = true;
                    world.modules.ocean = true;
                }
                break;
            case 'life':
                LifeModule.init('life-canvas');
                world.modules.life = true;
                break;
            case 'civilization':
                CivilizationModule.init('civilization-canvas', 'civ-map-canvas');
                world.modules.civilization = true;
                break;
            case 'time':
                TimeModule.init('time-canvas');
                world.modules.time = true;
                break;
        }
    }

    function startCurrentModule() {
        switch (world.currentSection) {
            case 'cosmos':
                UniverseModule.start();
                break;
            case 'earth':
                GeologyModule.start();
                break;
            case 'ocean':
            case 'atmosphere':
                WeatherModule.start();
                break;
            case 'life':
                LifeModule.start();
                break;
            case 'civilization':
                CivilizationModule.start();
                break;
            case 'time':
                TimeModule.start();
                break;
        }
    }

    function stopCurrentModule() {
        // すべてのモジュールを停止
        if (world.modules.cosmos) UniverseModule.stop();
        if (world.modules.earth) GeologyModule.stop();
        if (world.modules.atmosphere || world.modules.ocean) WeatherModule.stop();
        if (world.modules.life) LifeModule.stop();
        if (world.modules.civilization) CivilizationModule.stop();
        if (world.modules.time) TimeModule.stop();
    }

    // 創世セクションの特別な初期化
    function initGenesis() {
        var genesisCanvas = document.getElementById('genesis-canvas');
        if (!genesisCanvas) return;

        var gCtx = genesisCanvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var rect = genesisCanvas.getBoundingClientRect();
        genesisCanvas.width = genesisCanvas.clientWidth * dpr;
        genesisCanvas.height = (genesisCanvas.clientHeight || 400) * dpr;
        gCtx.scale(dpr, dpr);

        var gWidth = genesisCanvas.clientWidth;
        var gHeight = genesisCanvas.clientHeight || 400;

        var bigBangParticles = [];
        var bigBangPhase = 0;
        var genesisTime = 0;

        // ビッグバン粒子の生成
        function createBigBangParticles() {
            bigBangParticles = [];
            for (var i = 0; i < 500; i++) {
                var angle = Math.random() * Math.PI * 2;
                var speed = 0.5 + Math.random() * 3;
                bigBangParticles.push({
                    x: gWidth / 2,
                    y: gHeight / 2,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 0.5 + Math.random() * 2,
                    hue: Math.random() * 60 + 20, // 暖色系
                    alpha: 0.5 + Math.random() * 0.5,
                    deceleration: 0.995 + Math.random() * 0.003
                });
            }
        }

        createBigBangParticles();

        function animateGenesis() {
            gCtx.fillStyle = 'rgba(5, 5, 15, 0.08)';
            gCtx.fillRect(0, 0, gWidth, gHeight);

            genesisTime++;
            bigBangPhase = Math.min(1, genesisTime / 300);

            // 統計の更新
            var timeEl = document.getElementById('stat-time');
            var energyEl = document.getElementById('stat-energy');
            var tempEl = document.getElementById('stat-temp');

            if (bigBangPhase < 0.1) {
                if (timeEl) timeEl.textContent = '10⁻⁴³秒';
                if (energyEl) energyEl.textContent = '∞';
                if (tempEl) tempEl.textContent = '10³²';
            } else if (bigBangPhase < 0.3) {
                if (timeEl) timeEl.textContent = '10⁻³⁶秒';
                if (energyEl) energyEl.textContent = '10¹⁰⁰';
                if (tempEl) tempEl.textContent = '10²⁸';
            } else if (bigBangPhase < 0.6) {
                if (timeEl) timeEl.textContent = '3分';
                if (energyEl) energyEl.textContent = '10⁶⁰';
                if (tempEl) tempEl.textContent = '10⁹';
            } else if (bigBangPhase < 0.8) {
                if (timeEl) timeEl.textContent = '38万年';
                if (energyEl) energyEl.textContent = '10³⁰';
                if (tempEl) tempEl.textContent = '3000';
            } else {
                if (timeEl) timeEl.textContent = SousekaiUtils.formatNumber(Math.round(bigBangPhase * 138 * 1e8));
                if (energyEl) energyEl.textContent = '10⁻⁹';
                if (tempEl) tempEl.textContent = '2.7';
            }

            // 中心のフラッシュ
            if (bigBangPhase < 0.2) {
                var flashIntensity = 1 - bigBangPhase * 5;
                var flash = gCtx.createRadialGradient(gWidth / 2, gHeight / 2, 0, gWidth / 2, gHeight / 2, 100 * (1 - flashIntensity));
                flash.addColorStop(0, 'rgba(255, 255, 255, ' + flashIntensity + ')');
                flash.addColorStop(0.5, 'rgba(255, 200, 100, ' + flashIntensity * 0.5 + ')');
                flash.addColorStop(1, 'rgba(255, 100, 50, 0)');
                gCtx.fillStyle = flash;
                gCtx.beginPath();
                gCtx.arc(gWidth / 2, gHeight / 2, 100, 0, Math.PI * 2);
                gCtx.fill();
            }

            // 粒子の更新と描画
            for (var i = 0; i < bigBangParticles.length; i++) {
                var p = bigBangParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= p.deceleration;
                p.vy *= p.deceleration;
                p.alpha *= 0.999;

                if (p.alpha < 0.01) continue;

                gCtx.fillStyle = 'hsla(' + p.hue + ', 80%, 70%, ' + p.alpha + ')';
                gCtx.beginPath();
                gCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                gCtx.fill();
            }

            // 宇宙背景放射（後期）
            if (bigBangPhase > 0.5) {
                for (var s = 0; s < 5; s++) {
                    var sx = Math.random() * gWidth;
                    var sy = Math.random() * gHeight;
                    gCtx.fillStyle = 'rgba(200, 200, 255, ' + (0.1 + Math.random() * 0.2) + ')';
                    gCtx.beginPath();
                    gCtx.arc(sx, sy, 0.5 + Math.random() * 1, 0, Math.PI * 2);
                    gCtx.fill();
                }
            }

            // ループリセット
            if (genesisTime > 600) {
                genesisTime = 0;
                gCtx.fillStyle = 'rgba(5, 5, 15, 1)';
                gCtx.fillRect(0, 0, gWidth, gHeight);
                createBigBangParticles();
            }

            requestAnimationFrame(animateGenesis);
        }

        animateGenesis();
    }

    // 背景キャンバス（パーティクル星空）
    function initBackgroundCanvas() {
        var bgCanvas = document.getElementById('world-canvas');
        if (!bgCanvas) return;

        var bgCtx = bgCanvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        bgCanvas.width = window.innerWidth * dpr;
        bgCanvas.height = window.innerHeight * dpr;
        bgCtx.scale(dpr, dpr);

        var bgStars = [];
        for (var i = 0; i < 100; i++) {
            bgStars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 1.5,
                twinkle: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1.5
            });
        }

        function animateBackground(time) {
            bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            for (var i = 0; i < bgStars.length; i++) {
                var star = bgStars[i];
                var alpha = 0.3 + 0.3 * Math.sin(time * 0.001 * star.speed + star.twinkle);
                bgCtx.fillStyle = 'rgba(200, 200, 255, ' + alpha + ')';
                bgCtx.beginPath();
                bgCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                bgCtx.fill();
            }

            requestAnimationFrame(animateBackground);
        }

        animateBackground(0);

        // リサイズ対応
        window.addEventListener('resize', function () {
            var newDpr = window.devicePixelRatio || 1;
            bgCanvas.width = window.innerWidth * newDpr;
            bgCanvas.height = window.innerHeight * newDpr;
            bgCtx.setTransform(1, 0, 0, 1, 0, 0);
            bgCtx.scale(newDpr, newDpr);
        });
    }

    // 世界の再創造
    function rebirthWorld() {
        // 全モジュールリセット
        if (world.modules.cosmos) UniverseModule.reset();
        if (world.modules.earth) GeologyModule.reset();
        if (world.modules.atmosphere || world.modules.ocean) WeatherModule.reset();
        if (world.modules.life) LifeModule.reset();
        if (world.modules.civilization) CivilizationModule.reset();
        if (world.modules.time) {
            TimeModule.triggerRebirth();
        }

        // 創世に戻る
        switchSection('genesis');
    }

    // メイン初期化
    function init() {
        runLoadingSequence(function () {
            initBackgroundCanvas();
            setupNavigation();
            initializeModule('genesis');
            world.initialized = true;
        });
    }

    // DOM読み込み完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
