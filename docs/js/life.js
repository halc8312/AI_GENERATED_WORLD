/* ============================================
   創世界 - 生命モジュール
   進化、生態系、生物多様性のシミュレーション
   ============================================ */

var LifeModule = (function () {
    'use strict';

    var rng = new SousekaiUtils.SeededRandom(9876);
    var ctx = null;
    var canvas = null;
    var width = 0;
    var height = 0;
    var animationId = null;

    // 生命体
    var organisms = [];
    var foodParticles = [];
    var trailPoints = [];

    var stats = {
        species: 0,
        ecosystems: 7,
        extinctions: 5,
        biodiversity: 0
    };

    // 種の定義
    var speciesTypes = [
        { name: '原核生物', color: '#44ff44', size: 2, speed: 0.5, lifespan: 200, reproduction: 0.02, diet: 'autotroph', era: 'origin' },
        { name: '藻類', color: '#00aa44', size: 3, speed: 0.3, lifespan: 300, reproduction: 0.015, diet: 'autotroph', era: 'origin' },
        { name: 'アメーバ', color: '#88dd88', size: 4, speed: 0.8, lifespan: 250, reproduction: 0.012, diet: 'herbivore', era: 'multicell' },
        { name: 'クラゲ', color: '#aaddff', size: 6, speed: 1.2, lifespan: 400, reproduction: 0.008, diet: 'herbivore', era: 'cambrian' },
        { name: '三葉虫', color: '#bb8844', size: 5, speed: 0.7, lifespan: 500, reproduction: 0.01, diet: 'herbivore', era: 'cambrian' },
        { name: '魚類', color: '#4488ff', size: 7, speed: 2, lifespan: 600, reproduction: 0.008, diet: 'omnivore', era: 'land' },
        { name: '両生類', color: '#44aa44', size: 8, speed: 1.5, lifespan: 700, reproduction: 0.006, diet: 'carnivore', era: 'land' },
        { name: '恐竜', color: '#886622', size: 15, speed: 2.5, lifespan: 1000, reproduction: 0.003, diet: 'carnivore', era: 'dinosaur' },
        { name: '小型哺乳類', color: '#ddaa66', size: 5, speed: 3, lifespan: 800, reproduction: 0.007, diet: 'omnivore', era: 'mammal' },
        { name: '鳥類', color: '#ffaa44', size: 4, speed: 4, lifespan: 600, reproduction: 0.006, diet: 'omnivore', era: 'mammal' },
        { name: '霊長類', color: '#dd8844', size: 10, speed: 2, lifespan: 1200, reproduction: 0.004, diet: 'omnivore', era: 'human' },
        { name: '植物', color: '#228822', size: 8, speed: 0, lifespan: 2000, reproduction: 0.01, diet: 'autotroph', era: 'land' }
    ];

    function createOrganism(type, x, y) {
        var mutation = rng.gaussian() * 0.2;
        return {
            x: x || rng.range(20, width - 20),
            y: y || rng.range(20, height - 20),
            vx: (rng.next() - 0.5) * type.speed,
            vy: (rng.next() - 0.5) * type.speed,
            type: type,
            size: type.size * (1 + mutation * 0.3),
            speed: type.speed * (1 + mutation * 0.2),
            energy: 100,
            age: 0,
            maxAge: type.lifespan * (1 + mutation * 0.1),
            color: type.color,
            generation: 1
        };
    }

    function spawnFood() {
        while (foodParticles.length < 80) {
            foodParticles.push({
                x: rng.range(10, width - 10),
                y: rng.range(10, height - 10),
                size: rng.range(1.5, 3),
                energy: rng.range(10, 30)
            });
        }
    }

    function initPopulation() {
        organisms = [];
        var initialTypes = speciesTypes.filter(function (t) {
            return ['origin', 'multicell', 'cambrian', 'land', 'mammal'].indexOf(t.era) >= 0;
        });

        for (var i = 0; i < initialTypes.length; i++) {
            var count = Math.max(3, Math.round(10 / (initialTypes[i].size * 0.3)));
            for (var j = 0; j < count; j++) {
                organisms.push(createOrganism(initialTypes[i]));
            }
        }

        stats.species = initialTypes.length;
        stats.biodiversity = (stats.species / speciesTypes.length * 100).toFixed(0);
        spawnFood();
    }

    function updateOrganisms() {
        var newOrganisms = [];

        for (var i = organisms.length - 1; i >= 0; i--) {
            var org = organisms[i];
            org.age++;
            org.energy -= 0.1;

            // 移動
            if (org.speed > 0) {
                // 食料を探す行動
                var nearestFood = null;
                var nearestDist = Infinity;

                if (org.type.diet === 'herbivore' || org.type.diet === 'omnivore') {
                    for (var f = 0; f < foodParticles.length; f++) {
                        var fd = Math.hypot(foodParticles[f].x - org.x, foodParticles[f].y - org.y);
                        if (fd < nearestDist && fd < 100) {
                            nearestDist = fd;
                            nearestFood = foodParticles[f];
                        }
                    }
                }

                if (org.type.diet === 'carnivore' || (org.type.diet === 'omnivore' && !nearestFood)) {
                    for (var prey = 0; prey < organisms.length; prey++) {
                        if (prey === i) continue;
                        var preyOrg = organisms[prey];
                        if (preyOrg.size < org.size * 0.7) {
                            var pd = Math.hypot(preyOrg.x - org.x, preyOrg.y - org.y);
                            if (pd < nearestDist && pd < 80) {
                                nearestDist = pd;
                                nearestFood = preyOrg;
                            }
                        }
                    }
                }

                if (nearestFood) {
                    var dx = nearestFood.x - org.x;
                    var dy = nearestFood.y - org.y;
                    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    org.vx += (dx / dist) * org.speed * 0.1;
                    org.vy += (dy / dist) * org.speed * 0.1;
                } else {
                    // ランダム移動
                    org.vx += (rng.next() - 0.5) * 0.3;
                    org.vy += (rng.next() - 0.5) * 0.3;
                }

                // 速度制限
                var spd = Math.sqrt(org.vx * org.vx + org.vy * org.vy);
                if (spd > org.speed) {
                    org.vx = (org.vx / spd) * org.speed;
                    org.vy = (org.vy / spd) * org.speed;
                }

                org.x += org.vx;
                org.y += org.vy;

                // 壁の反射
                if (org.x < 5 || org.x > width - 5) org.vx *= -1;
                if (org.y < 5 || org.y > height - 5) org.vy *= -1;
                org.x = Math.max(5, Math.min(width - 5, org.x));
                org.y = Math.max(5, Math.min(height - 5, org.y));

                // 食事
                for (var fi = foodParticles.length - 1; fi >= 0; fi--) {
                    var foodDist = Math.hypot(foodParticles[fi].x - org.x, foodParticles[fi].y - org.y);
                    if (foodDist < org.size + foodParticles[fi].size) {
                        if (org.type.diet !== 'carnivore') {
                            org.energy += foodParticles[fi].energy;
                            foodParticles.splice(fi, 1);
                            break;
                        }
                    }
                }
            } else {
                // 植物は光合成
                org.energy += 0.2;
            }

            // 捕食
            if (org.type.diet === 'carnivore' || org.type.diet === 'omnivore') {
                for (var pi = organisms.length - 1; pi >= 0; pi--) {
                    if (pi === i) continue;
                    var target = organisms[pi];
                    if (target.size < org.size * 0.7) {
                        var pDist = Math.hypot(target.x - org.x, target.y - org.y);
                        if (pDist < org.size) {
                            org.energy += target.energy * 0.5;
                            organisms.splice(pi, 1);
                            if (pi < i) i--;
                            break;
                        }
                    }
                }
            }

            // 繁殖
            if (org.energy > 80 && rng.next() < org.type.reproduction && organisms.length < 200) {
                var child = createOrganism(org.type, org.x + rng.gaussian() * 10, org.y + rng.gaussian() * 10);
                child.generation = org.generation + 1;
                // 突然変異
                if (rng.next() < 0.1) {
                    var hsl = SousekaiUtils.hslToRgb(rng.range(0, 360), 0.7, 0.5);
                    child.color = SousekaiUtils.rgbString(hsl.r, hsl.g, hsl.b);
                    child.size *= 1 + rng.gaussian() * 0.2;
                }
                newOrganisms.push(child);
                org.energy -= 40;
            }

            // 死亡判定
            if (org.energy <= 0 || org.age > org.maxAge) {
                organisms.splice(i, 1);
                // 痕跡を残す
                if (org.size > 5) {
                    trailPoints.push({
                        x: org.x,
                        y: org.y,
                        size: org.size * 0.3,
                        alpha: 0.3,
                        decay: 0.001
                    });
                }
            }
        }

        // 新しい生物の追加
        for (var ni = 0; ni < newOrganisms.length; ni++) {
            organisms.push(newOrganisms[ni]);
        }

        // 食料の補充
        spawnFood();

        // 最低数の維持
        if (organisms.length < 20) {
            var randomType = rng.pick(speciesTypes);
            for (var spawn = 0; spawn < 5; spawn++) {
                organisms.push(createOrganism(randomType));
            }
        }

        // 統計の更新
        var uniqueSpecies = {};
        for (var si = 0; si < organisms.length; si++) {
            uniqueSpecies[organisms[si].type.name] = true;
        }
        stats.species = Object.keys(uniqueSpecies).length;
        stats.biodiversity = (stats.species / speciesTypes.length * 100).toFixed(0);
    }

    function drawOrganisms(time) {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        // 背景（深い海/環境）
        var bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
        bgGrad.addColorStop(0, '#0a1a0a');
        bgGrad.addColorStop(0.5, '#051005');
        bgGrad.addColorStop(1, '#020802');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 環境グリッド（薄く）
        ctx.strokeStyle = 'rgba(30, 80, 30, 0.1)';
        ctx.lineWidth = 0.5;
        for (var gx = 0; gx < width; gx += 40) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, height);
            ctx.stroke();
        }
        for (var gy = 0; gy < height; gy += 40) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(width, gy);
            ctx.stroke();
        }

        // 痕跡の描画
        trailPoints = trailPoints.filter(function (tp) {
            tp.alpha -= tp.decay;
            if (tp.alpha <= 0) return false;
            ctx.fillStyle = 'rgba(100, 150, 100, ' + tp.alpha + ')';
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, tp.size, 0, Math.PI * 2);
            ctx.fill();
            return true;
        });

        // 食料の描画
        ctx.fillStyle = 'rgba(50, 200, 50, 0.5)';
        for (var f = 0; f < foodParticles.length; f++) {
            var food = foodParticles[f];
            ctx.beginPath();
            ctx.arc(food.x, food.y, food.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 生物の描画
        for (var i = 0; i < organisms.length; i++) {
            var org = organisms[i];

            // グロー
            var glow = ctx.createRadialGradient(org.x, org.y, 0, org.x, org.y, org.size * 2);
            glow.addColorStop(0, org.color);
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(org.x, org.y, org.size * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // 本体
            ctx.fillStyle = org.color;
            ctx.beginPath();

            if (org.type.diet === 'autotroph' && org.speed === 0) {
                // 植物：四角形
                ctx.fillRect(org.x - org.size / 2, org.y - org.size / 2, org.size, org.size);
            } else if (org.type.diet === 'carnivore') {
                // 肉食：三角形
                ctx.moveTo(org.x, org.y - org.size);
                ctx.lineTo(org.x - org.size * 0.7, org.y + org.size * 0.5);
                ctx.lineTo(org.x + org.size * 0.7, org.y + org.size * 0.5);
                ctx.closePath();
                ctx.fill();
            } else {
                // その他：円
                ctx.arc(org.x, org.y, org.size, 0, Math.PI * 2);
                ctx.fill();
            }

            // エネルギーバー（大きい生物のみ）
            if (org.size > 6) {
                var barWidth = org.size * 2;
                var barHeight = 2;
                var barX = org.x - barWidth / 2;
                var barY = org.y - org.size - 5;
                var energyRatio = Math.min(1, org.energy / 100);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                ctx.fillStyle = energyRatio > 0.3 ? 'rgba(50, 200, 50, 0.7)' : 'rgba(200, 50, 50, 0.7)';
                ctx.fillRect(barX, barY, barWidth * energyRatio, barHeight);
            }
        }

        // 生物数表示
        ctx.fillStyle = 'rgba(200, 255, 200, 0.3)';
        ctx.font = '11px monospace';
        ctx.fillText('個体数: ' + organisms.length, 10, 20);
        ctx.fillText('種数: ' + stats.species, 10, 35);
    }

    function render(time) {
        if (!ctx) return;
        updateOrganisms();
        drawOrganisms(time);
        animationId = requestAnimationFrame(render);
    }

    function updateStats() {
        var el;
        el = document.getElementById('stat-species');
        if (el) el.textContent = String(stats.species);
        el = document.getElementById('stat-ecosystems');
        if (el) el.textContent = String(stats.ecosystems);
        el = document.getElementById('stat-extinctions');
        if (el) el.textContent = String(stats.extinctions);
        el = document.getElementById('stat-biodiversity');
        if (el) el.textContent = stats.biodiversity + '%';
    }

    function init(canvasId) {
        var setup = SousekaiUtils.setupCanvas(canvasId);
        if (!setup) return;
        canvas = setup.canvas;
        ctx = setup.ctx;
        width = canvas.width / (window.devicePixelRatio || 1);
        height = canvas.height / (window.devicePixelRatio || 1);

        initPopulation();
        updateStats();

        setInterval(updateStats, 2000);
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
        organisms = [];
        foodParticles = [];
        trailPoints = [];
        initPopulation();
        updateStats();
        start();
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
