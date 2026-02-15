/* ============================================
   創世界 - 宇宙モジュール
   恒星、銀河、宇宙現象のシミュレーション
   ============================================ */

var UniverseModule = (function () {
    'use strict';

    var rng = new SousekaiUtils.SeededRandom(42);
    var stars = [];
    var nebulae = [];
    var supernovae = [];
    var blackholes = [];
    var galaxyArms = 4;
    var galaxyRotation = 0;
    var ctx = null;
    var canvas = null;
    var width = 0;
    var height = 0;
    var animationId = null;
    var stats = {
        starCount: 0,
        planetCount: 0,
        supernovaeCount: 0,
        blackholeCount: 0
    };

    // 恒星の種類
    var starTypes = [
        { name: '赤色矮星', color: '#ff6b6b', minSize: 0.5, maxSize: 1.5, temp: '2500K', probability: 0.5 },
        { name: '黄色矮星', color: '#ffd93d', minSize: 1.5, maxSize: 2.5, temp: '5500K', probability: 0.25 },
        { name: '白色矮星', color: '#f0f0ff', minSize: 0.8, maxSize: 1.2, temp: '10000K', probability: 0.1 },
        { name: '青色巨星', color: '#6bb5ff', minSize: 3, maxSize: 5, temp: '25000K', probability: 0.08 },
        { name: '赤色超巨星', color: '#ff4444', minSize: 4, maxSize: 7, temp: '3500K', probability: 0.05 },
        { name: '中性子星', color: '#ffffff', minSize: 0.3, maxSize: 0.6, temp: '10⁶K', probability: 0.02 }
    ];

    function selectStarType() {
        var r = rng.next();
        var cumulative = 0;
        for (var i = 0; i < starTypes.length; i++) {
            cumulative += starTypes[i].probability;
            if (r <= cumulative) return starTypes[i];
        }
        return starTypes[0];
    }

    function createStar(x, y) {
        var type = selectStarType();
        var size = rng.range(type.minSize, type.maxSize);
        var planets = rng.intRange(0, 8);
        return {
            x: x,
            y: y,
            size: size,
            type: type,
            brightness: rng.range(0.3, 1),
            twinkleSpeed: rng.range(0.5, 3),
            twinklePhase: rng.range(0, Math.PI * 2),
            planets: planets,
            name: SousekaiUtils.generateName(rng, 'star'),
            age: rng.range(0.1, 13) // 10億年単位
        };
    }

    function createNebula(x, y) {
        var hue = rng.range(180, 320);
        return {
            x: x,
            y: y,
            radius: rng.range(30, 80),
            hue: hue,
            opacity: rng.range(0.05, 0.15),
            turbulence: rng.range(0.5, 2)
        };
    }

    function generateGalaxy(centerX, centerY, count) {
        stars = [];
        nebulae = [];
        stats.planetCount = 0;

        // 星雲を先に生成
        for (var n = 0; n < 8; n++) {
            var angle = rng.range(0, Math.PI * 2);
            var dist = rng.range(50, Math.min(centerX, centerY) * 0.8);
            nebulae.push(createNebula(
                centerX + Math.cos(angle) * dist,
                centerY + Math.sin(angle) * dist
            ));
        }

        // 渦巻き銀河の恒星生成
        for (var i = 0; i < count; i++) {
            var arm = i % galaxyArms;
            var armAngle = (arm / galaxyArms) * Math.PI * 2;
            var distance = rng.range(10, Math.min(centerX, centerY) * 0.85);
            var spiralAngle = armAngle + (distance / 80) * 1.5;
            var spread = distance * 0.15;

            var x = centerX + Math.cos(spiralAngle) * distance + rng.gaussian() * spread;
            var y = centerY + Math.sin(spiralAngle) * distance + rng.gaussian() * spread;

            var star = createStar(x, y);
            stars.push(star);
            stats.planetCount += star.planets;
        }

        // 中心部の密集した星々
        for (var j = 0; j < count * 0.3; j++) {
            var cAngle = rng.range(0, Math.PI * 2);
            var cDist = Math.abs(rng.gaussian()) * 40;
            var star2 = createStar(
                centerX + Math.cos(cAngle) * cDist,
                centerY + Math.sin(cAngle) * cDist
            );
            stars.push(star2);
            stats.planetCount += star2.planets;
        }

        stats.starCount = stars.length;
    }

    function triggerSupernova(x, y) {
        supernovae.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: rng.range(40, 80),
            opacity: 1,
            hue: rng.range(20, 60),
            born: Date.now()
        });
        stats.supernovaeCount++;

        // 一定確率でブラックホール化
        if (rng.next() < 0.3) {
            blackholes.push({
                x: x,
                y: y,
                radius: rng.range(5, 15),
                born: Date.now()
            });
            stats.blackholeCount++;
        }
    }

    function drawNebula(ctx, nebula, time) {
        var gradient = ctx.createRadialGradient(
            nebula.x, nebula.y, 0,
            nebula.x, nebula.y, nebula.radius
        );
        var rgb = SousekaiUtils.hslToRgb(nebula.hue + Math.sin(time * 0.0005) * 10, 0.6, 0.4);
        gradient.addColorStop(0, SousekaiUtils.rgbString(rgb.r, rgb.g, rgb.b, nebula.opacity));
        gradient.addColorStop(0.5, SousekaiUtils.rgbString(rgb.r, rgb.g, rgb.b, nebula.opacity * 0.5));
        gradient.addColorStop(1, SousekaiUtils.rgbString(rgb.r, rgb.g, rgb.b, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(nebula.x - nebula.radius, nebula.y - nebula.radius, nebula.radius * 2, nebula.radius * 2);
    }

    function drawStar(ctx, star, time) {
        var twinkle = 0.5 + 0.5 * Math.sin(time * 0.001 * star.twinkleSpeed + star.twinklePhase);
        var currentSize = star.size * (0.8 + twinkle * 0.4);
        var currentAlpha = star.brightness * (0.6 + twinkle * 0.4);

        // グロー
        var gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, currentSize * 4);
        gradient.addColorStop(0, star.type.color);
        gradient.addColorStop(0.3, SousekaiUtils.rgbString(255, 255, 255, currentAlpha * 0.3));
        gradient.addColorStop(1, SousekaiUtils.rgbString(255, 255, 255, 0));

        ctx.globalAlpha = currentAlpha;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, currentSize * 4, 0, Math.PI * 2);
        ctx.fill();

        // 核
        ctx.fillStyle = star.type.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    function drawSupernova(ctx, sn, time) {
        var age = (time - sn.born) / 1000;
        if (age > 5) return false;

        sn.radius = Math.min(sn.maxRadius, sn.radius + 0.8);
        sn.opacity = Math.max(0, 1 - age / 5);

        var gradient = ctx.createRadialGradient(sn.x, sn.y, 0, sn.x, sn.y, sn.radius);
        gradient.addColorStop(0, SousekaiUtils.rgbString(255, 255, 255, sn.opacity));
        var rgb = SousekaiUtils.hslToRgb(sn.hue, 0.8, 0.6);
        gradient.addColorStop(0.3, SousekaiUtils.rgbString(rgb.r, rgb.g, rgb.b, sn.opacity * 0.7));
        gradient.addColorStop(0.7, SousekaiUtils.rgbString(rgb.r, rgb.g, rgb.b, sn.opacity * 0.3));
        gradient.addColorStop(1, SousekaiUtils.rgbString(rgb.r, rgb.g, rgb.b, 0));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sn.x, sn.y, sn.radius, 0, Math.PI * 2);
        ctx.fill();
        return true;
    }

    function drawBlackhole(ctx, bh, time) {
        var pulse = 1 + 0.1 * Math.sin(time * 0.003);
        var r = bh.radius * pulse;

        // 降着円盤
        ctx.strokeStyle = SousekaiUtils.rgbString(255, 150, 50, 0.3);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(bh.x, bh.y, r * 3, r * 1.5, time * 0.0005, 0, Math.PI * 2);
        ctx.stroke();

        // 事象の地平面
        var gradient = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, r * 2);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.8)');
        gradient.addColorStop(0.8, 'rgba(20,0,40,0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, r * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    function render(time) {
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        // 背景
        ctx.fillStyle = 'rgba(5, 5, 20, 1)';
        ctx.fillRect(0, 0, width, height);

        // 銀河回転
        galaxyRotation += 0.00005;

        // 星雲描画
        for (var n = 0; n < nebulae.length; n++) {
            drawNebula(ctx, nebulae[n], time);
        }

        // 恒星描画
        for (var i = 0; i < stars.length; i++) {
            drawStar(ctx, stars[i], time);
        }

        // 超新星描画
        supernovae = supernovae.filter(function (sn) {
            return drawSupernova(ctx, sn, time);
        });

        // ブラックホール描画
        for (var b = 0; b < blackholes.length; b++) {
            drawBlackhole(ctx, blackholes[b], time);
        }

        // ランダム超新星イベント
        if (Math.random() < 0.002 && stars.length > 0) {
            var targetStar = stars[Math.floor(Math.random() * stars.length)];
            if (targetStar.type.name === '赤色超巨星' || targetStar.type.name === '青色巨星') {
                triggerSupernova(targetStar.x, targetStar.y);
            }
        }

        animationId = requestAnimationFrame(render);
    }

    function updateCatalog() {
        var catalog = document.getElementById('star-catalog');
        if (!catalog) return;

        var html = '';
        var displayed = stars.slice(0, 20);
        for (var i = 0; i < displayed.length; i++) {
            var s = displayed[i];
            html += '<div style="color:' + s.type.color + '">' +
                s.name + ' — ' + s.type.name +
                '（惑星: ' + s.planets + '個, ' + s.age.toFixed(1) + '0億年）</div>';
        }
        if (stars.length > 20) {
            html += '<div style="color:rgba(240,240,255,0.3)">...他 ' + (stars.length - 20) + ' 個の恒星</div>';
        }
        catalog.innerHTML = html;
    }

    function updateStats() {
        var el;
        el = document.getElementById('stat-stars');
        if (el) el.textContent = SousekaiUtils.formatNumber(stats.starCount);
        el = document.getElementById('stat-planets');
        if (el) el.textContent = SousekaiUtils.formatNumber(stats.planetCount);
        el = document.getElementById('stat-supernovae');
        if (el) el.textContent = String(stats.supernovaeCount);
        el = document.getElementById('stat-blackholes');
        if (el) el.textContent = String(stats.blackholeCount);
    }

    function init(canvasId) {
        var setup = SousekaiUtils.setupCanvas(canvasId);
        if (!setup) return;
        canvas = setup.canvas;
        ctx = setup.ctx;
        width = canvas.width / (window.devicePixelRatio || 1);
        height = canvas.height / (window.devicePixelRatio || 1);

        generateGalaxy(width / 2, height / 2, 300);
        updateCatalog();
        updateStats();
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
        stars = [];
        nebulae = [];
        supernovae = [];
        blackholes = [];
        stats = { starCount: 0, planetCount: 0, supernovaeCount: 0, blackholeCount: 0 };
        if (width && height) {
            generateGalaxy(width / 2, height / 2, 300);
            updateCatalog();
            updateStats();
            start();
        }
    }

    return {
        init: init,
        start: start,
        stop: stop,
        reset: reset,
        getStats: function () { return stats; },
        updateStats: updateStats
    };
})();
