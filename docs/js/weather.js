/* ============================================
   創世界 - 気象・海洋モジュール
   天気、季節、海流のシミュレーション
   ============================================ */

var WeatherModule = (function () {
    'use strict';

    var rng = new SousekaiUtils.SeededRandom(5678);
    var noise = new SousekaiUtils.PerlinNoise(5678);
    var ctx = null;
    var canvas = null;
    var oceanCtx = null;
    var oceanCanvas = null;
    var width = 0;
    var height = 0;
    var oceanWidth = 0;
    var oceanHeight = 0;
    var animationId = null;
    var oceanAnimationId = null;
    var worldTime = 0;

    // 気象状態
    var weather = {
        temperature: 22,
        humidity: 60,
        pressure: 1013,
        windSpeed: 5,
        windDirection: 0,
        condition: 'clear',
        season: '春',
        cloudCover: 0.3
    };

    // 粒子システム
    var raindrops = [];
    var snowflakes = [];
    var clouds = [];
    var windParticles = [];
    var lightningBolts = [];

    // 海洋データ
    var ocean = {
        area: 71,
        avgDepth: 3688,
        temperature: 17,
        salinity: 35,
        currents: []
    };

    var wavePoints = [];

    // 天候の種類
    var weatherConditions = [
        { id: 'clear', name: '晴天', icon: '☀', prob: 0.3 },
        { id: 'cloudy', name: '曇り', icon: '☁', prob: 0.2 },
        { id: 'rain', name: '雨', icon: '🌧', prob: 0.15 },
        { id: 'storm', name: '雷雨', icon: '⛈', prob: 0.08 },
        { id: 'snow', name: '雪', icon: '❄', prob: 0.07 },
        { id: 'fog', name: '霧', icon: '🌫', prob: 0.1 },
        { id: 'aurora', name: 'オーロラ', icon: '✨', prob: 0.05 },
        { id: 'rainbow', name: '虹', icon: '🌈', prob: 0.05 }
    ];

    var seasons = ['春', '夏', '秋', '冬'];

    // 雲の生成
    function generateClouds() {
        clouds = [];
        var count = Math.round(weather.cloudCover * 15);
        for (var i = 0; i < count; i++) {
            clouds.push({
                x: rng.range(-100, width + 100),
                y: rng.range(20, height * 0.4),
                width: rng.range(60, 200),
                height: rng.range(20, 50),
                speed: rng.range(0.2, 1),
                opacity: rng.range(0.3, 0.8),
                puffs: rng.intRange(3, 7)
            });
        }
    }

    // 波のポイント生成
    function generateWavePoints() {
        wavePoints = [];
        var count = 100;
        for (var i = 0; i <= count; i++) {
            wavePoints.push({
                x: (i / count) * oceanWidth,
                baseY: oceanHeight * 0.35,
                amplitude: rng.range(5, 15),
                frequency: rng.range(0.5, 2),
                phase: rng.range(0, Math.PI * 2)
            });
        }
    }

    // 海流の生成
    function generateCurrents() {
        ocean.currents = [];
        var count = 6;
        for (var i = 0; i < count; i++) {
            var points = [];
            var startX = rng.range(0, oceanWidth);
            var startY = rng.range(oceanHeight * 0.4, oceanHeight * 0.9);
            for (var j = 0; j < 20; j++) {
                points.push({
                    x: startX + j * (oceanWidth / 20) + rng.gaussian() * 20,
                    y: startY + Math.sin(j * 0.5) * 30 + rng.gaussian() * 10
                });
            }
            ocean.currents.push({
                points: points,
                speed: rng.range(0.5, 2),
                warm: rng.next() > 0.5,
                name: rng.next() > 0.5 ? '暖流' : '寒流'
            });
        }
    }

    // 天気の更新
    function updateWeather() {
        worldTime += 0.01;

        // 季節の決定
        var seasonIndex = Math.floor((worldTime % 4));
        weather.season = seasons[seasonIndex];

        // 季節に基づく基本気温
        var baseTempBySeason = { '春': 18, '夏': 30, '秋': 15, '冬': 3 };
        var targetTemp = baseTempBySeason[weather.season] + rng.gaussian() * 3;
        weather.temperature += (targetTemp - weather.temperature) * 0.01;

        // 天候遷移
        if (Math.random() < 0.005) {
            var r = Math.random();
            var cumulative = 0;
            for (var i = 0; i < weatherConditions.length; i++) {
                cumulative += weatherConditions[i].prob;
                if (r <= cumulative) {
                    weather.condition = weatherConditions[i].id;
                    break;
                }
            }
        }

        // 天候に応じたパラメータ調整
        switch (weather.condition) {
            case 'clear':
                weather.cloudCover += (0.1 - weather.cloudCover) * 0.05;
                weather.humidity += (40 - weather.humidity) * 0.02;
                break;
            case 'cloudy':
                weather.cloudCover += (0.7 - weather.cloudCover) * 0.05;
                weather.humidity += (65 - weather.humidity) * 0.02;
                break;
            case 'rain':
                weather.cloudCover += (0.9 - weather.cloudCover) * 0.05;
                weather.humidity += (85 - weather.humidity) * 0.02;
                weather.temperature -= 0.01;
                break;
            case 'storm':
                weather.cloudCover += (1 - weather.cloudCover) * 0.05;
                weather.humidity += (95 - weather.humidity) * 0.02;
                weather.windSpeed += (20 - weather.windSpeed) * 0.02;
                weather.pressure += (990 - weather.pressure) * 0.02;
                break;
            case 'snow':
                weather.cloudCover += (0.8 - weather.cloudCover) * 0.05;
                weather.temperature += (-2 - weather.temperature) * 0.02;
                break;
            case 'fog':
                weather.cloudCover += (0.5 - weather.cloudCover) * 0.05;
                weather.humidity += (95 - weather.humidity) * 0.02;
                weather.windSpeed += (1 - weather.windSpeed) * 0.05;
                break;
            default:
                weather.cloudCover += (0.3 - weather.cloudCover) * 0.05;
        }

        // 風の変動
        weather.windDirection += rng.gaussian() * 2;
        weather.windSpeed += (8 - weather.windSpeed) * 0.01 + rng.gaussian() * 0.3;
        weather.windSpeed = Math.max(0, weather.windSpeed);

        // 気圧の変動
        weather.pressure += (1013 - weather.pressure) * 0.005 + rng.gaussian() * 0.5;

        // 海洋データの更新
        ocean.temperature = weather.temperature - 5 + Math.sin(worldTime * 0.5) * 3;
        ocean.salinity = 35 + Math.sin(worldTime * 0.3) * 0.5;
    }

    // 大気の描画
    function drawAtmosphere(time) {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        // 空の背景
        var skyGradient = ctx.createLinearGradient(0, 0, 0, height);
        var conditionColors = {
            clear: [['#1a1a3e', '#2d4a7a', '#87ceeb'], 0],
            cloudy: [['#1a1a2e', '#3a3a5a', '#7a7a9a'], 0],
            rain: [['#0a0a1e', '#2a2a4a', '#5a5a7a'], 0],
            storm: [['#050510', '#1a1a30', '#3a3a50'], 0],
            snow: [['#1a1a2e', '#4a4a6a', '#9a9aaa'], 0],
            fog: [['#2a2a3a', '#5a5a6a', '#8a8a9a'], 0],
            aurora: [['#0a1a2e', '#1a3a4a', '#0a2a3a'], 0],
            rainbow: [['#1a1a3e', '#2d4a7a', '#87ceeb'], 0]
        };

        var colors = conditionColors[weather.condition] || conditionColors.clear;
        skyGradient.addColorStop(0, colors[0][0]);
        skyGradient.addColorStop(0.5, colors[0][1]);
        skyGradient.addColorStop(1, colors[0][2]);
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height);

        // 太陽 or 月
        if (weather.condition === 'clear' || weather.condition === 'rainbow') {
            var sunX = width * 0.75 + Math.sin(time * 0.0003) * 50;
            var sunY = 60 + Math.sin(time * 0.0002) * 20;
            var sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
            sunGlow.addColorStop(0, 'rgba(255, 220, 100, 0.9)');
            sunGlow.addColorStop(0.3, 'rgba(255, 200, 50, 0.4)');
            sunGlow.addColorStop(1, 'rgba(255, 200, 50, 0)');
            ctx.fillStyle = sunGlow;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffe066';
            ctx.beginPath();
            ctx.arc(sunX, sunY, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // オーロラ
        if (weather.condition === 'aurora') {
            for (var a = 0; a < 5; a++) {
                var aY = 30 + a * 25;
                ctx.beginPath();
                ctx.moveTo(0, aY);
                for (var ax = 0; ax < width; ax += 5) {
                    var ay = aY + Math.sin(ax * 0.01 + time * 0.001 + a) * 20 +
                        Math.sin(ax * 0.005 + time * 0.0015) * 15;
                    ctx.lineTo(ax, ay);
                }
                var aHue = 120 + a * 30 + Math.sin(time * 0.001) * 20;
                ctx.strokeStyle = 'hsla(' + aHue + ', 80%, 60%, 0.3)';
                ctx.lineWidth = 8;
                ctx.stroke();
            }
        }

        // 虹
        if (weather.condition === 'rainbow') {
            var rbColors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
            for (var rb = 0; rb < rbColors.length; rb++) {
                ctx.strokeStyle = rbColors[rb];
                ctx.globalAlpha = 0.3;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(width * 0.5, height * 0.8, 150 + rb * 6, Math.PI, 0);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // 雲の描画
        for (var c = 0; c < clouds.length; c++) {
            var cloud = clouds[c];
            cloud.x += cloud.speed * (weather.windSpeed * 0.1);
            if (cloud.x > width + 200) cloud.x = -200;
            if (cloud.x < -200) cloud.x = width + 200;

            ctx.fillStyle = weather.condition === 'storm'
                ? 'rgba(40, 40, 60, ' + cloud.opacity + ')'
                : 'rgba(200, 200, 220, ' + cloud.opacity + ')';

            for (var p = 0; p < cloud.puffs; p++) {
                var px = cloud.x + (p - cloud.puffs / 2) * (cloud.width / cloud.puffs);
                var py = cloud.y + Math.sin(p * 1.5) * 5;
                var pr = cloud.height * (0.6 + 0.4 * Math.sin(p * 0.8));
                ctx.beginPath();
                ctx.arc(px, py, pr, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 雨
        if (weather.condition === 'rain' || weather.condition === 'storm') {
            while (raindrops.length < 200) {
                raindrops.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    speed: 5 + Math.random() * 10,
                    length: 10 + Math.random() * 20
                });
            }
            ctx.strokeStyle = 'rgba(150, 180, 255, 0.3)';
            ctx.lineWidth = 1;
            for (var ri = raindrops.length - 1; ri >= 0; ri--) {
                var drop = raindrops[ri];
                ctx.beginPath();
                ctx.moveTo(drop.x, drop.y);
                ctx.lineTo(drop.x + weather.windSpeed * 0.2, drop.y + drop.length);
                ctx.stroke();
                drop.y += drop.speed;
                drop.x += weather.windSpeed * 0.1;
                if (drop.y > height) {
                    drop.y = -drop.length;
                    drop.x = Math.random() * width;
                }
            }
        } else {
            raindrops = [];
        }

        // 雪
        if (weather.condition === 'snow') {
            while (snowflakes.length < 150) {
                snowflakes.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    size: 1 + Math.random() * 3,
                    speed: 0.5 + Math.random() * 1.5,
                    wobble: Math.random() * Math.PI * 2
                });
            }
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (var si = snowflakes.length - 1; si >= 0; si--) {
                var flake = snowflakes[si];
                ctx.beginPath();
                ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
                ctx.fill();
                flake.y += flake.speed;
                flake.x += Math.sin(flake.wobble + time * 0.001) * 0.5;
                if (flake.y > height) {
                    flake.y = -5;
                    flake.x = Math.random() * width;
                }
            }
        } else {
            snowflakes = [];
        }

        // 雷
        if (weather.condition === 'storm' && Math.random() < 0.01) {
            lightningBolts.push({
                x: Math.random() * width,
                born: time,
                segments: generateLightning(Math.random() * width, 0, height * 0.7)
            });
        }

        lightningBolts = lightningBolts.filter(function (bolt) {
            var age = time - bolt.born;
            if (age > 200) return false;
            ctx.strokeStyle = 'rgba(200, 200, 255, ' + (1 - age / 200) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (var seg = 0; seg < bolt.segments.length; seg++) {
                var s = bolt.segments[seg];
                if (seg === 0) ctx.moveTo(s.x, s.y);
                else ctx.lineTo(s.x, s.y);
            }
            ctx.stroke();
            return true;
        });

        // 地面
        var groundGradient = ctx.createLinearGradient(0, height * 0.75, 0, height);
        if (weather.condition === 'snow') {
            groundGradient.addColorStop(0, '#334433');
            groundGradient.addColorStop(0.3, '#ddeedd');
            groundGradient.addColorStop(1, '#ffffff');
        } else {
            groundGradient.addColorStop(0, '#1a3a1a');
            groundGradient.addColorStop(0.3, '#2d5a2d');
            groundGradient.addColorStop(1, '#1a4a1a');
        }
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, height * 0.75, width, height * 0.25);
    }

    function generateLightning(startX, startY, endY) {
        var segments = [{ x: startX, y: startY }];
        var y = startY;
        while (y < endY) {
            y += 10 + Math.random() * 20;
            var x = segments[segments.length - 1].x + (Math.random() - 0.5) * 40;
            segments.push({ x: x, y: y });
        }
        return segments;
    }

    // 海洋の描画
    function drawOcean(time) {
        if (!oceanCtx) return;
        oceanCtx.clearRect(0, 0, oceanWidth, oceanHeight);

        // 空
        var skyGrad = oceanCtx.createLinearGradient(0, 0, 0, oceanHeight * 0.35);
        skyGrad.addColorStop(0, '#0a1a3e');
        skyGrad.addColorStop(1, '#1a3a6a');
        oceanCtx.fillStyle = skyGrad;
        oceanCtx.fillRect(0, 0, oceanWidth, oceanHeight * 0.35);

        // 海面
        var seaGrad = oceanCtx.createLinearGradient(0, oceanHeight * 0.35, 0, oceanHeight);
        seaGrad.addColorStop(0, '#004466');
        seaGrad.addColorStop(0.3, '#003355');
        seaGrad.addColorStop(0.6, '#002244');
        seaGrad.addColorStop(1, '#001133');
        oceanCtx.fillStyle = seaGrad;
        oceanCtx.fillRect(0, oceanHeight * 0.35, oceanWidth, oceanHeight * 0.65);

        // 波
        if (wavePoints.length > 0) {
            for (var layer = 0; layer < 3; layer++) {
                oceanCtx.beginPath();
                var layerAlpha = 0.3 - layer * 0.08;
                var layerOffset = layer * 15;
                oceanCtx.moveTo(0, oceanHeight * 0.35 + layerOffset);

                for (var w = 0; w < wavePoints.length; w++) {
                    var wp = wavePoints[w];
                    var waveY = wp.baseY + layerOffset +
                        Math.sin(time * 0.001 * wp.frequency + wp.phase + layer) * wp.amplitude +
                        Math.sin(time * 0.002 + w * 0.3) * 3;
                    if (w === 0) {
                        oceanCtx.moveTo(wp.x, waveY);
                    } else {
                        oceanCtx.lineTo(wp.x, waveY);
                    }
                }
                oceanCtx.lineTo(oceanWidth, oceanHeight);
                oceanCtx.lineTo(0, oceanHeight);
                oceanCtx.closePath();

                var waveColor = layer === 0 ? 'rgba(0, 80, 120, ' + layerAlpha + ')'
                    : 'rgba(0, 60, 100, ' + layerAlpha + ')';
                oceanCtx.fillStyle = waveColor;
                oceanCtx.fill();
            }
        }

        // 海流の表示
        for (var ci = 0; ci < ocean.currents.length; ci++) {
            var current = ocean.currents[ci];
            oceanCtx.strokeStyle = current.warm ? 'rgba(255, 100, 50, 0.3)' : 'rgba(50, 100, 255, 0.3)';
            oceanCtx.lineWidth = 2;
            oceanCtx.setLineDash([5, 5]);
            oceanCtx.beginPath();
            for (var cp = 0; cp < current.points.length; cp++) {
                var pt = current.points[cp];
                var pxMod = pt.x + Math.sin(time * 0.001 + cp * 0.5) * 5;
                if (cp === 0) oceanCtx.moveTo(pxMod % oceanWidth, pt.y);
                else oceanCtx.lineTo(pxMod % oceanWidth, pt.y);
            }
            oceanCtx.stroke();
            oceanCtx.setLineDash([]);
        }

        // 深海の生物発光
        for (var bio = 0; bio < 20; bio++) {
            var bx = (Math.sin(time * 0.0005 + bio * 2.3) * 0.5 + 0.5) * oceanWidth;
            var by = oceanHeight * 0.6 + (Math.sin(time * 0.0008 + bio * 1.7) * 0.5 + 0.5) * oceanHeight * 0.35;
            var bSize = 2 + Math.sin(time * 0.003 + bio) * 1;
            var bGlow = oceanCtx.createRadialGradient(bx, by, 0, bx, by, bSize * 4);
            bGlow.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
            bGlow.addColorStop(1, 'rgba(100, 200, 255, 0)');
            oceanCtx.fillStyle = bGlow;
            oceanCtx.beginPath();
            oceanCtx.arc(bx, by, bSize * 4, 0, Math.PI * 2);
            oceanCtx.fill();
        }
    }

    function render(time) {
        updateWeather();
        drawAtmosphere(time);
        animationId = requestAnimationFrame(render);
    }

    function renderOcean(time) {
        drawOcean(time);
        oceanAnimationId = requestAnimationFrame(renderOcean);
    }

    function updateUI() {
        var el;
        var condition = weatherConditions.find(function (c) { return c.id === weather.condition; });

        el = document.getElementById('weather-icon');
        if (el && condition) el.textContent = condition.icon;
        el = document.getElementById('weather-temp');
        if (el) el.textContent = Math.round(weather.temperature) + '°C';
        el = document.getElementById('weather-desc');
        if (el && condition) el.textContent = condition.name;
        el = document.getElementById('stat-wind');
        if (el) el.textContent = weather.windSpeed.toFixed(1);
        el = document.getElementById('stat-humidity');
        if (el) el.textContent = Math.round(weather.humidity);
        el = document.getElementById('stat-pressure');
        if (el) el.textContent = Math.round(weather.pressure);
        el = document.getElementById('stat-season');
        if (el) el.textContent = weather.season;

        // 海洋統計
        el = document.getElementById('stat-ocean-area');
        if (el) el.textContent = ocean.area;
        el = document.getElementById('stat-ocean-depth');
        if (el) el.textContent = SousekaiUtils.formatNumber(ocean.avgDepth);
        el = document.getElementById('stat-ocean-temp');
        if (el) el.textContent = ocean.temperature.toFixed(1);
        el = document.getElementById('stat-salinity');
        if (el) el.textContent = ocean.salinity.toFixed(1);
    }

    function init(atmosphereCanvasId, oceanCanvasId) {
        // 大気キャンバス
        var setup1 = SousekaiUtils.setupCanvas(atmosphereCanvasId);
        if (setup1) {
            canvas = setup1.canvas;
            ctx = setup1.ctx;
            width = canvas.width / (window.devicePixelRatio || 1);
            height = canvas.height / (window.devicePixelRatio || 1);
            generateClouds();
        }

        // 海洋キャンバス
        var setup2 = SousekaiUtils.setupCanvas(oceanCanvasId);
        if (setup2) {
            oceanCanvas = setup2.canvas;
            oceanCtx = setup2.ctx;
            oceanWidth = oceanCanvas.width / (window.devicePixelRatio || 1);
            oceanHeight = oceanCanvas.height / (window.devicePixelRatio || 1);
            generateWavePoints();
            generateCurrents();
        }

        updateUI();
        // 定期的にUI更新
        setInterval(updateUI, 1000);
    }

    function start() {
        if (!animationId && ctx) {
            animationId = requestAnimationFrame(render);
        }
        if (!oceanAnimationId && oceanCtx) {
            oceanAnimationId = requestAnimationFrame(renderOcean);
        }
    }

    function stop() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (oceanAnimationId) {
            cancelAnimationFrame(oceanAnimationId);
            oceanAnimationId = null;
        }
    }

    function reset() {
        stop();
        rng = new SousekaiUtils.SeededRandom(Date.now());
        weather.condition = 'clear';
        weather.temperature = 22;
        worldTime = 0;
        raindrops = [];
        snowflakes = [];
        lightningBolts = [];
        generateClouds();
        if (oceanWidth && oceanHeight) {
            generateWavePoints();
            generateCurrents();
        }
        updateUI();
        start();
    }

    return {
        init: init,
        start: start,
        stop: stop,
        reset: reset,
        getWeather: function () { return weather; },
        getOcean: function () { return ocean; },
        updateUI: updateUI
    };
})();
