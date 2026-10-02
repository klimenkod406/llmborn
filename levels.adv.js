/* ============================================================
   LLMborn — уровни 5..9
   ============================================================ */
(function (NF) {
  const h = NF.h, S = NF.S, clamp = NF.clamp, fmt = NF.fmt;

  function canvasBox(w, hh) {
    const c = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr; c.height = hh * dpr;
    c.style.aspectRatio = w + ' / ' + hh;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    return { c, ctx, w, h: hh };
  }

  /* ============================================================
     5. ОШИБКА (LOSS)
     ============================================================ */
  NF.register({
    title: 'Ошибка модели',
    tag: 'Шаг 5 · метрика',
    lead: 'Функция потерь превращает «насколько мы неправы» в одно число. Именно это число модель пытается уменьшить.',
    goal: 'Оцени четыре примера так, чтобы суммарная ошибка стала минимальной.',
    hint: 'Двигай ползунки, потом «Оценить»',
    explain: `
      <p>Модель почти никогда не отвечает «точно да». Она выдаёт <b>вероятность</b>, а функция потерь штрафует за неверную уверенность. Формула называется <em>перекрёстная энтропия</em>:</p>
      <span class="formula">L = −(y·log p + (1−y)·log(1−p))</span>
      <p>Правильный ответ <code>y</code> — это 1 или 0 из размеченных данных. Уверенность в правильном ответе даёт почти нулевую ошибку; уверенность в неправильном — ошибку, которая тем больше, чем сильнее уверенность.</p>
      <ul class="takeaways">
        <li>Ошибка — это не «процент неправильных ответов», а гладкая величина, по которой можно идти вниз.</li>
        <li>Гладкость важна: модель не может «шагнуть» по ступенькам, ей нужен склон.</li>
        <li>На.true данных нельзя достичь нуля — в жизни есть шум, и это нормально.</li>
      </ul>`,
    mount(body, api) {
      const ITEMS = [
        { q: 'На фото кот', y: 1, p0: 0.5 },
        { q: 'На фото пустое окно', y: 0, p0: 0.5 },
        { q: 'Кот спит на клавиатуре', y: 1, p0: 0.5 },
        { q: 'На фото автомобиль', y: 0, p0: 0.5 }
      ];
      const val = ITEMS.map(i => i.p0);
      let total = null, won = false;

      const chart = NF.ui.chart(420, 240);
      function drawChart(hover) {
        chart.innerHTML = '';
        const W = 420, H = 240, L = 46, B = 210, T = 16, Rr = 400;
        for (let i = 0; i <= 5; i++) {
          const y = B - (i / 5) * (B - T);
          chart.append(S('line', { x1: L, y1: y, x2: Rr, y2: y, class: 'gridline' }));
          chart.append(S('text', { x: L - 8, y: y + 4, class: 'axlabel', 'text-anchor': 'end', text: (i * 0.8).toFixed(1) }));
        }
        const xAt = p => L + p * (Rr - L);
        const yAt = l => B - clamp(l / 4, 0, 1) * (B - T);
        chart.append(S('line', { x1: L, y1: B, x2: Rr, y2: B, class: 'axis' }));
        chart.append(S('line', { x1: L, y1: T, x2: L, y2: B, class: 'axis' }));
        [['y = 1 (верно: кот)', '#35d6a4', 1], ['y = 0 (верно: не кот)', '#f4617e', 0]].forEach(([lbl, col, y]) => {
          const pts = [];
          for (let i = 0; i <= 60; i++) {
            const p = 0.01 + i / 60 * 0.98;
            const l = -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
            pts.push(xAt(p).toFixed(1) + ',' + yAt(l).toFixed(1));
          }
          chart.append(S('polyline', { points: pts.join(' '), fill: 'none', stroke: col, 'stroke-width': 2.2, opacity: .85 }));
        });
        if (hover !== undefined) {
          const l = -(hover.y * Math.log(hover.p) + (1 - hover.y) * Math.log(1 - hover.p));
          chart.append(S('line', { x1: xAt(hover.p), y1: T, x2: xAt(hover.p), y2: B, stroke: '#e9eefa', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: .5 }));
          chart.append(S('circle', { cx: xAt(hover.p), cy: yAt(l), r: 6, fill: '#fff' }));
          chart.append(S('text', { x: xAt(hover.p) + 10, y: T + 14, class: 'axlabel', fill: '#e9eefa', text: 'ошибка ' + fmt(l, 2) }));
        }
        chart.append(S('text', { x: L, y: 232, class: 'axlabel', text: 'уверенность модели p →' }));
        chart.append(S('text', { x: 10, y: 100, class: 'axlabel', transform: 'rotate(-90 10 100)', 'text-anchor': 'middle', text: 'ошибка L' }));
      }
      drawChart();

      const cards = h('div', { style: { display: 'grid', gap: '10px' } });
      const rows = ITEMS.map((it, i) => {
        const out = h('span', { class: 'slider-val mono' }, '0.50');
        const lossPill = h('span', { class: 'pill' }, '—');
        const sl = h('input', { type: 'range', min: '1', max: '99', value: '50' });
        sl.addEventListener('input', () => {
          val[i] = +sl.value / 100; out.textContent = fmt(val[i], 2);
          NF.sfx.tick(); total = null; update(true);
        });
        sl.addEventListener('mousemove', () => drawChart({ p: +sl.value / 100, y: it.y }));
        sl.addEventListener('mouseleave', () => drawChart());
        const card = h('div', { class: 'task' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' } },
            h('b', { style: { fontSize: '14px' } }, it.q),
            h('span', { class: 'pill' + (it.y ? ' ok' : ' bad') }, 'правильно: ' + (it.y ? 'кот' : 'не кот')),
            lossPill),
          h('div', { class: 'slider-row' }, h('span', {}, 'p ='), sl, out));
        cards.append(card);
        return { sl, out, lossPill, card };
      });

      const totalOut = h('div', { class: 'mono', style: { fontSize: '17px', color: '#f5b13d' } }, '—');
      const meter = h('div', { class: 'meter' }, h('div', { class: 'meter-fill', style: { width: '0%' } }));
      const bestOut = h('div', { style: { fontSize: '12.5px', color: '#6f7a94' } }, '');

      function update(live) {
        if (total === null) return;
        rows.forEach((r, i) => {
          const l = -(ITEMS[i].y * Math.log(val[i]) + (1 - ITEMS[i].y) * Math.log(1 - val[i]));
          r.lossPill.textContent = 'ошибка ' + fmt(l, 2);
          r.lossPill.className = 'pill ' + (l < 0.2 ? 'ok' : (l < 0.7 ? 'amber' : 'bad'));
          r.card.classList.toggle('done', l < 0.2);
        });
        totalOut.textContent = 'суммарная ошибка ' + fmt(total, 3);
        const pct = clamp(total / 4, 0, 1) * 100;
        meter.firstChild.style.width = pct + '%';
        meter.firstChild.className = 'meter-fill' + (total < 0.9 ? ' ok' : '');
        bestOut.textContent = 'Идеальная ошибка здесь ≈ 0. Шкала кривой идёт до 4 — это ошибка «уверен не в том на 99%».';
        if (total < 0.9 && !won) {
          won = true;
          api.status('Ошибка упала почти до нуля', 'ok');
          NF.ui.win(api, {
            text: 'Ты откалибровал четыре ответа так, что модель почти не ошибается. В обучении алгоритм делает ровно то же — но перебирает миллионы вариантов.'
          });
        } else if (live) {
          api.status('Суммарная ошибка: ' + fmt(total, 3), total < 1.6 ? 'warn' : '');
        }
      }

      const checkBtn = h('button', { class: 'btn' }, 'Оценить');
      checkBtn.addEventListener('click', () => {
        total = ITEMS.reduce((s, it, i) =>
          s + -(it.y * Math.log(val[i]) + (1 - it.y) * Math.log(1 - val[i])), 0);
        update(false);
        NF.sfx.tap();
      });
      const resetBtn = h('button', { class: 'btn ghost sm' }, 'Вернуть 0.50');
      resetBtn.addEventListener('click', () => {
        rows.forEach((r, i) => { val[i] = .5; r.sl.value = '50'; r.out.textContent = '0.50'; });
        total = null;
        totalOut.textContent = '—'; meter.firstChild.style.width = '0%';
        rows.forEach(r => { r.lossPill.textContent = '—'; r.lossPill.className = 'pill'; r.card.classList.remove('done'); });
        drawChart(); NF.sfx.tap();
      });

      body.append(
        h('div', { class: 'cols', style: { gap: '22px' } },
          h('div', {}, chart,
            h('p', { style: { fontSize: '12.5px', color: '#6f7a94', marginTop: '10px' } },
              'Зелёная кривая — штраф, когда правда «кот». Красная — когда правда «не кот». Наведи курсор на любой ползунок, чтобы увидеть точку на кривой.')),
          h('div', {},
            cards,
            h('div', { style: { marginTop: '14px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' } },
                totalOut,
                h('button', { class: 'btn sm', onclick: () => { if (!won) { api.toast('Сначала нажми «Оценить»'); } } }, 'Сбросить в начало')),
              meter, bestOut),
            h('div', { class: 'btn-row', style: { marginTop: '14px' } }, checkBtn))),
      );
      api.hints(['p — уверенность', 'сумма < 0.9 = победа', 'кривая справа = катастрофа']);
    }
  });

  /* ============================================================
     6. ГРАДИЕНТНЫЙ СПУСК
     ============================================================ */
  NF.register({
    title: 'Спуск по склону',
    tag: 'Шаг 6 · градиент',
    lead: 'Обучение — это спуск шарика по горе ошибки. Модель катит шарик миллионы раз, пока не окажется на дне.',
    goal: 'Скатись в самое глубокое дно на трёх рельефах. Ловушки — локальные минимумы — тоже придётся обойти.',
    hint: 'Стрелки ← → или кнопки ниже',
    wide: true,
    explain: `
      <p>Взгляд сверху на любую модель: слева — веса, справа — ошибка. Убери слои нейросети, и останется <b>рельеф</b>, где высота — это ошибка. Задача обучения: <em>скатиться вниз</em>.</p>
      <span class="formula">новый вес = вес − скоростьУчёба × градиент</span>
      <p><b>Градиент</b> — это наклон поверхности в текущей точке: куда вниз крутить каждую ручку. Пока градиент ненулевой, есть куда двигаться; в дне он обнуляется, и обучение останавливается.</p>
      <ul class="takeaways">
        <li>Шаг не должен быть слишком большим, иначе шарик перелетает дно и «отскакивает» — как в жизни при слишком большой скорости обучения.</li>
        <li>Неглубокое дно — <b>локальный минимум</b>: двигаться больше некуда, но рядом может лежать настоящая бездна. Отсюда и сложность: углубления и «ямы» специально делают глубокими и пологими.</li>
        <li>Случайные старты помогают: два прогона с разных стартовых весов дают разные ответы.</li>
      </ul>`,
    mount(body, api) {
      const TOP = 1;
      const ROUNDS = [
        { name: 'Ровная чаша', start: 0.10, g: [{ k: .95, c: .55, s: .30 }], hint: 'Тут всё просто: шарик сам скатится в яму. Придерживай его в дне — и раунд закроется.' },
        { name: 'Две ямы', start: 0.62, g: [{ k: .90, c: .24, s: .16 }, { k: .45, c: .80, s: .14 }], hint: 'Шарик укатился в правую яму. Но настоящее дно — левее, придётся перелезать через гребень.' },
        { name: 'Три ямы', start: 0.48, g: [{ k: .85, c: .15, s: .15 }, { k: .50, c: .48, s: .12 }, { k: .75, c: .85, s: .15 }], hint: 'Середина — ловушка. Самая глубокая яма прячется слева, но туда надо перебраться через два гребня.' }
      ];
      const K = 0.8, DAMP = 1.8, THRUST = 7.0;
      const W = 760, H = 250, PAD = 30;
      let round = 0, wonRounds = 0, x = ROUNDS[0].start, v = 0, still = 0, raf = 0, running = true;
      const keys = { left: false, right: false };

      const svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', style: 'height:auto' });
      const terrain = S('g'), gBall = S('g'), gGrad = S('g');
      svg.append(terrain, gGrad, gBall);
      const lossOut = h('span', { class: 'mono', style: { fontSize: '15px', color: '#35d6a4' } }, '0.00');
      const gradOut = h('span', { class: 'mono', style: { color: '#f5b13d' } }, '0.00');
      const roundOut = h('span', { class: 'pill' }, 'Раунд 1 / 3');
      const msg = h('div', { style: { fontSize: '13.5px', color: '#aab4cc', minHeight: '38px' } }, ROUNDS[0].hint);

      const H_ = (xx, r) => TOP - r.g.reduce((s, b) => s + b.k * Math.exp(-Math.pow((xx - b.c) / b.s, 2)), 0);
      const DH = (xx, r) => r.g.reduce((s, b) => s + 2 * b.k * (xx - b.c) / (b.s * b.s) * Math.exp(-Math.pow((xx - b.c) / b.s, 2)), 0);
      const globalMin = r => {
        const cand = r.g.map(b => ({ c: b.c, h: TOP - b.k - r.g.reduce((s, o) => s + (o === b ? 0 : o.k * Math.exp(-Math.pow((b.c - o.c) / o.s, 2))), 0) }));
        return cand.sort((a, b2) => a.h - b2.h)[0];
      };

      const ball = S('circle', { cx: 0, cy: 0, r: 9, fill: '#35d6a4', stroke: '#0e1119', 'stroke-width': 2 });
      const ballGlow = S('circle', { cx: 0, cy: 0, r: 15, fill: 'rgba(53,214,164,.2)' });
      gBall.append(ballGlow, ball);
      const arrow = S('path', { fill: 'none', stroke: '#f5b13d', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
      const arrowHead = S('path', { fill: '#f5b13d' });
      gGrad.append(arrow, arrowHead);

      function xAt(xx) { return PAD + xx * (W - PAD * 2); }
      function yAt(hh, max) { return H - 34 - (hh / max) * (H - 70); }

      function draw() {
        const r = ROUNDS[round];
        const max = 1.14;
        terrain.innerHTML = '';
        let d = 'M' + xAt(0) + ' ' + yAt(H_(0, r), max);
        for (let i = 1; i <= 120; i++) { const p = i / 120; d += ' L' + xAt(p).toFixed(1) + ' ' + yAt(H_(p, r), max).toFixed(1); }
        d += ' L' + xAt(1) + ' ' + (H - 20) + ' L' + xAt(0) + ' ' + (H - 20) + ' Z';
        terrain.append(S('path', { d, fill: 'rgba(97,168,245,.08)', stroke: '#61a8f5', 'stroke-width': 2.2 }));
        const gmin = globalMin(r);
        terrain.append(S('circle', { cx: xAt(gmin.c), cy: yAt(gmin.h, max), r: 6, fill: 'none', stroke: '#35d6a4', 'stroke-width': 1.4, opacity: .55 }));
        for (let i = 0; i <= 8; i++) {
          const px = xAt(i / 8);
          terrain.append(S('line', { x1: px, y1: H - 20, x2: px, y2: H - 14, class: 'axis' }));
        }
        terrain.append(S('text', { x: W / 2, y: H - 4, class: 'axlabel', 'text-anchor': 'middle', text: 'значение одного веса  w  →' }));
        terrain.append(S('text', { x: 12, y: 20, class: 'axlabel', text: 'высота = ошибка' }));
        terrain.append(S('text', { x: 12, y: 36, class: 'axlabel', fill: '#35d6a4', text: '○ — глобальный минимум' }));

        const bh = H_(x, r), bg = DH(x, r);
        const bx = xAt(x), by = yAt(bh, max) - 16;
        ball.setAttribute('cx', bx); ball.setAttribute('cy', by);
        ballGlow.setAttribute('cx', bx); ballGlow.setAttribute('cy', by);
        lossOut.textContent = fmt(bh, 3);
        gradOut.textContent = fmt(bg, 2);

        const dir = bg > 0 ? -1 : 1;
        const ax = bx, ay = by - 20, len = clamp(Math.abs(bg) * 22, 6, 42);
        arrow.setAttribute('d', 'M' + ax + ' ' + ay + ' L' + (ax + dir * len) + ' ' + (ay + 6));
        arrowHead.setAttribute('d',
          'M' + (ax + dir * len) + ' ' + (ay + 8) + ' l' + (dir * -7) + ' -5 l0 10 Z');
        const vis = Math.abs(bg) < 0.02 ? 0 : 1;
        arrow.style.opacity = vis; arrowHead.style.opacity = vis;
      }

      let last = 0;
      function loop(now) {
        const r = ROUNDS[round];
        const dt = Math.min(0.034, Math.max(0.008, (now - last) / 1000 || 0.016));
        last = now || 16;
        if (running) {
          const thrust = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
          v += (-K * DH(x, r) - DAMP * v) * dt + thrust * THRUST * dt;
          v = clamp(v, -1.2, 1.2);
          x += v * dt;
          if (x < 0.015) { x = 0.015; v = Math.abs(v) * 0.4; }
          if (x > 0.985) { x = 0.985; v = -Math.abs(v) * 0.4; }
        }
        const g = Math.abs(DH(x, r)), bh = H_(x, r), gmin = globalMin(r);
        draw();
        if (g < 0.06 && Math.abs(v) < 0.03) still += dt; else still = 0;

        if (running && still > 0.7) {
          still = 0;
          if (bh <= gmin.h + 0.02) {
            wonRounds++;
            NF.sfx.good();
            roundOut.textContent = 'Дно найдено: ' + wonRounds + ' / 3';
            roundOut.className = 'pill ok';
            if (wonRounds === 3) {
              running = false;
              msg.innerHTML = '<span style="color:#35d6a4;font-weight:700">Все три рельефа пройдены.</span> '
                + 'Ты только что вручную повторил то, что алгоритм делает миллионы раз в секунду.';
              api.status('Все три рельефа пройдены', 'ok');
              NF.ui.win(api, {
                text: 'Вот и весь секрет обучения: измерить ошибку, посчитать наклон в текущей точке, сдвинуть вес вниз и повторить.'
              });
            } else {
              msg.innerHTML = '<span style="color:#35d6a4;font-weight:700">Глобальный минимум, ошибка ' + fmt(bh, 3) + '.</span> Отлично, следующий рельеф сложнее.';
              running = false;
              setTimeout(() => {
                round++; x = ROUNDS[round].start; v = 0; still = 0;
                roundOut.textContent = 'Раунд ' + (round + 1) + ' / 3';
                roundOut.className = 'pill';
                msg.textContent = ROUNDS[round].hint;
                draw(); running = true;
              }, 1800);
            }
          } else {
            msg.innerHTML = '<span style="color:#f5b13d;font-weight:700">Локальный минимум (ошибка ' + fmt(bh, 3) + ').</span> '
              + 'Дальше вниз нельзя. Настоящее дно даёт ' + fmt(gmin.h, 3) + ' — придётся перебраться через гребень.';
            if (Math.random() < 0.01) NF.sfx.bad();
          }
        }
        raf = requestAnimationFrame(loop);
      }
      api.onClean(() => cancelAnimationFrame(raf));

      const left = h('button', { class: 'btn ghost' }, '← левее');
      const right = h('button', { class: 'btn ghost' }, 'правее →');
      [left, right].forEach((b, i) => {
        const k = i ? 'right' : 'left';
        const on = e => { e.preventDefault(); keys[k] = true; };
        const off = () => keys[k] = false;
        b.addEventListener('pointerdown', on);
        b.addEventListener('pointerup', off);
        b.addEventListener('pointerleave', off);
        b.addEventListener('pointercancel', off);
      });
      const restart = h('button', { class: 'btn sm ghost' }, 'Начать рельеф заново');
      restart.addEventListener('click', () => { x = ROUNDS[round].start; v = 0; still = 0; msg.textContent = ROUNDS[round].hint; draw(); });

      const onKeyDown = e => {
        if (e.key === 'ArrowLeft') { keys.left = true; return true; }
        if (e.key === 'ArrowRight') { keys.right = true; return true; }
        return false;
      };
      const onKeyUp = e => {
        if (e.key === 'ArrowLeft') keys.left = false;
        if (e.key === 'ArrowRight') keys.right = false;
      };
      const onBlur = () => { keys.left = false; keys.right = false; };
      NF._keys = onKeyDown;
      document.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);
      api.onClean(() => {
        NF._keys = null;
        document.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
      });

      body.append(
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' } },
          roundOut,
          h('span', { class: 'pill' }, 'ошибка ', lossOut),
          h('span', { class: 'pill' }, 'градиент ', gradOut),
          restart),
        h('div', { class: 'canvas-wrap', style: { padding: '6px' } }, svg),
        h('p', { style: { marginTop: '10px' } }, msg),
        h('div', { class: 'touch-pad' }, left, right),
        h('div', { class: 'keyhelp' },
          h('kbd', {}, '←'), h('kbd', {}, '→'), h('span', {}, 'катит шарик. Подожди в дне — и уровень закроется.')));

      draw();
      api.status('Скатись в дно', '');
      raf = requestAnimationFrame(loop);
      api.hints(['жёлтая стрелка = градиент', 'дно = минимум ошибки', 'локальные минимумы — ловушки']);
    }
  });

  /* ============================================================
     7. РЕАЛЬНОЕ ОБУЧЕНИЕ
     ============================================================ */
  NF.register({
    title: 'Обучение по эпохам',
    tag: 'Шаг 7 · практика',
    lead: 'Здесь настоящая нейросеть учится прямо в твоём браузере: тот же прямой проход, та же ошибка, тот же спуск.',
    goal: 'Доведи точность на тестовых точках до 96% и посмотри, как ломает обучение слишком большой шаг.',
    hint: 'Это уже не анимация — здесь живой расчёт',
    wide: true,
    explain: `
      <p>Задача на экране — <em>XOR</em>: две группы точек, которые прямой линией не разделить. Одна нейронная линейная функция тут не справится, нужна сеть со скрытым слоем. Ровно поэтому в реальных моделях слои многослойные.</p>
      <p>Сеть честно обучается: 2 входа → 4 скрытых нейрона → 1 выход. Каждая точка — пример с правильным ответом, ошибка считается как в прошлом уровне, веса правятся вниз по градиенту. Это занимает миллисекунды, но повторяется тысячи раз.</p>
      <ul class="takeaways">
        <li><b>Эпоха</b> — один полный проход по всем примерам. Ошибка должна падать от эпохи к эпохе.</li>
        <li>Слишком большой шаг — и веса улетают: ошибка скачет и не уменьшается. Это самая частая поломка обучения.</li>
        <li>Тестовые точки сеть не видела: честная оценка качества, а не подгон под ответы.</li>
      </ul>`,
    mount(body, api) {
      const rnd = NF.rng(1337);
      const CLUSTERS = [
        { x: 0.24, y: 0.24, y_: 1 }, { x: 0.76, y: 0.76, y_: 1 },
        { x: 0.24, y: 0.76, y_: 0 }, { x: 0.76, y: 0.24, y_: 0 }
      ];
      function gen(n) {
        const out = [];
        for (const c of CLUSTERS) for (let i = 0; i < n; i++) {
          const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.11;
          out.push({ x: clamp(c.x + Math.cos(a) * r, .03, .97), y: clamp(c.y + Math.sin(a) * r, .03, .97), t: c.y_ });
        }
        return out;
      }
      const train = gen(22), test = gen(11);
      const H = 4, Nin = 2;
      const W1 = Array.from({ length: H }, () => Array.from({ length: Nin }, () => rnd() * 0.3 - 0.15));
      const b1 = Array.from({ length: H }, () => rnd() * 0.2 - 0.1);
      const W2 = Array.from({ length: H }, () => rnd() * 0.3 - 0.15);
      let b2 = 0, vB2 = 0;
      const vW1 = W1.map(a => a.map(() => 0)), vb1 = b1.map(() => 0), vW2 = W2.map(() => 0);
      const tanh = Math.tanh, sig = z => 1 / (1 + Math.exp(-z));

      const LRS = [0.005, 0.02, 0.08, 0.3, 1, 3, 8];
      let lrIdx = 3, epoch = 0, best = 1e9, hist = [], raf = 0, running = true, won = false;
      const box = canvasBox(700, 400);

      function fwd(p) {
        const hid = W1.map((w, i) => tanh(w[0] * p.x + w[1] * p.y + b1[i]));
        const z = W2.reduce((s, w, i) => s + w * hid[i], 0) + b2;
        return { hid, p: sig(z) };
      }
      function evaluate() {
        let loss = 0;
        for (const p of train) { const o = fwd(p).p; loss += -(p.t * Math.log(o + 1e-9) + (1 - p.t) * Math.log(1 - o + 1e-9)); }
        return loss / train.length;
      }
      function acc(set) { let ok = 0; for (const p of set) { const o = fwd(p).p; if ((o > 0.5 ? 1 : 0) === p.t) ok++; } return ok / set.length; }

      function trainStep() {
        const gW1 = W1.map(a => a.map(() => 0)), gb1 = b1.map(() => 0), gW2 = W2.map(() => 0); let gb2 = 0;
        const N = train.length;
        for (const p of train) {
          const hid = W1.map((w, i) => tanh(w[0] * p.x + w[1] * p.y + b1[i]));
          const z = W2.reduce((s, w, i) => s + w * hid[i], 0) + b2;
          const o = sig(z);
          const d = (o - p.t) / N;
          gb2 += d;
          for (let i = 0; i < H; i++) {
            gW2[i] += d * hid[i];
            const dh = W2[i] * (1 - hid[i] * hid[i]);
            gb1[i] += d * dh; gW1[i][0] += d * dh * p.x; gW1[i][1] += d * dh * p.y;
          }
        }
        const lr = LRS[lrIdx], mom = 0.9;
        for (let i = 0; i < H; i++) {
          for (let k = 0; k < Nin; k++) { vW1[i][k] = mom * vW1[i][k] - lr * gW1[i][k]; W1[i][k] += vW1[i][k]; }
          vb1[i] = mom * vb1[i] - lr * gb1[i]; b1[i] += vb1[i];
          vW2[i] = mom * vW2[i] - lr * gW2[i]; W2[i] += vW2[i];
        }
        vB2 = mom * vB2 - lr * gb2; b2 += vB2;
        epoch++;
        const l = evaluate();
        hist.push(l);
        if (hist.length > 200) hist.shift();
        if (l < best) best = l;
      }

      /* --- отрисовка точек --- */
      const { c, ctx } = box;
      function draw() {
        ctx.clearRect(0, 0, box.w, box.h);
        ctx.fillStyle = '#10141e'; ctx.fillRect(0, 0, box.w, box.h);
        ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
        for (let i = 1; i < 10; i++) {
          ctx.beginPath(); ctx.moveTo(i * box.w / 10, 0); ctx.lineTo(i * box.w / 10, box.h); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i * box.h / 10); ctx.lineTo(box.w, i * box.h / 10); ctx.stroke();
        }
        const mix = t => {
          if (t < .5) { const k = t / .5; return [244 + (150 - 244) * k, 97 + (130 - 97) * k, 126 + (150 - 126) * k]; }
          const k = (t - .5) / .5; return [150 + (53 - 150) * k, 130 + (214 - 130) * k, 150 + (164 - 150) * k];
        };
        const paint = (set, r, test_) => {
          for (const p of set) {
            const o = fwd(p).p;
            const t = p.t === 1 ? o : 1 - o;
            const cx = 24 + p.x * (box.w - 48), cy = 24 + p.y * (box.h - 48);
            const c3 = mix(t);
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832);
            ctx.fillStyle = 'rgb(' + c3.map(v => Math.round(v)).join(',') + ')';
            ctx.globalAlpha = test_ ? .55 : .95; ctx.fill();
            ctx.lineWidth = test_ ? 1.6 : 0;
            ctx.strokeStyle = 'rgba(255,255,255,.4)';
            if (test_) ctx.stroke();
            ctx.globalAlpha = 1;
          }
        };
        paint(test, 4.5, true); paint(train, 6, false);
        ctx.fillStyle = '#6f7a94'; ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillText('мелкий контур = тест (сеть их не видела)', 14, 20);
        ctx.fillStyle = '#aab4cc';
        ctx.fillText('мятный = сеть уверенно права   ·   серый = не уверена   ·   розовый = уверенно неправа', 14, box.h - 10);
      }

      /* --- график ошибки --- */
      const chart = NF.ui.chart(400, 150);
      function drawChart() {
        chart.innerHTML = '';
        const W = 400, HH = 150, L = 34, B = 122, T = 12, Rr = 388;
        chart.append(S('line', { x1: L, y1: T, x2: L, y2: B, class: 'axis' }));
        chart.append(S('line', { x1: L, y1: B, x2: Rr, y2: B, class: 'axis' }));
        [0, 0.5, 1].forEach(v => {
          const y = B - v * (B - T);
          chart.append(S('line', { x1: L, y1: y, x2: Rr, y2: y, class: 'gridline' }));
          chart.append(S('text', { x: L - 6, y: y + 4, class: 'axlabel', 'text-anchor': 'end', text: v.toFixed(1) }));
        });
        if (hist.length > 1) {
          const pts = hist.map((v, i) => {
            const x = L + i / (hist.length - 1) * (Rr - L);
            const y = B - clamp(v, 0, 1) * (B - T);
            return x.toFixed(1) + ',' + y.toFixed(1);
          });
          chart.append(S('polygon', { points: L + ',' + B + ' ' + pts.join(' ') + ' ' + Rr + ',' + B, fill: 'rgba(53,214,164,.14)' }));
          chart.append(S('polyline', { points: pts.join(' '), fill: 'none', stroke: '#35d6a4', 'stroke-width': 2 }));
        }
        chart.append(S('text', { x: L, y: 142, class: 'axlabel', text: 'эпохи →' }));
        chart.append(S('text', { x: Rr, y: 142, class: 'axlabel', 'text-anchor': 'end', text: 'ошибка падает = учится' }));
      }

      const lossOut = h('span', { class: 'mono', style: { fontSize: '15px', color: '#35d6a4' } }, '—');
      const accOut = h('span', { class: 'mono', style: { color: '#61a8f5' } }, '—');
      const testOut = h('span', { class: 'mono', style: { color: '#f5b13d' } }, '—');
      const epochOut = h('span', { class: 'mono' }, '0');
      const stateOut = h('div', { style: { fontSize: '13px', color: '#6f7a94', minHeight: '34px' } },
        'Меняй скорость обучения и смотри, что будет. Большая — ломает, маленькая — учит медленно.');

      const lrBtns = LRS.map((v, i) => {
        const b = h('button', { class: 'btn ghost sm' }, String(v));
        b.title = ['шаг слишком мал — сеть буксует', 'очень медленно', 'медленно, но верно', 'хороший шаг', 'быстро', 'очень быстро, на грани', 'ломает обучение'][i];
        b.addEventListener('click', () => {
          lrIdx = i; paintLr();
          lossOut.style.color = '#35d6a4';
          stateOut.style.color = '#6f7a94';
          stateOut.textContent = b.title + '. Смотри, что будет с точками и кривой ошибки.';
          NF.sfx.tap();
        });
        return b;
      });
      function paintLr() { lrBtns.forEach((b, i) => { b.className = 'btn sm ' + (i === lrIdx ? '' : 'ghost'); }); }

      const pauseBtn = h('button', { class: 'btn ghost sm' }, 'Пауза');
      pauseBtn.addEventListener('click', () => { running = !running; pauseBtn.textContent = running ? 'Пауза' : 'Продолжить'; NF.sfx.tap(); });
      const resetBtn = h('button', { class: 'btn ghost sm' }, 'Заново со случайными весами');
      resetBtn.addEventListener('click', () => NF.go(NF.cur));
      const fastBtn = h('button', { class: 'btn sm' }, 'Ускорить x4');
      let fast = 1, tick = 0, deadSince = 0;
      fastBtn.addEventListener('click', () => {
        fast = fast === 1 ? 4 : (fast === 4 ? 10 : 1);
        fastBtn.textContent = 'Ускорить x' + (fast === 1 ? 4 : (fast === 4 ? 10 : 1));
        NF.sfx.tap();
      });

      function loop() {
        if (running && !won) {
          for (let i = 0; i < fast; i++) trainStep();
          if (++tick % 4 === 0) {
            const a1 = acc(train), a2 = acc(test), l = evaluate();
            lossOut.textContent = fmt(l, 3);
            accOut.textContent = Math.round(a1 * 100) + '%';
            testOut.textContent = Math.round(a2 * 100) + '%';
            epochOut.textContent = epoch;
            draw(); drawChart();
            api.status('Эпоха ' + epoch + ' · точность на тесте ' + Math.round(a2 * 100) + '%',
              a2 >= 0.96 ? 'ok' : (a2 > 0.6 ? 'warn' : ''));
            if (a2 >= 0.96) {
              won = true; running = false;
              pauseBtn.disabled = true;
              stateOut.innerHTML = '<span style="color:#35d6a4;font-weight:700">Готово: сеть обучилась за ' + epoch + ' эпох.</span> '
                + 'Точность на незнакомых точках — ' + Math.round(a2 * 100) + '%. Ошибка упала с ' + fmt(hist[0] || l, 2) + ' до ' + fmt(l, 3) + '.';
              stateOut.style.color = '#aab4cc';
              NF.sfx.win();
              NF.ui.win(api, {
                text: 'Ты только что обучил настоящую нейросеть в браузере. Ровно этот же код стоит внутри всех больших моделей.'
              });
            } else if (Number.isNaN(l) || l > 0.68) {
              if (++deadSince > 12) {
                stateOut.innerHTML = '<span style="color:#f4617e;font-weight:700">Сеть не учится.</span> '
                  + 'Ошибка застряла на ' + fmt(l, 2) + ' — это значит, что шаг слишком большой и веса слетают с нужного пути. Уменьши скорость обучения.';
                stateOut.style.color = '#f4617e';
                lossOut.style.color = '#f4617e';
              }
            } else deadSince = 0;
          }
        }
        raf = requestAnimationFrame(loop);
      }
      api.onClean(() => cancelAnimationFrame(raf));

      body.append(
        h('div', { class: 'cols', style: { gap: '22px' } },
          h('div', {},
            h('div', { class: 'canvas-wrap' }, box.c),
            h('div', { class: 'legend-bar' },
              h('span', {}, 'ошибка: ', lossOut),
              h('span', {}, 'обучение: ', accOut),
              h('span', {}, 'тест: ', testOut))),
          h('div', {},
            h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' } },
              h('span', { class: 'pill' }, 'эпоха ', epochOut),
              h('span', { class: 'pill' }, '2 → 4 → 1 нейрона')),
            h('div', { class: 'canvas-wrap', style: { padding: '8px' } }, chart),
            h('div', { style: { marginTop: '12px' } },
              h('div', { style: { fontSize: '12px', color: '#6f7a94', marginBottom: '6px' } }, 'скорость обучения (learning rate):'),
              h('div', { class: 'btn-row' }, lrBtns)),
            h('div', { class: 'btn-row', style: { marginTop: '10px' } }, pauseBtn, fastBtn, resetBtn),
            h('div', { style: { marginTop: '10px' } }, stateOut))),
      );
      paintLr(); draw(); drawChart();
      raf = requestAnimationFrame(loop);
      api.hints(['lr 8 — ломает', 'lr 0.005 — буксует', 'нужна точность 96%']);
    }
  });

  /* ============================================================
     8. КАК МОДЕЛЬ ПИШЕТ ТЕКСТ
     ============================================================ */
  NF.register({
    title: 'Генерация текста',
    tag: 'Шаг 8 · вывод',
    lead: 'Модель не знает ответ заранее: она предсказывает следующий кусочек текста и тут же дописывает его сама.',
    goal: 'Угадай, какое продолжение выберет модель, и покрути температуру до абсурда.',
    hint: 'Сначала угадай, потом «Показать ответ модели»',
    explain: `
      <p>После обучения модель умеет одну простую вещь: <b>дописать следующий токен</b> по тексту перед ним. Она смотрит на распределение вероятностей и берёт один кусочек — так текст растёт по одному токену за шаг.</p>
      <span class="formula">«кот сидит на →  коврике 0.41 · подоконнике 0.19 · полу 0.11 …»</span>
      <p>Никакого «понимания» тут нет — просто очень хорошо выученная статистика языка. <b>Температура</b> решает, насколько смело выбирать редкие варианты: на низкой модель говорит скучно и предсказуемо, на высокой — выдаёт странное, иногда абсурдное.</p>
      <ul class="takeaways">
        <li>Топ-k и «ядерная» выборка заставляют модель выкидывать хвост распределения — отсюда «галлюцинации».</li>
        <li>Один и тот же промпт при разной температуре даёт разные ответы — это нормально, а не баг.</li>
        <li>Модель всегда продолжает текст, даже если не знает факт: она оптимизирует правдоподобие, а не истину.</li>
      </ul>`,
    mount(body, api) {
      const CORPUS = [
        'кот сидит на коврике', 'кот сидит на подоконнике', 'кот сидит на столе', 'кот сидит на крыше',
        'кот пьёт воду', 'кот пьёт молоко', 'кот спит на клавиатуре', 'кот бегает по саду',
        'кот смотрит на птицу', 'машина едет по дороге', 'машина едет по городу', 'машина едет по трассе',
        'машина стоит в гараже', 'машина ломается', 'человек читает книгу', 'человек читает газету',
        'человек читает письмо', 'человек пишет код', 'человек пьёт кофе'
      ];
      const START = 'кот';
      const COUNTS = {};
      CORPUS.forEach(s => {
        const w = s.split(' ');
        for (let i = 0; i < w.length - 1; i++) {
          const k = w[i];
          COUNTS[k] = COUNTS[k] || {};
          COUNTS[k][w[i + 1]] = (COUNTS[k][w[i + 1]] || 0) + 1;
        }
      });
      const JUNK = ['совсем', 'чуть', 'очень', 'вдруг', 'сразу'];
      function probs(w) {
        const c = COUNTS[w] || {};
        const keys = Object.keys(c);
        const tot = keys.reduce((s, k) => s + c[k], 0);
        const known = keys.map(k => ({ w: k, p: tot ? 0.82 * c[k] / tot : 0 }));
        const tail = JUNK.map(k => ({ w: k, p: 0.18 / JUNK.length }));
        return (known.length ? known : tail.slice(0, 3)).concat(tail)
          .sort((a, b) => b.p - a.p);
      }

      const TASKS = [
        { ctx: 'кот', right: 'сидит', wrong: ['пьёт', 'спит', 'бегает'] },
        { ctx: 'машина', right: 'едет', wrong: ['стоит', 'ломается', 'ждёт'] },
        { ctx: 'человек', right: 'читает', wrong: ['пишет', 'пьёт', 'думает'] },
        { ctx: 'кот бегает', right: 'по', wrong: ['на', 'быстро', 'далеко'] }
      ];
      let round = 0, score = 0, answered = false, won = false;
      const rnd = NF.rng(5);

      const card = h('div', {});
      const scorePill = h('span', { class: 'pill' }, '0 угадано');

      function loadRound() {
        answered = false;
        card.innerHTML = '';
        const t = TASKS[round];
        const p = probs(t.ctx);
        const opts = [t.right, ...t.wrong];
        for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
        const q = h('div', { style: { fontSize: '16px', fontWeight: '700', margin: '4px 0 4px' } },
          'Продолжение после «' + t.ctx + '»:');
        const optRow = h('div', { style: { display: 'grid', gap: '8px', marginTop: '10px' } });
        let picked = null;
        const reveal = h('button', { class: 'btn', disabled: true }, 'Показать ответ модели');
        const outBox = h('div', { style: { fontSize: '13.5px', color: '#aab4cc', marginTop: '10px' } }, '');
        const next = h('button', { class: 'btn ghost', disabled: true }, 'Дальше');
        const btns = opts.map((o, i) => {
          const b = h('button', { class: 'quiz-opt' }, h('span', { class: 'mk' }, String.fromCharCode(65 + i)), o);
          b.dataset.opt = o;
          b.addEventListener('click', () => {
            if (answered) return;
            picked = o; reveal.disabled = false;
            btns.forEach(x => x.style.opacity = .55);
            b.style.opacity = 1; NF.sfx.tap();
          });
          optRow.append(b); return b;
        });
        reveal.addEventListener('click', () => {
          if (answered) return;
          answered = true; reveal.disabled = true; next.disabled = false;
          const hit = picked === p[0].w;
          if (hit) { score++; NF.sfx.good(); } else NF.sfx.bad();
          btns.forEach(x => {
            const o = x.dataset.opt;
            x.classList.remove('right', 'wrong');
            if (o === p[0].w) x.classList.add('right');
            else if (o === picked) x.classList.add('wrong');
          });
          scorePill.textContent = score + ' угадано';
          scorePill.className = 'pill ' + (score >= 3 ? 'ok' : 'amber');
          outBox.innerHTML = '';
          outBox.append(h('div', {},
            h('span', { style: { color: hit ? '#35d6a4' : '#f4617e', fontWeight: '700' } }, hit ? 'Верно! ' : 'Не угадал. '),
            'Модель выбрала «' + p[0].w + '» с вероятностью ' + Math.round(p[0].p * 100) + '%.'),
            h('div', { class: 'bars', style: { marginTop: '10px' } },
              p.slice(0, 5).map(x => h('div', { class: 'bar-row' },
                h('span', {}, '«' + x.w + '»'),
                h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: (x.p * 100) + '%', background: x.w === p[0].w ? '#35d6a4' : '#61a8f5' } })),
                h('span', { class: 'bar-val' }, Math.round(x.p * 100) + '%')))));
          api.status('Угадано ' + score + ' из ' + (round + 1), hit ? 'warn' : 'bad');
          if (round === TASKS.length - 1) finish();
        });
        next.addEventListener('click', () => {
          if (round === TASKS.length - 1) { loadRound(); return; }
          round++; loadRound();
        });
        card.append(q,
          h('div', { style: { fontSize: '12.5px', color: '#6f7a94' } }, 'Какой кусочек модель поставит дальше?'),
          optRow,
          h('div', { class: 'btn-row', style: { marginTop: '12px' } }, reveal, next),
          outBox);
        api.status('Раунд ' + (round + 1) + ' из ' + TASKS.length, '');
      }
      function finish() {
        if (won) return;
        if (score >= 3) {
          won = true;
          api.status('Разгадано ' + score + ' из ' + TASKS.length, 'ok');
          NF.ui.win(api, {
            title: 'Ты угадал статистику модели ' + score + ' из ' + TASKS.length,
            text: 'Дальше — самое интересное. Крути температуру и смотри, как «характер» модели меняется на глазах.'
          });
        } else {
          api.status('Угадано ' + score + ' из ' + TASKS.length + ' — попробуй ещё', 'bad');
        }
      }

      /* --- генератор с температурой --- */
      const tempSlider = h('input', { type: 'range', min: '10', max: '220', value: '35' });
      const tempOut = h('span', { class: 'slider-val mono' }, '0.35');
      const genOut = h('div', { style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', lineHeight: 1.7, color: '#e9eefa', minHeight: '52px' } });
      const logBox = h('div', { style: { fontSize: '12px', color: '#6f7a94', marginTop: '8px' } }, '');

      function generate() {
        const T = +tempSlider.value / 100;
        tempOut.textContent = T.toFixed(1);
        const rndT = NF.rng(4242 + Math.round(T * 100));
        const pick = arr => {
          const p = arr.map(x => Math.pow(x.p, 1 / Math.max(T, .05)));
          const s = p.reduce((a, b) => a + b, 0);
          let r = rndT() * s;
          for (let i = 0; i < p.length; i++) { r -= p[i]; if (r <= 0) return arr[i].w; }
          return arr[0].w;
        };
        let cur = START, out = [cur], log = [];
        for (let i = 0; i < 9; i++) {
          const p = probs(cur);
          const nxt = pick(p);
          log.push(cur + ' → ' + nxt + ' (' + Math.round(p[0].p * 100) + '% за «' + p[0].w + '»)');
          cur = nxt; out.push(cur);
          if (log.length > 3) log.shift();
        }
        genOut.textContent = out.join(' ');
        logBox.textContent = log.join('  ·  ');
      }
      tempSlider.addEventListener('input', () => { NF.sfx.tick(); generate(); });
      const genBtn = h('button', { class: 'btn sm' }, 'Сгенерировать заново');
      genBtn.addEventListener('click', generate);

      const genCard = h('div', { class: 'card card-pad', style: { background: 'rgba(255,255,255,.03)' } },
        h('div', { style: { fontWeight: '800', marginBottom: '4px' } }, 'Генератор с температурой'),
        h('p', { style: { fontSize: '12.5px', color: '#6f7a94', margin: '0 0 10px' } },
          'Модель продолжает текст по одному токену, опираясь на вероятности. Крути температуру:'),
        h('div', { class: 'sliders' }, h('div', { class: 'slider-row' },
          h('span', {}, 'температура'), tempSlider, tempOut)),
        h('div', { class: 'btn-row', style: { marginTop: '10px' } }, genBtn),
        h('div', { style: { marginTop: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,.25)' } }, genOut),
        logBox,
        h('p', { style: { fontSize: '12.5px', color: '#6f7a94', marginTop: '8px' } },
          'На 0.2 модель почти всегда берёт самый вероятный вариант — скучно, зато надёжно. На 1.5+ начинаются неожиданные и абсурдные продолжения.'));

      body.append(
        h('div', { class: 'cols', style: { gap: '22px' } },
          h('div', {},
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' } },
              h('h3', { style: { margin: 0, fontSize: '15px' } }, 'Угадай продолжение'), scorePill),
            card),
          h('div', {}, genCard)));
      loadRound(); generate();
      api.hints(['смотри на вероятности', '3 из 4 угаданных = победа', 'крути температуру']);
    }
  });

  /* ============================================================
     9. ИТОГИ
     ============================================================ */
  NF.register({
    title: 'Итоги',
    tag: 'Финал · схема',
    lead: 'Вот весь путь обучения целиком — от букв до готовой модели, которая отвечает.',
    goal: 'Закрой квиз и собери финальную картинку.',
    hint: 'Проверь, что осталось в голове',
    wide: true,
    explain: `
      <p>Модель — это не магия, а повторяемый цикл: <em>посмотрели → оценили ошибку → чуть подвинули ручки → повторили</em>. Всё остальное — детали масштаба.</p>
      <p>Ты только что прошёл этот цикл руками: собрал текст из токенов, разложил слова по смыслу, покрутил вес нейрона, посчитал ошибку, скатился по градиенту и обучил настоящую сеть.</p>
      <ul class="takeaways">
        <li><b>Токены</b> — куски текста, с которыми работает модель.</li>
        <li><b>Эмбеддинги</b> — смысл в координатах.</li>
        <li><b>Веса</b> — вся «память» модели, накопленная в числах.</li>
        <li><b>Ошибка</b> — мера расстояния до правды.</li>
        <li><b>Градиентный спуск</b> — шаги вниз по склону ошибки.</li>
        <li><b>Эпохи</b> — повторы, во время которых модель становится точнее.</li>
      </ul>`,
    mount(body, api) {
      const FLOW = [
        ['01', 'Данные', 'Текст, картинки, звук — сырьё, на котором модель учатся'],
        ['02', 'Токены', 'Сырьё режется на куски, каждому куску — свой номер в словаре'],
        ['03', 'Прямой проход', 'Сигнал идёт через слои, на выходе — вероятности'],
        ['04', 'Ошибка', 'Сравниваем с правдой, получаем одно число: loss'],
        ['05', 'Обратный проход', 'Считаем, в какую сторону крутить каждую ручку'],
        ['06', 'Обновление весов', 'Веса сдвигаются вниз по градиенту — и цикл по новой']
      ];
      const flow = h('div', { class: 'flowmap' },
        FLOW.map(f => h('div', { class: 'flownode' },
          h('div', { class: 'n' }, f[0]),
          h('strong', {}, f[1]),
          h('p', {}, f[2]))));

      const done = NF.done.filter(Boolean).length;
      const summary = h('div', { class: 'summary' },
        h('div', { class: 'stat' }, h('b', {}, done + '/' + NF.levels.length), h('span', {}, 'уровней пройдено')),
        h('div', { class: 'stat' }, h('b', {}, done + '★'), h('span', {}, 'звёзд собрано')),
        h('div', { class: 'stat' }, h('b', {}, '96%'), h('span', {}, 'лучшая точность модели в игре')),
        h('div', { class: 'stat' }, h('b', {}, '2 → 4 → 1'), h('span', {}, 'нейронов в сети, которую ты обучил')));

      const QUIZ = [
        { q: 'Что такое токен?', opts: ['Отдельная буква', 'Кусок текста из словаря модели', 'Число веса', 'Готовый ответ'], right: 1, why: 'Токен — кусок текста, у которого есть номер в словаре модели.' },
        { q: 'Где хранится «знание» модели?', opts: ['В коде программы', 'В базе данных на сервере', 'В весах — миллиардах чисел', 'В словаре токенов'], right: 2, why: 'Словарь только размечает куски текста, а знание — это веса.' },
        { q: 'Зачем нужна функция потерь?', opts: ['Красиво показать в логах', 'Превратить ошибку в число, по которому можно спускаться', 'Защитить от переобучения', 'Считать скорость'], right: 1, why: 'Loss — это гладкое число, по нему считается направление шага.' },
        { q: 'Что делает градиентный спуск?', opts: ['Увеличивает скорость', 'Шагает вниз по склону ошибки', 'Меняет словарь', 'Сжимает модель'], right: 1, why: 'Каждый шаг — сдвиг весов в сторону уменьшения ошибки.' },
        { q: 'Почему модель иногда выдумывает?', opts: ['Потому что у неё нет интернета', 'Оптимизирует правдоподобие, а не истину; высокая температура усиливает риск', 'Потому что сломалась сеть', 'Потому что мало эпох'], right: 1, why: 'Модель продолжает текст по статистике, а не проверяет факты.' },
        { q: 'Что такое переобучение?', opts: ['Модель выучила примеры наизусть и теряет качество на новых', 'Модель слишком медленно учится', 'Веса стали нулями', 'Данных оказалось слишком много'], right: 0, why: 'Признак — отличные результаты на обучении и провал на тесте.' }
      ];
      let qi = 0, qScore = 0;
      const quizBox = h('div', {});
      const qOut = h('div', { style: { fontSize: '13px', color: '#6f7a94', marginTop: '8px' } }, '');

      function loadQ() {
        if (qi >= QUIZ.length) {
          quizBox.innerHTML = '';
          const good = qScore >= 4;
          quizBox.append(h('div', { class: 'card card-pad', style: { background: 'rgba(53,214,164,.07)', border: '1px solid rgba(53,214,164,.3)' } },
            h('div', { style: { fontWeight: '800', fontSize: '16px', marginBottom: '6px' } },
              good ? 'Круто — ты реально разобрался' : 'Неплохо, но есть что подтянуть'),
            h('p', { style: { fontSize: '13.5px', color: '#aab4cc', margin: '0 0 12px' } },
              'Правильных ответов: ' + qScore + ' из ' + QUIZ.length + '. ' +
              (good ? 'Теперь ты можешь объяснить принцип обучения человеку, который никогда об этом не думал.'
                : 'Переиграй уровни, где были формулы, — и пройди квиз ещё раз.')),
            h('div', { class: 'btn-row' },
              h('button', { class: 'btn ghost', onclick: () => NF.go(0) }, 'Пройти заново'),
              h('button', { class: 'btn ghost', onclick: () => { qi = 0; qScore = 0; loadQ(); } }, 'Повторить квиз'))));
          if (!good) {
            api.status('Квиз пройден, но есть пробелы', 'warn');
          } else {
            api.status('Квиз пройден на отлично!', 'ok');
            NF.sfx.win();
            NF.ui.win(api, {
              title: 'Поздравляю — ты обучил модель руками',
              text: 'Ты прошёл все ' + NF.levels.length + ' уровней: от токенов до работающего обучения. Именно так и устроено обучение любой ИИ-модели.'
            });
          }
          return;
        }
        const it = QUIZ[qi];
        quizBox.innerHTML = '';
        const opts = h('div', {});
        const btns = it.opts.map((o, i) => {
          const b = h('button', { class: 'quiz-opt' }, h('span', { class: 'mk' }, String.fromCharCode(65 + i)), o);
          b.addEventListener('click', () => {
            if (b.parentNode.dataset.answered) return;
            b.parentNode.dataset.answered = '1';
            const hit = i === it.right;
            btns.forEach((x, j) => {
              x.classList.remove('right', 'wrong');
              if (j === it.right) x.classList.add('right');
              else if (j === i) x.classList.add('wrong');
            });
            if (hit) { qScore++; NF.sfx.good(); } else NF.sfx.bad();
            qOut.textContent = it.why;
            qOut.style.color = hit ? '#35d6a4' : '#f5b13d';
            nextQ.disabled = false;
            api.status('Квиз: ' + qScore + ' из ' + (qi + 1), hit ? 'warn' : 'bad');
          });
          opts.append(b); return b;
        });
        const nextQ = h('button', { class: 'btn', disabled: true, style: { marginTop: '10px' } }, 'Следующий вопрос');
        nextQ.addEventListener('click', () => { qi++; qOut.textContent = ''; loadQ(); });
        quizBox.append(
          h('div', { class: 'quiz-q' }, (qi + 1) + '. ' + it.q),
          opts, nextQ, qOut);
      }

      const resetAll = h('button', { class: 'btn ghost sm' }, 'Сбросить прогресс');
      resetAll.addEventListener('click', () => { if (confirm('Начать игру заново?')) { NF.done = NF.levels.map(() => false); NF.go(0); } });

      body.append(
        summary,
        h('div', { style: { marginBottom: '20px' } },
          h('h3', { style: { margin: '0 0 4px', fontSize: '15px' } }, 'Цикл обучения целиком'),
          h('p', { style: { margin: '0 0 12px', fontSize: '13px', color: '#6f7a94' } },
            'Шаги 3–6 повторяются тысячи и миллионы раз — это и есть обучение.'),
          flow),
        h('div', { class: 'cols', style: { gap: '20px' } },
          h('div', {},
            h('h3', { style: { margin: '0 0 4px', fontSize: '15px' } }, 'Квиз на закрепление'),
            h('p', { style: { margin: '0 0 12px', fontSize: '13px', color: '#6f7a94' } }, '6 вопросов, по одному на каждую ступень.'),
            quizBox),
          h('div', {},
            h('h3', { style: { margin: '0 0 4px', fontSize: '15px' } }, 'Что дальше?'),
            h('div', { class: 'explain' },
              h('p', {}, 'Дальше в игре осталось показать: '),
              h('ul', { class: 'takeaways' },
                h('li', {}, 'слои внимания — как модель сама решает, на какое слово смотреть;'),
                h('li', {}, 'дообучение и файнтюнинг — как обучают модель на твоих данных;'),
                h('li', {}, 'RLHF — как человека заменяют наградой за хороший ответ.')),
              h('p', { style: { marginTop: '12px' } },
                'А пока — ты уже знаешь ровно столько, чтобы не вестись на «ИИ думает».')),
            h('div', { class: 'btn-row', style: { marginTop: '14px' } }, resetAll))),
      );
      loadQ();
    }
  });

})(window.NF);
