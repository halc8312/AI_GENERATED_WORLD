/* ============================================
   創世界 - 地質モジュール
   地形生成、プレートテクトニクス、地質現象
   ============================================ */

var GeologyModule = (function () {
    'use strict';

    var rng = new SousekaiUtils.SeededRandom(1234);
    var noise = new SousekaiUtils.PerlinNoise(1234);
    var ctx = null;
    var canvas = null;
    var width = 0;
    var height = 0;
    var animationId = null;
    var terrain = [];
    var plates = [];
    var volcanoes = [];
    var earthquakes = [];
    var currentEra = 'cenozoic';

    var stats = {
        continents: 0,
        maxElevation: 0,
        volcanoCount: 0,
        earthquakeFreq: 0
    };

    // 地質年代の設定
    var eraSettings = {
        hadean: { seaLevel: 0.2, volcanism: 0.9, tectonics: 0.3, color: { land: [180, 50, 20], sea: [30, 30, 40] } },
        archean: { seaLevel: 0.35, volcanism: 0.7, tectonics: 0.5, color: { land: [120, 80, 40], sea: [20, 40, 60] } },
        proterozoic: { seaLevel: 0.45, volcanism: 0.5, tectonics: 0.7, color: { land: [140, 100, 50], sea: [15, 50, 80] } },
        paleozoic: { seaLevel: 0.5, volcanism: 0.4, tectonics: 0.8, color: { land: [80, 120, 50], sea: [10, 60, 100] } },
        mesozoic: { seaLevel: 0.55, volcanism: 0.35, tectonics: 0.85, color: { land: [60, 130, 40], sea: [10, 50, 90] } },
        cenozoic: { seaLevel: 0.5, volcanism: 0.25, tectonics: 0.9, color: { land: [50, 140, 50], sea: [10, 60, 110] } }
    };

    // テクトニックプレートの生成
    function generatePlates(count) {
        plates = [];
        for (var i = 0; i < count; i++) {
            plates.push({
                x: rng.range(0, width),
                y: rng.range(0, height),
                vx: rng.range(-0.3, 0.3),
                vy: rng.range(-0.3, 0.3),
                type: rng.next() > 0.4 ? 'continental' : 'oceanic'
            });
        }
    }

    // 地形の高度マップ生成
    function generateTerrain() {
        terrain = [];
        var resolution = 4;
        var cols = Math.ceil(width / resolution);
        var rows = Math.ceil(height / resolution);

        var era = eraSettings[currentEra];

        for (var y = 0; y < rows; y++) {
            terrain[y] = [];
            for (var x = 0; x < cols; x++) {
                var nx = x / cols;
                var ny = y / rows;

                // 複数オクターブのノイズで地形生成
                var elevation = noise.octave(nx * 4, ny * 4, 6, 0.5);

                // プレート境界の影響
                var plateFactor = 0;
                for (var p = 0; p < plates.length; p++) {
                    var dx = (x * resolution - plates[p].x) / width;
                    var dy = (y * resolution - plates[p].y) / height;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (plates[p].type === 'continental') {
                        plateFactor += Math.exp(-dist * 8) * 0.3;
                    } else {
                        plateFactor -= Math.exp(-dist * 8) * 0.15;
                    }
                }

                elevation = (elevation + 1) / 2 + plateFactor;
                terrain[y][x] = Math.max(0, Math.min(1, elevation));
            }
        }

        // 統計の計算
        stats.maxElevation = 0;
        stats.continents = 0;
        var landCells = 0;
        var seaLevel = era.seaLevel;

        for (var ty = 0; ty < rows; ty++) {
            for (var tx = 0; tx < cols; tx++) {
                if (terrain[ty][tx] > seaLevel) {
                    landCells++;
                    var elevationM = Math.round((terrain[ty][tx] - seaLevel) * 18000);
                    if (elevationM > stats.maxElevation) {
                        stats.maxElevation = elevationM;
                    }
                }
            }
        }

        // 大陸数の推定（簡易的）
        stats.continents = Math.max(1, Math.round(plates.filter(function (p) { return p.type === 'continental'; }).length * 0.8));
    }

    // 火山の生成
    function generateVolcanoes() {
        volcanoes = [];
        var era = eraSettings[currentEra];
        var count = Math.round(era.volcanism * 15);
        var resolution = 4;
        var cols = Math.ceil(width / resolution);
        var rows = Math.ceil(height / resolution);

        for (var i = 0; i < count; i++) {
            var px = rng.intRange(1, cols - 2);
            var py = rng.intRange(1, rows - 2);
            if (terrain[py] && terrain[py][px] > eraSettings[currentEra].seaLevel) {
                volcanoes.push({
                    x: px * resolution,
                    y: py * resolution,
                    intensity: rng.range(0.3, 1),
                    active: rng.next() > 0.5,
                    lastEruption: 0
                });
            }
        }
        stats.volcanoCount = volcanoes.length;
    }

    // 地形の描画
    function drawTerrain(time) {
        if (!ctx || terrain.length === 0) return;

        var resolution = 4;
        var cols = Math.ceil(width / resolution);
        var rows = Math.ceil(height / resolution);
        var era = eraSettings[currentEra];
        var seaLevel = era.seaLevel;

        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < cols; x++) {
                var h = terrain[y][x];
                var r, g, b;

                if (h <= seaLevel) {
                    // 海
                    var depth = (seaLevel - h) / seaLevel;
                    r = Math.round(era.color.sea[0] * (1 - depth * 0.5));
                    g = Math.round(era.color.sea[1] * (1 - depth * 0.3));
                    b = Math.round(era.color.sea[2] * (1 - depth * 0.1));
                } else {
                    // 陸地
                    var altitude = (h - seaLevel) / (1 - seaLevel);
                    if (altitude < 0.3) {
                        // 低地（緑）
                        r = Math.round(era.color.land[0] * (1 - altitude));
                        g = Math.round(era.color.land[1]);
                        b = Math.round(era.color.land[2] * (1 - altitude));
                    } else if (altitude < 0.6) {
                        // 高地（茶）
                        var t = (altitude - 0.3) / 0.3;
                        r = Math.round(era.color.land[0] * (1 - altitude) + 139 * t);
                        g = Math.round(era.color.land[1] * (1 - t) + 90 * t);
                        b = Math.round(era.color.land[2] * (1 - t) + 43 * t);
                    } else {
                        // 山頂（白/灰）
                        var snow = (altitude - 0.6) / 0.4;
                        r = Math.round(139 + (255 - 139) * snow);
                        g = Math.round(90 + (255 - 90) * snow);
                        b = Math.round(43 + (255 - 43) * snow);
                    }
                }

                ctx.fillStyle = SousekaiUtils.rgbString(
                    Math.max(0, Math.min(255, r)),
                    Math.max(0, Math.min(255, g)),
                    Math.max(0, Math.min(255, b))
                );
                ctx.fillRect(x * resolution, y * resolution, resolution, resolution);
            }
        }

        // 火山の描画
        for (var v = 0; v < volcanoes.length; v++) {
            var vol = volcanoes[v];
            if (vol.active) {
                // 噴火エフェクト
                var erupting = Math.sin(time * 0.002 + v) > 0.7;
                if (erupting) {
                    ctx.fillStyle = 'rgba(255, 69, 0, 0.8)';
                    ctx.beginPath();
                    ctx.arc(vol.x, vol.y, 4 + Math.random() * 3, 0, Math.PI * 2);
                    ctx.fill();

                    // 溶岩のグロー
                    var glow = ctx.createRadialGradient(vol.x, vol.y, 0, vol.x, vol.y, 15);
                    glow.addColorStop(0, 'rgba(255, 100, 0, 0.4)');
                    glow.addColorStop(1, 'rgba(255, 69, 0, 0)');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(vol.x, vol.y, 15, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // 火山マーカー
            ctx.fillStyle = vol.active ? '#ff4500' : '#8b4513';
            ctx.beginPath();
            ctx.moveTo(vol.x, vol.y - 4);
            ctx.lineTo(vol.x - 3, vol.y + 2);
            ctx.lineTo(vol.x + 3, vol.y + 2);
            ctx.closePath();
            ctx.fill();
        }

        // 地震イベント
        earthquakes = earthquakes.filter(function (eq) {
            var age = (time - eq.born) / 1000;
            if (age > 2) return false;
            var alpha = Math.max(0, 1 - age / 2);
            var radius = eq.magnitude * 5 * age;
            ctx.strokeStyle = SousekaiUtils.rgbString(255, 255, 100, alpha * 0.5);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(eq.x, eq.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            return true;
        });

        // ランダム地震
        if (Math.random() < eraSettings[currentEra].tectonics * 0.02) {
            var eqX = rng.range(0, width);
            var eqY = rng.range(0, height);
            earthquakes.push({
                x: eqX,
                y: eqY,
                magnitude: rng.range(2, 9),
                born: time
            });
            stats.earthquakeFreq++;
        }
    }

    function render(time) {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        drawTerrain(time);
        animationId = requestAnimationFrame(render);
    }

    function updateStats() {
        var el;
        el = document.getElementById('stat-continents');
        if (el) el.textContent = String(stats.continents);
        el = document.getElementById('stat-elevation');
        if (el) el.textContent = SousekaiUtils.formatNumber(stats.maxElevation);
        el = document.getElementById('stat-volcanoes');
        if (el) el.textContent = String(stats.volcanoCount);
        el = document.getElementById('stat-earthquakes');
        if (el) el.textContent = String(stats.earthquakeFreq);
    }

    function setEra(era) {
        currentEra = era;
        rng = new SousekaiUtils.SeededRandom(1234 + era.charCodeAt(0));
        noise = new SousekaiUtils.PerlinNoise(1234 + era.charCodeAt(0));
        stats.earthquakeFreq = Math.round(rng.range(100, 50000));
        generatePlates(rng.intRange(5, 12));
        generateTerrain();
        generateVolcanoes();
        updateStats();
    }

    function init(canvasId) {
        var setup = SousekaiUtils.setupCanvas(canvasId);
        if (!setup) return;
        canvas = setup.canvas;
        ctx = setup.ctx;
        width = canvas.width / (window.devicePixelRatio || 1);
        height = canvas.height / (window.devicePixelRatio || 1);

        setEra(currentEra);
    }

    function start() {
        if (!animationId) {
            animationId = requestAnimationFrame(render);
        }
    }

    function stop() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    function reset() {
        stop();
        rng = new SousekaiUtils.SeededRandom(Date.now());
        noise = new SousekaiUtils.PerlinNoise(Date.now());
        stats.earthquakeFreq = 0;
        setEra(currentEra);
        start();
    }

    return {
        init: init,
        start: start,
        stop: stop,
        reset: reset,
        setEra: setEra,
        getStats: function () { return stats; },
        updateStats: updateStats
    };
})();
