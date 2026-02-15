/* ============================================
   創世界 - ユーティリティモジュール
   共通関数とヘルパー
   ============================================ */

var SousekaiUtils = (function () {
    'use strict';

    // 疑似乱数生成器（シード付き）
    function SeededRandom(seed) {
        this.seed = seed || Date.now();
    }

    SeededRandom.prototype.next = function () {
        this.seed = (this.seed * 16807 + 0) % 2147483647;
        return this.seed / 2147483647;
    };

    SeededRandom.prototype.range = function (min, max) {
        return min + this.next() * (max - min);
    };

    SeededRandom.prototype.intRange = function (min, max) {
        return Math.floor(this.range(min, max + 1));
    };

    SeededRandom.prototype.pick = function (array) {
        return array[Math.floor(this.next() * array.length)];
    };

    SeededRandom.prototype.gaussian = function () {
        var u1 = this.next();
        var u2 = this.next();
        return Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
    };

    // パーリンノイズ（簡易版）
    function PerlinNoise(seed) {
        this.rng = new SeededRandom(seed);
        this.permutation = [];
        for (var i = 0; i < 256; i++) {
            this.permutation.push(i);
        }
        // Fisher-Yatesシャッフル
        for (var j = 255; j > 0; j--) {
            var k = Math.floor(this.rng.next() * (j + 1));
            var tmp = this.permutation[j];
            this.permutation[j] = this.permutation[k];
            this.permutation[k] = tmp;
        }
        this.permutation = this.permutation.concat(this.permutation);
    }

    PerlinNoise.prototype.fade = function (t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    };

    PerlinNoise.prototype.lerp = function (a, b, t) {
        return a + t * (b - a);
    };

    PerlinNoise.prototype.grad = function (hash, x, y) {
        var h = hash & 3;
        var u = h < 2 ? x : y;
        var v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };

    PerlinNoise.prototype.noise2D = function (x, y) {
        var X = Math.floor(x) & 255;
        var Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        var u = this.fade(x);
        var v = this.fade(y);
        var A = this.permutation[X] + Y;
        var B = this.permutation[X + 1] + Y;
        return this.lerp(
            this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
            this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
            v
        );
    };

    PerlinNoise.prototype.octave = function (x, y, octaves, persistence) {
        var total = 0;
        var frequency = 1;
        var amplitude = 1;
        var maxValue = 0;
        for (var i = 0; i < octaves; i++) {
            total += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return total / maxValue;
    };

    // キャンバスユーティリティ
    function setupCanvas(canvasId) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        var ctx = canvas.getContext('2d');
        function resize() {
            var rect = canvas.parentElement
                ? canvas.parentElement.getBoundingClientRect()
                : { width: window.innerWidth, height: 400 };
            var dpr = window.devicePixelRatio || 1;
            canvas.width = (rect.width || canvas.clientWidth) * dpr;
            canvas.height = (canvas.clientHeight || 400) * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = (rect.width || canvas.clientWidth) + 'px';
        }
        resize();
        return { canvas: canvas, ctx: ctx, resize: resize };
    }

    // 数値フォーマット
    function formatNumber(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(1) + '兆';
        if (num >= 1e8) return (num / 1e8).toFixed(1) + '億';
        if (num >= 1e4) return (num / 1e4).toFixed(1) + '万';
        if (num >= 1000) return num.toLocaleString();
        return String(num);
    }

    // 色のユーティリティ
    function hslToRgb(h, s, l) {
        h /= 360;
        var r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            function hue2rgb(p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    function rgbString(r, g, b, a) {
        if (a !== undefined) {
            return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        }
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    // イージング関数
    var Easing = {
        linear: function (t) { return t; },
        easeInQuad: function (t) { return t * t; },
        easeOutQuad: function (t) { return t * (2 - t); },
        easeInOutQuad: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
        easeInCubic: function (t) { return t * t * t; },
        easeOutCubic: function (t) { var t1 = t - 1; return t1 * t1 * t1 + 1; },
        easeInOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; }
    };

    // 日本語の名前生成
    var nameGeneratorData = {
        prefixes: ['光', '闇', '風', '火', '水', '雷', '氷', '森', '金', '銀', '蒼', '紅', '翠', '紫', '白', '黒', '天', '地', '月', '星'],
        suffixes: ['の国', 'の都', 'の里', 'の森', 'の海', 'の山', 'の谷', 'の原', 'の島', 'の峰'],
        starPrefixes: ['輝', '煌', '耀', '燦', '燈', '灯', '炎', '焔', '閃', '暁'],
        starSuffixes: ['星', '光', '輪', '環', '冠', '珠', '玉', '華', '花', '鏡']
    };

    function generateName(rng, type) {
        type = type || 'place';
        if (type === 'star') {
            return rng.pick(nameGeneratorData.starPrefixes) + rng.pick(nameGeneratorData.starSuffixes);
        }
        return rng.pick(nameGeneratorData.prefixes) + rng.pick(nameGeneratorData.suffixes);
    }

    // ベクトル演算
    function Vec2(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    Vec2.prototype.add = function (v) { return new Vec2(this.x + v.x, this.y + v.y); };
    Vec2.prototype.sub = function (v) { return new Vec2(this.x - v.x, this.y - v.y); };
    Vec2.prototype.mul = function (s) { return new Vec2(this.x * s, this.y * s); };
    Vec2.prototype.length = function () { return Math.sqrt(this.x * this.x + this.y * this.y); };
    Vec2.prototype.normalize = function () {
        var l = this.length();
        if (l === 0) return new Vec2(0, 0);
        return new Vec2(this.x / l, this.y / l);
    };
    Vec2.prototype.dist = function (v) { return this.sub(v).length(); };

    return {
        SeededRandom: SeededRandom,
        PerlinNoise: PerlinNoise,
        setupCanvas: setupCanvas,
        formatNumber: formatNumber,
        hslToRgb: hslToRgb,
        rgbString: rgbString,
        Easing: Easing,
        generateName: generateName,
        Vec2: Vec2
    };
})();
