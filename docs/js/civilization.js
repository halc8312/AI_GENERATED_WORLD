/* ============================================
   創世界 - 文明モジュール
   都市、文化、歴史のシミュレーション
   ============================================ */

var CivilizationModule = (function () {
    'use strict';

    var rng = new SousekaiUtils.SeededRandom(3141);
    var noise = new SousekaiUtils.PerlinNoise(3141);
    var ctx = null;
    var canvas = null;
    var mapCtx = null;
    var mapCanvas = null;
    var width = 0;
    var height = 0;
    var mapWidth = 0;
    var mapHeight = 0;
    var animationId = null;

    var worldYear = -10000;
    var yearSpeed = 5;

    var cities = [];
    var tradeRoutes = [];
    var events = [];
    var cultures = [];
    var inventions = [];

    var stats = {
        population: 1000,
        cityCount: 0,
        techLevel: '石器',
        cultureCount: 0,
        inventionCount: 0,
        warCount: 0
    };

    // 技術段階
    var techLevels = [
        { name: '石器', year: -10000, popMult: 1 },
        { name: '農耕', year: -8000, popMult: 5 },
        { name: '青銅器', year: -3000, popMult: 10 },
        { name: '鉄器', year: -1200, popMult: 20 },
        { name: '古典', year: -500, popMult: 40 },
        { name: '中世', year: 500, popMult: 60 },
        { name: '近世', year: 1400, popMult: 100 },
        { name: '産業革命', year: 1760, popMult: 300 },
        { name: '電気時代', year: 1880, popMult: 500 },
        { name: '情報時代', year: 1970, popMult: 1000 },
        { name: 'AI時代', year: 2020, popMult: 1200 },
        { name: '宇宙時代', year: 2100, popMult: 1500 }
    ];

    // 文化名
    var cultureNames = [
        '光の民', '風の民', '大地の民', '海の民', '森の民',
        '星の民', '火の民', '水の民', '山の民', '砂の民',
        '雪の民', '雷の民', '翠の民', '紅の民', '黄金の民'
    ];

    // 発明リスト
    var inventionList = [
        { name: '火の制御', year: -100000 },
        { name: '石器', year: -30000 },
        { name: '言語', year: -50000 },
        { name: '農耕', year: -10000 },
        { name: '車輪', year: -5500 },
        { name: '文字', year: -3200 },
        { name: '青銅器', year: -3000 },
        { name: '鉄器', year: -1200 },
        { name: '貨幣', year: -700 },
        { name: '民主主義', year: -500 },
        { name: '紙', year: 105 },
        { name: '火薬', year: 850 },
        { name: '印刷術', year: 1040 },
        { name: '羅針盤', year: 1100 },
        { name: '望遠鏡', year: 1608 },
        { name: '蒸気機関', year: 1712 },
        { name: '電池', year: 1800 },
        { name: '電信', year: 1837 },
        { name: '電話', year: 1876 },
        { name: '自動車', year: 1886 },
        { name: '飛行機', year: 1903 },
        { name: '相対性理論', year: 1905 },
        { name: '量子力学', year: 1925 },
        { name: 'コンピュータ', year: 1945 },
        { name: '人工衛星', year: 1957 },
        { name: 'インターネット', year: 1969 },
        { name: '携帯電話', year: 1983 },
        { name: 'World Wide Web', year: 1991 },
        { name: 'AI', year: 2012 },
        { name: '汎用AI', year: 2035 },
        { name: '核融合発電', year: 2050 },
        { name: 'ワープ航法', year: 2150 }
    ];

    // 歴史イベントテンプレート
    var eventTemplates = [
        { type: 'founding', text: '{culture}が{city}を建設', icon: '🏛' },
        { type: 'war', text: '{culture1}と{culture2}の間で戦争が勃発', icon: '⚔' },
        { type: 'peace', text: '{culture1}と{culture2}が和平を締結', icon: '🕊' },
        { type: 'invention', text: '{invention}が発明された', icon: '💡' },
        { type: 'disaster', text: '{city}で大災害が発生', icon: '🌋' },
        { type: 'golden', text: '{culture}の黄金時代が始まる', icon: '✨' },
        { type: 'trade', text: '{city1}と{city2}の間に交易路が開通', icon: '🛤' },
        { type: 'philosophy', text: '新たな思想「{thought}」が{culture}で生まれる', icon: '📜' },
        { type: 'art', text: '{culture}で偉大な芸術運動が始まる', icon: '🎨' },
        { type: 'exploration', text: '{culture}の探検隊が新大陸を発見', icon: '🗺' }
    ];

    var thoughts = [
        '自然との調和', '理性の光', '魂の解放', '共生の道',
        '永遠の真理', '虚無の先', '存在の意味', '美の追求',
        '公正の原理', '愛の哲学', '科学の精神', '平和の思想'
    ];

    function createCity(name, x, y, culture) {
        return {
            name: name,
            x: x,
            y: y,
            population: rng.intRange(100, 5000),
            culture: culture,
            founded: worldYear,
            size: 3,
            growth: rng.range(0.001, 0.005)
        };
    }

    function createCulture(name) {
        return {
            name: name,
            color: SousekaiUtils.rgbString(
                rng.intRange(100, 255),
                rng.intRange(100, 255),
                rng.intRange(50, 200)
            ),
            aggression: rng.range(0.1, 0.9),
            innovation: rng.range(0.1, 0.9),
            artistry: rng.range(0.1, 0.9)
        };
    }

    function initWorld() {
        // 文化の初期生成
        cultures = [];
        var cultureCount = rng.intRange(4, 8);
        var shuffled = cultureNames.slice();
        for (var s = shuffled.length - 1; s > 0; s--) {
            var j = rng.intRange(0, s);
            var temp = shuffled[s];
            shuffled[s] = shuffled[j];
            shuffled[j] = temp;
        }
        for (var c = 0; c < cultureCount; c++) {
            cultures.push(createCulture(shuffled[c]));
        }

        // 初期都市の生成
        cities = [];
        for (var ci = 0; ci < cultures.length; ci++) {
            var cityName = SousekaiUtils.generateName(rng, 'place');
            var cx = rng.range(50, (mapWidth || 600) - 50);
            var cy = rng.range(50, (mapHeight || 300) - 50);
            cities.push(createCity(cityName, cx, cy, cultures[ci]));
        }

        stats.cityCount = cities.length;
        stats.cultureCount = cultures.length;
        events = [];
        inventions = [];
        tradeRoutes = [];
    }

    function updateCivilization() {
        worldYear += yearSpeed;

        // 技術レベルの決定
        for (var t = techLevels.length - 1; t >= 0; t--) {
            if (worldYear >= techLevels[t].year) {
                stats.techLevel = techLevels[t].name;
                break;
            }
        }

        // 人口増加
        var currentTech = techLevels.find(function (tl) { return tl.name === stats.techLevel; });
        var targetPop = (currentTech ? currentTech.popMult : 1) * 10000;
        stats.population += Math.round((targetPop - stats.population) * 0.001 + rng.gaussian() * 100);
        stats.population = Math.max(100, stats.population);

        // 都市の成長
        for (var ci = 0; ci < cities.length; ci++) {
            var city = cities[ci];
            city.population += Math.round(city.population * city.growth * (1 + rng.gaussian() * 0.1));
            city.size = Math.min(20, 3 + Math.log(city.population) * 0.5);
        }

        // 新都市の建設
        if (rng.next() < 0.005 && cities.length < 30) {
            var parentCulture = rng.pick(cultures);
            var newCity = createCity(
                SousekaiUtils.generateName(rng, 'place'),
                rng.range(30, (mapWidth || 600) - 30),
                rng.range(30, (mapHeight || 300) - 30),
                parentCulture
            );
            cities.push(newCity);
            stats.cityCount = cities.length;

            addEvent('founding', {
                culture: parentCulture.name,
                city: newCity.name
            });
        }

        // 交易路の開通
        if (rng.next() < 0.003 && cities.length > 1) {
            var city1 = rng.pick(cities);
            var city2 = rng.pick(cities);
            if (city1 !== city2) {
                tradeRoutes.push({ from: city1, to: city2 });
                addEvent('trade', { city1: city1.name, city2: city2.name });
            }
        }

        // 発明の発生
        for (var inv = 0; inv < inventionList.length; inv++) {
            var invention = inventionList[inv];
            if (worldYear >= invention.year && inventions.indexOf(invention.name) === -1) {
                inventions.push(invention.name);
                stats.inventionCount = inventions.length;
                addEvent('invention', { invention: invention.name });
            }
        }

        // ランダムイベント
        if (rng.next() < 0.008) {
            var eventType = rng.pick(['war', 'peace', 'disaster', 'golden', 'philosophy', 'art', 'exploration']);
            var data = {};

            switch (eventType) {
                case 'war':
                    if (cultures.length >= 2) {
                        data.culture1 = rng.pick(cultures).name;
                        do { data.culture2 = rng.pick(cultures).name; } while (data.culture2 === data.culture1);
                        stats.warCount++;
                    }
                    break;
                case 'peace':
                    if (cultures.length >= 2) {
                        data.culture1 = rng.pick(cultures).name;
                        do { data.culture2 = rng.pick(cultures).name; } while (data.culture2 === data.culture1);
                    }
                    break;
                case 'disaster':
                    if (cities.length > 0) data.city = rng.pick(cities).name;
                    break;
                case 'golden':
                    data.culture = rng.pick(cultures).name;
                    break;
                case 'philosophy':
                    data.thought = rng.pick(thoughts);
                    data.culture = rng.pick(cultures).name;
                    break;
                case 'art':
                    data.culture = rng.pick(cultures).name;
                    break;
                case 'exploration':
                    data.culture = rng.pick(cultures).name;
                    break;
            }

            addEvent(eventType, data);
        }
    }

    function addEvent(type, data) {
        var template = eventTemplates.find(function (e) { return e.type === type; });
        if (!template) return;

        var text = template.text;
        for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                text = text.replace('{' + key + '}', data[key]);
            }
        }

        var yearStr = worldYear < 0 ? '紀元前' + Math.abs(Math.round(worldYear)) + '年' : '紀元' + Math.round(worldYear) + '年';

        events.unshift({
            year: yearStr,
            text: text,
            icon: template.icon,
            type: type
        });

        // 最大100件まで保持
        if (events.length > 100) events.length = 100;

        // DOMへの反映
        var eventList = document.getElementById('event-list');
        if (eventList) {
            var entry = document.createElement('div');
            entry.className = 'event-entry';
            entry.innerHTML = '<span class="event-year">' + template.icon + ' ' + yearStr + '</span>' +
                '<span class="event-text">' + text + '</span>';
            eventList.insertBefore(entry, eventList.firstChild);

            // 古いエントリの削除
            while (eventList.children.length > 50) {
                eventList.removeChild(eventList.lastChild);
            }
        }
    }

    // メインキャンバスの描画（背景の星空と文明の光）
    function drawMainCanvas(time) {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        // 背景
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, width, height);

        // 文明の灯り - パーティクルシステム
        for (var ci = 0; ci < cities.length; ci++) {
            var city = cities[ci];
            var scaledX = (city.x / (mapWidth || 600)) * width;
            var scaledY = (city.y / (mapHeight || 300)) * height;
            var pulse = 1 + 0.2 * Math.sin(time * 0.002 + ci);

            // 都市の光
            var glow = ctx.createRadialGradient(scaledX, scaledY, 0, scaledX, scaledY, city.size * 3 * pulse);
            glow.addColorStop(0, city.culture.color);
            glow.addColorStop(0.5, 'rgba(255, 200, 100, 0.2)');
            glow.addColorStop(1, 'rgba(255, 200, 100, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(scaledX, scaledY, city.size * 3 * pulse, 0, Math.PI * 2);
            ctx.fill();

            // 都市の核
            ctx.fillStyle = 'rgba(255, 220, 150, 0.8)';
            ctx.beginPath();
            ctx.arc(scaledX, scaledY, city.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 交易路
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.1)';
        ctx.lineWidth = 1;
        for (var tr = 0; tr < tradeRoutes.length; tr++) {
            var route = tradeRoutes[tr];
            var fromX = (route.from.x / (mapWidth || 600)) * width;
            var fromY = (route.from.y / (mapHeight || 300)) * height;
            var toX = (route.to.x / (mapWidth || 600)) * width;
            var toY = (route.to.y / (mapHeight || 300)) * height;

            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.stroke();
        }

        // 世界年表示
        var yearStr = worldYear < 0 ? '紀元前 ' + Math.abs(Math.round(worldYear)) + ' 年' : '紀元 ' + Math.round(worldYear) + ' 年';
        ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.font = '14px monospace';
        ctx.fillText(yearStr, 10, 25);
        ctx.fillText('人口: ' + SousekaiUtils.formatNumber(stats.population), 10, 45);
    }

    // ミニマップの描画
    function drawMap(time) {
        if (!mapCtx) return;

        mapCtx.clearRect(0, 0, mapWidth, mapHeight);

        // 地形背景
        for (var y = 0; y < mapHeight; y += 4) {
            for (var x = 0; x < mapWidth; x += 4) {
                var n = noise.octave(x / mapWidth * 3, y / mapHeight * 3, 4, 0.5);
                n = (n + 1) / 2;
                if (n < 0.45) {
                    mapCtx.fillStyle = SousekaiUtils.rgbString(10, 40 + Math.round(n * 80), 80 + Math.round(n * 60));
                } else if (n < 0.55) {
                    mapCtx.fillStyle = SousekaiUtils.rgbString(180 + Math.round(n * 30), 170 + Math.round(n * 20), 120);
                } else {
                    var green = Math.round(80 + (n - 0.55) * 300);
                    mapCtx.fillStyle = SousekaiUtils.rgbString(30, Math.min(180, green), 30);
                }
                mapCtx.fillRect(x, y, 4, 4);
            }
        }

        // 交易路
        mapCtx.setLineDash([3, 3]);
        mapCtx.lineWidth = 1;
        for (var tr = 0; tr < tradeRoutes.length; tr++) {
            var route = tradeRoutes[tr];
            mapCtx.strokeStyle = 'rgba(255, 200, 100, 0.4)';
            mapCtx.beginPath();
            mapCtx.moveTo(route.from.x, route.from.y);
            mapCtx.lineTo(route.to.x, route.to.y);
            mapCtx.stroke();
        }
        mapCtx.setLineDash([]);

        // 都市
        for (var ci = 0; ci < cities.length; ci++) {
            var city = cities[ci];
            var pulse = 1 + 0.1 * Math.sin(time * 0.003 + ci * 0.7);

            // 文化圏
            mapCtx.fillStyle = city.culture.color.replace('rgb', 'rgba').replace(')', ', 0.15)');
            mapCtx.beginPath();
            mapCtx.arc(city.x, city.y, city.size * 2 * pulse, 0, Math.PI * 2);
            mapCtx.fill();

            // 都市マーカー
            mapCtx.fillStyle = city.culture.color;
            mapCtx.beginPath();
            mapCtx.arc(city.x, city.y, Math.max(2, city.size * 0.4), 0, Math.PI * 2);
            mapCtx.fill();

            // 都市名（大きい都市のみ）
            if (city.size > 5) {
                mapCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                mapCtx.font = '8px sans-serif';
                mapCtx.fillText(city.name, city.x + city.size * 0.5 + 3, city.y + 3);
            }
        }
    }

    function render(time) {
        updateCivilization();
        drawMainCanvas(time);
        drawMap(time);
        animationId = requestAnimationFrame(render);
    }

    function updateStatsUI() {
        var el;
        el = document.getElementById('stat-population');
        if (el) el.textContent = SousekaiUtils.formatNumber(stats.population);
        el = document.getElementById('stat-cities');
        if (el) el.textContent = String(stats.cityCount);
        el = document.getElementById('stat-tech');
        if (el) el.textContent = stats.techLevel;
        el = document.getElementById('stat-cultures');
        if (el) el.textContent = String(stats.cultureCount);
        el = document.getElementById('stat-inventions');
        if (el) el.textContent = String(stats.inventionCount);
        el = document.getElementById('stat-wars');
        if (el) el.textContent = String(stats.warCount);
    }

    function init(mainCanvasId, mapCanvasId) {
        // メインキャンバス
        var setup1 = SousekaiUtils.setupCanvas(mainCanvasId);
        if (setup1) {
            canvas = setup1.canvas;
            ctx = setup1.ctx;
            width = canvas.width / (window.devicePixelRatio || 1);
            height = canvas.height / (window.devicePixelRatio || 1);
        }

        // マップキャンバス
        var mapEl = document.getElementById(mapCanvasId);
        if (mapEl) {
            mapCanvas = mapEl;
            mapCtx = mapEl.getContext('2d');
            mapWidth = mapEl.width;
            mapHeight = mapEl.height;
        }

        initWorld();
        updateStatsUI();
        setInterval(updateStatsUI, 1000);
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
        worldYear = -10000;
        stats.warCount = 0;
        initWorld();

        var eventList = document.getElementById('event-list');
        if (eventList) eventList.innerHTML = '';

        updateStatsUI();
        start();
    }

    return {
        init: init,
        start: start,
        stop: stop,
        reset: reset,
        getStats: function () { return stats; },
        updateStatsUI: updateStatsUI
    };
})();
