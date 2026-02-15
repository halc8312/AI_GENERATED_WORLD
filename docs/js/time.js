/* ============================================
   創世界 - 時間・哲学モジュール
   時間の流れ、宇宙の終焉、哲学的思索
   ============================================ */

var TimeModule = (function () {
    'use strict';

    var rng = new SousekaiUtils.SeededRandom(2718);
    var ctx = null;
    var canvas = null;
    var width = 0;
    var height = 0;
    var animationId = null;

    // 時間の粒子
    var particles = [];
    var spiralAngle = 0;
    var entropy = 0;
    var phase = 'expansion'; // expansion, equilibrium, decay, rebirth

    // 時間の流れを表す砂時計パーティクル
    function initParticles() {
        particles = [];
        for (var i = 0; i < 200; i++) {
            particles.push({
                x: rng.range(0, width),
                y: rng.range(0, height),
                size: rng.range(0.5, 2.5),
                speed: rng.range(0.2, 1),
                angle: rng.range(0, Math.PI * 2),
                orbitRadius: rng.range(20, Math.min(width, height) * 0.4),
                orbitSpeed: rng.range(0.001, 0.005),
                phase: rng.range(0, Math.PI * 2),
                hue: rng.range(30, 60), // 金色系
                alpha: rng.range(0.2, 0.8),
                life: 1
            });
        }
    }

    function updateParticles(time) {
        var centerX = width / 2;
        var centerY = height / 2;

        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];

            switch (phase) {
                case 'expansion':
                    // 膨張する宇宙 - 中心から外へ螺旋状に
                    p.angle += p.orbitSpeed;
                    p.orbitRadius += 0.02;
                    p.x = centerX + Math.cos(p.angle + p.phase) * p.orbitRadius;
                    p.y = centerY + Math.sin(p.angle + p.phase) * p.orbitRadius;
                    p.hue = 30 + (p.orbitRadius / width) * 200;
                    break;

                case 'equilibrium':
                    // 平衡状態 - ゆっくりとした回転
                    p.angle += p.orbitSpeed * 0.3;
                    p.x = centerX + Math.cos(p.angle + p.phase) * p.orbitRadius;
                    p.y = centerY + Math.sin(p.angle + p.phase) * p.orbitRadius * 0.8;
                    p.alpha *= 0.9999;
                    break;

                case 'decay':
                    // 崩壊 - 粒子が暗くなり消えていく
                    p.angle += p.orbitSpeed * 0.1;
                    p.orbitRadius += 0.05;
                    p.x = centerX + Math.cos(p.angle + p.phase) * p.orbitRadius;
                    p.y = centerY + Math.sin(p.angle + p.phase) * p.orbitRadius;
                    p.alpha *= 0.998;
                    p.hue += 0.1;
                    p.size *= 0.9999;
                    break;

                case 'rebirth':
                    // 再生 - 中心に向かって収束
                    var dx = centerX - p.x;
                    var dy = centerY - p.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 5) {
                        p.x += dx * 0.01;
                        p.y += dy * 0.01;
                    }
                    p.alpha = Math.min(1, p.alpha + 0.005);
                    p.hue = 50 + Math.sin(time * 0.005) * 20;
                    p.size = Math.min(3, p.size + 0.001);
                    break;
            }

            // 画面外の粒子をリセット
            if (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
                p.orbitRadius = rng.range(10, 50);
                p.alpha = rng.range(0.1, 0.5);
            }
        }
    }

    function drawParticles(time) {
        if (!ctx) return;

        // 背景
        var bgAlpha = phase === 'decay' ? 0.03 : 0.05;
        ctx.fillStyle = 'rgba(5, 5, 15, ' + bgAlpha + ')';
        ctx.fillRect(0, 0, width, height);

        // 時間が最初は完全な背景クリア
        if (phase === 'expansion' || phase === 'rebirth') {
            ctx.fillStyle = 'rgba(5, 5, 15, 0.1)';
            ctx.fillRect(0, 0, width, height);
        }

        var centerX = width / 2;
        var centerY = height / 2;

        // 中心のシンボル
        var symbolPulse = 1 + 0.3 * Math.sin(time * 0.001);
        var symbolSize = 30 * symbolPulse;

        // 中心グロー
        var centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, symbolSize * 3);
        var glowHue = phase === 'rebirth' ? 50 : (phase === 'decay' ? 0 : 40);
        var glowAlpha = phase === 'decay' ? 0.1 : 0.3;
        centerGlow.addColorStop(0, 'hsla(' + glowHue + ', 80%, 70%, ' + glowAlpha + ')');
        centerGlow.addColorStop(0.5, 'hsla(' + glowHue + ', 80%, 50%, ' + (glowAlpha * 0.3) + ')');
        centerGlow.addColorStop(1, 'hsla(' + glowHue + ', 80%, 30%, 0)');
        ctx.fillStyle = centerGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, symbolSize * 3, 0, Math.PI * 2);
        ctx.fill();

        // ∞ シンボルまたは ◯ シンボル
        ctx.strokeStyle = 'hsla(' + glowHue + ', 60%, 70%, 0.5)';
        ctx.lineWidth = 1.5;

        if (phase === 'rebirth') {
            // 再生時は円
            ctx.beginPath();
            ctx.arc(centerX, centerY, symbolSize * 0.5, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // 通常時は∞
            ctx.beginPath();
            for (var angle = 0; angle < Math.PI * 2; angle += 0.05) {
                var inf_x = centerX + symbolSize * 0.7 * Math.cos(angle) / (1 + Math.sin(angle) * Math.sin(angle));
                var inf_y = centerY + symbolSize * 0.35 * Math.sin(angle) * Math.cos(angle) / (1 + Math.sin(angle) * Math.sin(angle));
                if (angle === 0) ctx.moveTo(inf_x, inf_y);
                else ctx.lineTo(inf_x, inf_y);
            }
            ctx.stroke();
        }

        // 粒子の描画
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            if (p.alpha < 0.01) continue;

            // 粒子本体
            ctx.fillStyle = 'hsla(' + p.hue + ', 60%, 70%, ' + p.alpha + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // 微小なグロー
            if (p.size > 1) {
                var pGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
                pGlow.addColorStop(0, 'hsla(' + p.hue + ', 60%, 70%, ' + (p.alpha * 0.3) + ')');
                pGlow.addColorStop(1, 'hsla(' + p.hue + ', 60%, 70%, 0)');
                ctx.fillStyle = pGlow;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 接続線（近い粒子間）
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.03)';
        ctx.lineWidth = 0.5;
        for (var a = 0; a < particles.length; a++) {
            for (var b = a + 1; b < particles.length; b++) {
                var dx = particles[a].x - particles[b].x;
                var dy = particles[a].y - particles[b].y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 50) {
                    ctx.globalAlpha = (1 - dist / 50) * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
        ctx.globalAlpha = 1;

        // エントロピー表示
        entropy += phase === 'decay' ? 0.0001 : (phase === 'rebirth' ? -0.001 : 0.00005);
        entropy = Math.max(0, Math.min(1, entropy));

        ctx.fillStyle = 'rgba(200, 200, 220, 0.3)';
        ctx.font = '11px monospace';
        ctx.fillText('エントロピー: ' + (entropy * 100).toFixed(1) + '%', 10, 20);
        ctx.fillText('宇宙の状態: ' + getPhaseLabel(), 10, 38);

        // フェーズ遷移
        var elapsed = time * 0.0001;
        var cyclePosition = elapsed % 40;
        if (cyclePosition < 10) {
            phase = 'expansion';
        } else if (cyclePosition < 20) {
            phase = 'equilibrium';
        } else if (cyclePosition < 30) {
            phase = 'decay';
        } else {
            phase = 'rebirth';
        }
    }

    function getPhaseLabel() {
        switch (phase) {
            case 'expansion': return '膨張期';
            case 'equilibrium': return '平衡期';
            case 'decay': return '熱的死';
            case 'rebirth': return '再創造';
            default: return '不明';
        }
    }

    function render(time) {
        if (!ctx) return;
        updateParticles(time);
        drawParticles(time);
        animationId = requestAnimationFrame(render);
    }

    function init(canvasId) {
        var setup = SousekaiUtils.setupCanvas(canvasId);
        if (!setup) return;
        canvas = setup.canvas;
        ctx = setup.ctx;
        width = canvas.width / (window.devicePixelRatio || 1);
        height = canvas.height / (window.devicePixelRatio || 1);

        initParticles();
    }

    function start() {
        if (!animationId) {
            // 初回は背景をクリア
            if (ctx) {
                ctx.fillStyle = '#05050f';
                ctx.fillRect(0, 0, width, height);
            }
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
        entropy = 0;
        phase = 'expansion';
        initParticles();
        start();
    }

    function triggerRebirth() {
        phase = 'rebirth';
        entropy = 1;
        for (var i = 0; i < particles.length; i++) {
            particles[i].alpha = 0.8;
            particles[i].size = rng.range(0.5, 3);
            particles[i].hue = 50;
        }
    }

    return {
        init: init,
        start: start,
        stop: stop,
        reset: reset,
        triggerRebirth: triggerRebirth,
        getPhase: function () { return phase; },
        getEntropy: function () { return entropy; }
    };
})();
