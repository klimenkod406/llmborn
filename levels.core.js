/* ============================================================
   LLMborn — уровни 1..4
   ============================================================ */
(function (NF) {
  const h = NF.h, S = NF.S, clamp = NF.clamp, fmt = NF.fmt;

  /* ============================================================
     1. ТОКЕНЫ
     ============================================================ */
  NF.register({
    title: 'Токены',
    tag: 'Шаг 1 · вход',
    lead: 'Модель не читает буквы. Она читает кусочки текста — токены. Всё начинается именно с них.',
    goal: 'Собери 4 слова из токенов и проверь, как режет текст настоящий токенизатор.',
    hint: 'Нажми на кусочек, потом на пустое место',
    explain: `
      <p>Когда ты пишешь сообщение, оно режется на короткие кусочки — <b>токены</b>. Слово «кошка» может стать <code>ко</code> + <code>шка</code>, а «Нейросеть» — <code>Ней</code> + <code>ро</code> + <code>сеть</code>. Это делает <em>токенизатор</em> — первая дверь, через которую проходит любой текст.</p>
      <p>Один токен — это не слово и не буква, а просто кусок в словаре. У модели есть конечный словарь (обычно 50–200 тысяч записей), и всё, что она знает про язык, хранится как <b>числа, стоящие на месте этих кусочков</b>.</p>
      <span class="formula">текст → токены → числа → всё остальное</span>
      <ul class="takeaways">
        <li><b>Длинные тексты экономятся:</b> 1 токен ≈ 4 знака, значит текст в 3–4 раза короче в памяти модели.</li>
        <li>Редкие слова разбиваются на куски — поэтому модель «знает» их по частям.</li>
        <li>Плата за это: <b>счёт символов</b> и деньги на API считаются в токенах, а не в буквах.</li>
      </ul>`,
    mount(body, api) {
      const TEXT = 'Кошка сидит на коврике и смотрит на птицу';
      const tasks = [
        { toks: ['при', 'вет'], out: 'привет' },
        { toks: ['ко', 'ш', 'ка'], out: 'кошка' },
        { toks: ['ней', 'ро', 'сеть'], out: 'нейросеть' },
        { toks: ['обу', 'ча', 'ет'], out: 'обучает' }
      ];

      /* --- интерактивный токенизатор --- */
      const line = h('div', { class: 'tok-line' });
      const sliderOut = h('span', { class: 'mono', style: { color: '#35d6a4' } }, '4');
      const tokSlider = h('input', { type: 'range', min: '1', max: '9', value: '4' });
      function renderTokens(n) {
        line.innerHTML = '';
        TEXT.split(' ').forEach((word, wi) => {
          const parts = [];
          for (let i = 0; i < word.length; i += n) parts.push(word.slice(i, i + n));
          parts.forEach((p, pi) => {
            const isInside = parts.length > 1;
            line.append(h('span', {
              class: 'tok ' + (isInside ? 'part' : 'whole') + (pi < parts.length - 1 ? ' lead' : '')
            }, p));
          });
          if (wi < TEXT.split(' ').length - 1) line.append(h('span', {}, ' '));
        });
        const chars = TEXT.replace(/ /g, '').length;
        let t = 0;
        TEXT.split(' ').forEach(w => { t += Math.ceil(w.length / n); });
        tokInfo.textContent = chars + ' знаков → ' + t + ' токенов';
      }
      const tokInfo = h('span', { class: 'pill' }, '');
      tokSlider.addEventListener('input', () => {
        sliderOut.textContent = tokSlider.value;
        NF.sfx.tick();
        renderTokens(+tokSlider.value);
      });
      renderTokens(4);

      const tokenizer = h('div', {},
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' } },
          h('span', { style: { fontSize: '12.5px', color: '#6f7a94' } },
            'Длина токена в символах: ', h('b', { class: 'mono', style: { color: '#aab4cc' } }, '4'),
            '   ·   настоящие модели режут по частям слов, а не по пробелам'),
          tokInfo),
        line,
        h('div', { class: 'sliders', style: { marginTop: '12px' } },
          h('div', { class: 'slider-row' },
            h('span', {}, 'Токен ='),
            tokSlider,
            h('span', { class: 'slider-val' }, sliderOut))));

      /* --- мини-игра: собрать слово --- */
      const tasksBox = h('div', { style: { marginTop: '22px' } });
      const progress = h('span', { class: 'pill' }, '0 / 4');
      let solvedCount = 0;
      const rnd = NF.rng(7);

      function shuffle(a) {
        const x = a.slice();
        for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
        return x;
      }

      const rows = tasks.map((t, ti) => {
        const slots = t.toks.map((_, i) => h('div', { class: 'slot', 'data-task': ti, 'data-i': i }, '·'));
        const tray = h('div', { class: 'tray' });
        const pieceEls = shuffle(t.toks).map(p => {
          const el = h('div', { class: 'piece' }, p);
          el.addEventListener('click', () => {
            if (el.classList.contains('used')) return;
            NF.sfx.tap();
            document.querySelectorAll('.piece.picked').forEach(x => x.classList.remove('picked'));
            el.classList.add('picked');
          });
          tray.append(el);
          return el;
        });
        const row = h('div', { class: 'task', 'data-task': ti },
          h('div', { class: 'task-hint' },
            'Задание ' + (ti + 1) + ' — собери слово из ' + t.toks.length + ' токен(ов)'),
          h('div', { style: { marginBottom: '8px' } }, slots),
          tray);
        slots.forEach((s, i) => s.addEventListener('click', () => {
          const picked = row.querySelector('.piece.picked');
          if (picked && s.classList.contains('filled')) {
            const back = s.textContent; s.textContent = '·'; s.classList.remove('filled');
            const p = pieceEls.find(x => x.textContent === back && !x.classList.contains('used'));
            if (p) p.classList.remove('used');
          }
          if (picked) {
            s.textContent = picked.textContent; s.classList.add('filled');
            picked.classList.add('used'); picked.classList.remove('picked');
            NF.sfx.tap();
          }
        }));
        pieceEls.forEach(p => p.addEventListener('dblclick', () => {
          p.classList.remove('used', 'picked');
          slots.forEach(s => { if (s.classList.contains('filled')) { s.textContent = '·'; s.classList.remove('filled'); } });
        }));
        return row;
      });

      rows.forEach(r => tasksBox.append(r));

      function check() {
        let good = 0;
        tasks.forEach((t, ti) => {
          const row = tasksBox.querySelector('[data-task="' + ti + '"]');
          const slots = [...row.querySelectorAll('.slot')];
          const ok = slots.every((s, i) => s.textContent === t.toks[i]);
          row.classList.toggle('done', ok);
          slots.forEach(s => { s.classList.remove('right', 'wrong'); });
          if (ok) { good++; slots.forEach(s => s.classList.add('right')); }
          else {
            const wrongAt = slots.findIndex((s, i) => s.textContent !== t.toks[i]);
            if (wrongAt >= 0) slots[wrongAt].classList.add('wrong');
            row.querySelectorAll('.piece.used').forEach(p => p.classList.add('used'));
          }
        });
        progress.textContent = good + ' / 4';
        progress.className = 'pill ' + (good === 4 ? 'ok' : (good ? 'amber' : ''));
        if (good === 4 && solvedCount < 4) {
          solvedCount = 4;
          api.status('Все 4 слова собраны!', 'ok');
          NF.ui.win(api, {
            text: 'Ты только что сделал то, что делает токенизатор: разрезал текст на куски и собрал его обратно. Модель делает это миллиарды раз в секунду.'
          });
        } else if (good > 0) {
          api.status('Собрано слов: ' + good + ' из 4', 'warn');
          NF.sfx.tap();
        } else {
          api.status('Пока ни одного слова', '');
          NF.sfx.bad();
        }
      }

      const resetAll = h('button', { class: 'btn ghost sm' }, 'Перемешать заново');
      resetAll.addEventListener('click', () => {
        NF.sfx.tap();
        NF.go(NF.cur);
      });

      body.append(
        tokenizer,
        h('div', { style: { marginTop: '22px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,.09)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' } },
            h('h3', { style: { margin: 0, fontSize: '15px' } }, 'Мини-игра: собери слова'),
            progress),
          tasksBox,
          h('div', { class: 'btn-row', style: { marginTop: '14px' } },
            h('button', { class: 'btn', onclick: check },
              S('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, S('path', { d: 'm5 12 5 5L20 7' })), 'Проверить'),
            resetAll))
      );
      api.hints(['клик по кусочку', 'клик по слоту', 'ползунок режет текст']);
    }
  });

  /* ============================================================
     2. ЭМБЕДДИНГИ
     ============================================================ */
  NF.register({
    title: 'Эмбеддинги',
    tag: 'Шаг 2 · смысл',
    lead: 'Слово превращается в точку на карте. Близко стоят слова со схожим смыслом — и модель знает о них одинаково.',
    goal: 'Разложи 9 слов по трём смысловым группам, а потом покрути вектор слова.',
    hint: 'Тяни слова в подсвеченный круг',
    explain: `
      <p>Каждый токен модель превращает в <b>вектор</b> — просто список чисел (например, 4096 чисел). Найти в нём ничего нельзя, зато можно посчитать, насколько два вектора <em>похожи</em>.</p>
      <p>Если эти числа устроены удачно, то «кошка» оказывается рядом с «котик», а «король» — рядом с «королева». Именно это и называют <b>эмбеддингами</b>: смысл, уложенный в координаты.</p>
      <span class="formula">«кошка» → [0.21, −0.87, 0.44, …] → сравниваем с другими векторами</span>
      <ul class="takeaways">
        <li>Настоящие векторы длинные, на карте их рисуют в 2D как проекцию — так проще смотреть.</li>
        <li>Близость = похожее значение. Это же лежит в основе поиска похожих картинок и текста.</li>
        <li><b>Важно:</b> смысл в числа попал не от руки, а в ходе обучения — наша следующая остановка.</li>
      </ul>`,
    mount(body, api) {
      const CATS = [
        { name: 'кошки', x: 26, y: 63, color: '#35d6a4' },
        { name: 'хищники', x: 56, y: 22, color: '#f5b13d' },
        { name: 'дом и техника', x: 79, y: 71, color: '#61a8f5' }
      ];
      const WORDS = [
        { w: 'кот', c: 0 }, { w: 'кошка', c: 0 }, { w: 'котёнок', c: 0 },
        { w: 'тигр', c: 1 }, { w: 'лев', c: 1 }, { w: 'волк', c: 1 },
        { w: 'пылесос', c: 2 }, { w: 'микрофон', c: 2 }, { w: 'колонка', c: 2 }
      ];
      const rnd = NF.rng(21);
      let placed = 0, won = false;

      const svgMap = S('svg', { viewBox: '0 0 100 62', preserveAspectRatio: 'none', style: 'position:absolute;inset:0;width:100%;height:100%' });
      const glow = S('g');
      CATS.forEach(c => {
        glow.append(S('circle', { cx: c.x, cy: c.y * 0.62, r: 11, fill: c.color, opacity: .1 }));
        glow.append(S('circle', { class: 'blob', cx: c.x, cy: c.y * 0.62, r: 8, fill: 'none', stroke: c.color, 'stroke-width': .35, 'stroke-dasharray': '1.4 1.4', opacity: .8 }));
      });
      svgMap.append(glow);
      const layer = h('div', { style: { position: 'absolute', inset: '0' } });
      const map = h('div', { class: 'map-wrap', style: { position: 'relative', height: '340px' } }, svgMap, layer);

      const legend = h('div', { class: 'legend' },
        CATS.map(c => h('span', {}, h('i', { class: 'swatch', style: { background: c.color } }), c.name)));

      const els = WORDS.map((o, i) => {
        const el = h('div', {
          class: 'word', 'data-i': i,
          style: { left: (8 + rnd() * 84) + '%', top: (10 + rnd() * 78) + '%' }
        }, o.w);
        layer.append(el);
        return el;
      });

      const readout = h('div', { class: 'pill' }, 'Схожесть считается по расстоянию между векторами');

      /* drag & drop на указателе */
      let drag = null;
      els.forEach((el, i) => {
        el.addEventListener('pointerdown', e => {
          if (won) return;
          e.preventDefault();
          drag = { el, i };
          el.classList.add('dragging');
          el.setPointerCapture(e.pointerId);
        });
        el.addEventListener('pointermove', e => {
          if (!drag || drag.el !== el) return;
          const r = map.getBoundingClientRect();
          const x = clamp((e.clientX - r.left) / r.width * 100, 5, 95);
          const y = clamp((e.clientY - r.top) / r.height * 100, 6, 94);
          el.style.left = x + '%'; el.style.top = y + '%';
          let best = -1, bd = 1e9;
          CATS.forEach((c, ci) => {
            const d = Math.hypot(x - c.x, y - c.y);
            if (d < bd) { bd = d; best = ci; }
          });
          glow.querySelectorAll('.blob').forEach((b, bi) => {
            b.setAttribute('opacity', bi === best ? 1 : .25);
            b.setAttribute('r', bi === best ? 9.5 : 7);
          });
          readout.textContent = 'ближе всего к группе «' + CATS[best].name + '» · расстояние ' + bd.toFixed(0) + '%';
        });
        const drop = e => {
          if (!drag || drag.el !== el) return;
          el.classList.remove('dragging');
          drag = null;
          glow.querySelectorAll('.blob').forEach(b => { b.setAttribute('opacity', .8); b.setAttribute('r', 8); });
          const x = parseFloat(el.style.left), y = parseFloat(el.style.top);
          let best = -1, bd = 1e9;
          CATS.forEach((c, ci) => { const d = Math.hypot(x - c.x, y - c.y); if (d < bd) { bd = d; best = ci; } });
          const want = WORDS[i].c;
          if (bd < 11 && best === want) {
            el.classList.add('ok');
            el.style.left = CATS[best].x + '%'; el.style.top = CATS[best].y + '%';
            placed++;
            NF.sfx.good();
            readout.textContent = '«' + WORDS[i].w + '» → ' + CATS[best].name;
            update();
          } else {
            el.classList.add('bad');
            setTimeout(() => el.classList.remove('bad'), 420);
            NF.sfx.bad();
            readout.textContent = bd < 11
              ? 'группа не та: «' + WORDS[i].w + '» — это ' + CATS[want].name
              : 'замети круг, а не пустоту';
            api.status(readout.textContent, 'bad');
          }
        };
        el.addEventListener('pointerup', drop);
        el.addEventListener('pointercancel', drop);
      });

      function update() {
        api.status('Разложено слов: ' + placed + ' из 9', placed ? 'warn' : '');
        if (placed === 9 && !won) { won = true; vectorLab(); }
      }

      /* --- победный блок: вектор слова --- */
      function vectorLab() {
        api.status('Все слова на своих местах!', 'ok');
        NF.sfx.win();
        const ySlider = h('input', { type: 'range', min: '-100', max: '100', value: '0' });
        const bars = h('div', { class: 'bars' });
        const vecOut = h('div', { class: 'mono', style: { color: '#35d6a4', fontSize: '12px' } }, '');
        function recalc() {
          const t = +ySlider.value / 100;
          const v = [0.82, 0.55 + t * 0.5, 0.71, 0.63 + t * 0.4, 0.88, 0.47, 0.66, 0.52 + t * 0.35];
          vecOut.textContent = '[' + v.map(x => fmt(x, 2)).join(', ') + ' …]';
          const sims = [
            clamp(0.5 + v[1] * .4 + v[3] * .2 - t * .55, .02, .99),
            clamp(0.18 + v[1] * .5 + v[6] * .2 - t * .2, .02, .99),
            clamp(0.12 + v[5] * .45 + v[2] * .15 + t * .25, .02, .99)
          ];
          bars.innerHTML = '';
          CATS.forEach((c, i) => bars.append(h('div', { class: 'bar-row' },
            h('span', {}, c.name),
            h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: (sims[i] * 100) + '%', background: c.color } })),
            h('span', { class: 'bar-val' }, Math.round(sims[i] * 100) + '%'))));
        }
        ySlider.addEventListener('input', () => { NF.sfx.tick(); recalc(); });
        recalc();
        body.append(h('div', { style: { marginTop: '18px', padding: '16px', borderRadius: '16px', border: '1px solid rgba(53,214,164,.3)', background: 'rgba(53,214,164,.07)' } },
          h('div', { style: { fontWeight: '800', marginBottom: '4px' } }, 'Вектор слова «кошка»'),
          h('div', { style: { fontSize: '12.5px', color: '#aab4cc', marginBottom: '10px' } },
            'У настоящей модели здесь тысячи чисел. Покрути второй — и посмотри, как «смысл» смещается вбок.'),
          vecOut,
          h('div', { class: 'sliders' }, h('div', { class: 'slider-row' },
            h('span', {}, 'Второе число'),
            ySlider,
            h('span', { class: 'slider-val mono' }, 'сдвиг'))),
          h('div', { style: { fontSize: '12px', color: '#6f7a94', margin: '10px 0 4px' } }, 'Что «думает» модель:'),
          bars));
        NF.ui.win(api, {
          text: 'Смысл — это не программа «если слово = кот, то…», а координаты. Дальше мы посмотрим, кто эти координаты расставляет.'
        });
      }

      const shuffleBtn = h('button', { class: 'btn ghost sm' }, 'Разложить заново');
      shuffleBtn.addEventListener('click', () => NF.go(NF.cur));

      body.append(
        map, legend,
        h('div', { style: { marginTop: '10px' } }, readout),
        h('div', { class: 'btn-row', style: { marginTop: '12px' } },
          shuffleBtn,
          h('span', { style: { fontSize: '12.5px', color: '#6f7a94' } }, 'Внутри круга — засчитано')),
        h('p', { style: { fontSize: '12.5px', color: '#6f7a94', marginTop: '10px' } },
          'Подсказка: круг подсвечивается сам, когда ты близко к правильной группе.'));
      api.hints(['тяни слова', 'круг = группа', 'проверка мгновенная']);
    }
  });

  /* ============================================================
     3. НЕЙРОН И ВЕСА
     ============================================================ */
  NF.register({
    title: 'Вес нейрона',
    tag: 'Шаг 3 · ручки',
    lead: 'Нейрон — это умножение, сложение и порог. Все его «знания» умещаются в несколько чисел: веса и смещение.',
    goal: 'Настрой три ручки так, чтобы нейрон решает логику «ИЛИ», и посмотри, как это делает алгоритм.',
    hint: 'Крути ползунки — числа меняются вживую',
    wide: true,
    explain: `
      <p>Нейрон берёт входные числа, умножает каждое на свой <b>вес</b>, складывает, прибавляет <b>смещение</b> и пропускает через порог:</p>
      <span class="formula">y = 1 если (w₁·x₁ + w₂·x₂ + b) &gt; 0 иначе 0</span>
      <p>Никакой магии тут нет: это <b>гадалка с ручками</b>. Задача обучения — найти такие значения ручек, чтобы ответ совпадал с правдой. У настоящей модели ручек не три, а миллиарды, но принцип ровно тот же.</p>
      <ul class="takeaways">
        <li>Положительный вес — «тянет к единице», отрицательный — «тянет к нулю».</li>
        <li>Смещение отвечает за «сдвиг»: нужно ли срабатывать, когда все входы равны нулю.</li>
        <li>Задача «ИЛИ» решается тысячами разных наборов весов — идеального ответа не существует.</li>
      </ul>`,
    mount(body, api) {
      const W = { w1: 0.2, w2: 0.2, b: -0.5 };
      const TESTS = [[1, 1, 1], [1, 0, 1], [0, 1, 1], [0, 0, 0]];
      let won = false;

      const svgNS = 'http://www.w3.org/2000/svg';
      const scene = S('svg', { viewBox: '0 0 460 200', style: 'width:100%;height:auto;max-height:230px' });
      const lines = S('g');
      const inLabels = S('g');
      const nLabel = S('g');
      scene.append(lines, inLabels, nLabel);

      const inNodes = [0, 1].map(i => {
        const g = S('g');
        const c = S('circle', { cx: 80, cy: 55 + i * 90, r: 21, fill: '#1d2537', stroke: '#61a8f5', 'stroke-width': 2 });
        const t = S('text', { x: 80, y: 60 + i * 90, 'text-anchor': 'middle', fill: '#e9eefa', 'font-size': 15, 'font-family': 'JetBrains Mono, monospace', text: '0' });
        g.append(c, t); inLabels.append(g);
        return { c, t, y: 55 + i * 90, val: 0 };
      });
      const nNode = S('g');
      const nc = S('circle', { cx: 330, cy: 100, r: 30, fill: '#1d2537', stroke: '#35d6a4', 'stroke-width': 2.5 });
      const nSum = S('text', { x: 330, y: 96, 'text-anchor': 'middle', fill: '#e9eefa', 'font-size': 19, 'font-family': 'JetBrains Mono, monospace', text: '0' });
      const nRes = S('text', { x: 330, y: 116, 'text-anchor': 'middle', fill: '#6f7a94', 'font-size': 11, 'font-family': 'Manrope, sans-serif', text: 'сумма' });
      nNode.append(nc, nSum, nRes); nLabel.append(nNode);
      const outTxt = S('text', { x: 415, y: 105, 'text-anchor': 'middle', fill: '#aab4cc', 'font-size': 12, 'font-family': 'Manrope, sans-serif', text: 'ответ: 0' });
      scene.append(outTxt);
      const biasDot = S('circle', { cx: 330, cy: 132, r: 5.5, fill: '#f5b13d', title: 'смещение b' });
      scene.append(biasDot);
      const wLabels = [S('text', {}), S('text', {})];
      wLabels.forEach(w => { w.setAttribute('font-size', '12'); w.setAttribute('font-family', 'JetBrains Mono, monospace'); w.setAttribute('text-anchor', 'middle'); w.setAttribute('fill', '#aab4cc'); lines.append(w); });

      const sliders = {};
      function mkSlider(key, label, min, max, step) {
        const out = h('span', { class: 'slider-val mono' }, fmt(W[key], 2));
        const s = h('input', { type: 'range', min, max, value: W[key], step: step || 0.01 });
        s.addEventListener('input', () => {
          W[key] = +s.value; out.textContent = fmt(W[key], 2);
          NF.sfx.tick(); draw(); renderTests();
        });
        sliders[key] = s;
        return h('div', { class: 'slider-row' }, h('span', {}, label), s, out);
      }

      const sumOut = h('span', { class: 'mono', style: { color: '#35d6a4' } }, '0.00');
      function draw() {
        lines.querySelectorAll('line').forEach(l => l.remove());
        [W.w1, W.w2].forEach((ww, j) => {
          lines.append(S('line', {
            x1: 80, y1: inNodes[j].y, x2: 330, y2: 100,
            stroke: ww >= 0 ? '#35d6a4' : '#f4617e',
            'stroke-width': 1.2 + Math.abs(ww) * 4.5,
            opacity: .35 + Math.min(Math.abs(ww), 2) * .3
          }));
        });
        wLabels[0].setAttribute('x', 205); wLabels[0].setAttribute('y', 70); wLabels[0].textContent = 'w₁=' + fmt(W.w1, 2);
        wLabels[1].setAttribute('x', 205); wLabels[1].setAttribute('y', 134); wLabels[1].textContent = 'w₂=' + fmt(W.w2, 2);
        const z = W.w1 * inNodes[0].val + W.w2 * inNodes[1].val + W.b;
        nSum.textContent = fmt(z, 2);
        nc.setAttribute('stroke', z > 0 ? '#35d6a4' : '#61a8f5');
        outTxt.textContent = 'ответ: ' + (z > 0 ? '1' : '0');
        outTxt.setAttribute('fill', z > 0 ? '#35d6a4' : '#61a8f5');
        sumOut.textContent = fmt(z, 2);
        biasDot.setAttribute('fill', W.b >= 0 ? '#f5b13d' : '#f4617e');
        biasDot.setAttribute('r', 3 + Math.min(Math.abs(W.b), 2) * 3.5);
      }

      const testGrid = h('div', { class: 'test-grid' });
      const testEls = TESTS.map((t, i) => {
        const el = h('div', { class: 'test' });
        testGrid.append(el);
        return el;
      });
      function renderTests() {
        let okCount = 0;
        TESTS.forEach((t, i) => {
          const z = W.w1 * t[0] + W.w2 * t[1] + W.b;
          const y = z > 0 ? 1 : 0;
          const ok = y === t[2];
          if (ok) okCount++;
          const el = testEls[i];
          el.className = 'test ' + (ok ? 'ok' : 'bad');
          el.innerHTML = '';
          el.append(h('span', {}, 'x₁=' + t[0] + ' x₂=' + t[1]),
            h('small', {}, 'нужно ' + t[2] + ' · модель ' + y));
        });
        counter.textContent = okCount + ' / 4';
        counter.className = 'pill ' + (okCount === 4 ? 'ok' : (okCount ? 'amber' : ''));
        if (okCount === 4 && !won) {
          won = true;
          api.status('Нейрон выучил логику «ИЛИ»!', 'ok');
          NF.ui.win(api, {
            text: 'Ты подобрал веса вручную. Дальше — то же самое, но миллионы раз в секунду и без человека.'
          });
        } else if (okCount) api.status('Правильно: ' + okCount + ' из 4 проверок', 'warn');
        else api.status('Ни одна проверка не проходит', '');
        return okCount;
      }
      const counter = h('span', { class: 'pill' }, '0 / 4');

      inNodes.forEach((n, i) => {
        n.c.style.cursor = 'pointer';
        const flip = () => {
          n.val = n.val ? 0 : 1;
          n.t.textContent = n.val;
          n.c.setAttribute('fill', n.val ? 'rgba(97,168,245,.25)' : '#1d2537');
          NF.sfx.tap(); draw(); renderTests();
        };
        n.c.addEventListener('click', flip);
        n.t.style.cursor = 'pointer'; n.t.addEventListener('click', flip);
      });

      /* --- авто-обучение для сравнения --- */
      const lossOut = h('span', { class: 'mono', style: { color: '#f5b13d' } }, '—');
      const chart = NF.ui.chart(360, 110);
      function autoTrain() {
        const w = { w1: 0.1, w2: 0.1, b: -0.5 };
        const lr = 0.35;
        const hist = [];
        let i = 0;
        const run = () => {
          const step = () => {
            for (let k = 0; k < 6; k++) {
              let gw = 0, gb = 0, l = 0;
              TESTS.forEach(t => {
                const z = w.w1 * t[0] + w.w2 * t[1] + w.b;
                const y = z > 0 ? 1 : 0;
                const e = y - t[2];
                l += e * e / 2;
                gw += e * t[0]; gb += e;
              });
              w.w1 -= lr * gw / 4; w.w2 -= lr * gw / 4; w.b -= lr * gb / 4;
              hist.push(l / 4);
            }
            if (++i < 220) { drawChart(hist); raf = requestAnimationFrame(step); }
            else {
              W.w1 = clamp(w.w1, -2, 2); W.w2 = clamp(w.w2, -2, 2); W.b = clamp(w.b, -2, 2);
              sliders.w1.value = W.w1; sliders.w2.value = W.w2; sliders.b.value = W.b;
              ['w1', 'w2', 'b'].forEach(k => {
                const row = sliders[k].closest('.slider-row');
                row.querySelector('.slider-val').textContent = fmt(W[k], 2);
              });
              draw(); renderTests();
              lossOut.textContent = 'ошибка ' + fmt(hist[hist.length - 1], 4);
              api.status('Машина подобрала веса сама', 'ok');
              NF.sfx.good();
            }
          };
          let raf = requestAnimationFrame(step);
          api.onClean(() => cancelAnimationFrame(raf));
        };
        api.tools.innerHTML = '';
        api.tools.append(btn);
        api.status('Обучение… смотри на ошибку', 'warn');
        run();

        function drawChart(hist) {
          chart.innerHTML = '';
          const W0 = 360, H = 110, pad = 26;
          const max = Math.max(0.25, hist[0]);
          chart.append(S('line', { x1: pad, y1: 8, x2: pad, y2: H - 20, class: 'axis' }));
          chart.append(S('line', { x1: pad, y1: H - 20, x2: W0 - 8, y2: H - 20, class: 'axis' }));
          const pts = hist.map((v, i) => {
            const x = pad + (i / (hist.length - 1 || 1)) * (W0 - pad - 10);
            const y = 8 + (1 - v / max) * (H - 30);
            return x.toFixed(1) + ',' + y.toFixed(1);
          }).join(' ');
          chart.append(S('polyline', { points: pts, fill: 'none', stroke: '#f5b13d', 'stroke-width': 2 }));
          chart.append(S('text', { x: pad, y: H - 6, class: 'axlabel', text: 'шаг 0' }));
          chart.append(S('text', { x: W0 - 10, y: H - 6, class: 'axlabel', 'text-anchor': 'end', text: 'шаг ' + hist.length }));
          chart.append(S('text', { x: pad + 4, y: 16, class: 'axlabel', text: 'ошибка ' + fmt(hist[0], 2) }));
        }
        drawChart([0.25]);
      }

      const btn = h('button', { class: 'btn blue sm' },
        S('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, S('path', { d: 'M13 2 4 14h7l-1 8 9-12h-7z' })),
        'Обучить автоматически');
      btn.addEventListener('click', autoTrain);

      body.append(
        h('div', { class: 'cols', style: { gap: '22px' } },
          h('div', {},
            h('div', { class: 'neuron-stage' }, scene),
            h('p', { style: { fontSize: '12.5px', color: '#6f7a94', margin: '10px 0 0' } },
              'Кликни по голубым кругам — это входы x₁ и x₂. Их значения участвуют в сумме.'),
            h('div', { style: { display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' } },
              h('span', { class: 'pill' }, 'сумма = ', sumOut),
              lossOut,
              counter),
            h('div', { class: 'test-grid' }, testGrid)),
          h('div', {},
            h('h3', { style: { margin: '0 0 10px', fontSize: '15px' } }, 'Три ручки'),
            h('div', { class: 'sliders' },
              mkSlider('w1', 'Вес x₁', -2, 2),
              mkSlider('w2', 'Вес x₂', -2, 2),
              mkSlider('b', 'Смещение', -2, 2)),
            h('p', { style: { fontSize: '13px', color: '#aab4cc', marginTop: '14px' } },
              'Нужна логика ', h('b', { style: { color: '#e9eefa' } }, '«ИЛИ»'),
              ': если хоть один вход равен 1 — ответ 1; если оба нуля — ответ 0.'),
            h('div', { class: 'btn-row', style: { marginTop: '14px' } }, btn),
            h('div', { style: { marginTop: '14px' } }, chart),
            h('div', { style: { fontSize: '12px', color: '#6f7a94', marginTop: '4px' } },
              'Жёлтая линия — ошибка модели. Она падает, потому что алгоритм каждый раз сдвигает ручки в сторону, где ошибка уменьшается.'))),
      );
      inNodes[0].val = 1; inNodes[0].t.textContent = '1'; inNodes[0].c.setAttribute('fill', 'rgba(97,168,245,.25)');
      inNodes[1].val = 0;
      draw(); renderTests();
      api.hints(['x₁ и x₂ кликабельны', 'смещение = порог', '4 проверки «ИЛИ»']);
    }
  });

  /* ============================================================
     4. ПРЯМОЙ ПРОХОД
     ============================================================ */
  NF.register({
    title: 'Прямой проход',
    tag: 'Шаг 4 · сигнал',
    lead: 'Данные уходят в сеть слева направо: во входы, потом в скрытый слой, потом в ответ. Смотри, как считает каждый узел.',
    goal: 'Пропусти 5 примеров через сеть и угадай её ответ раньше, чем она посчитает.',
    hint: 'Кликни по узлу — увидишь его сумму',
    wide: true,
    explain: `
      <p>Когда модель отвечает, происходит <b>прямой проход</b>: сигнал идёт слева направо, каждый нейрон смешивает свои входы с весами и выдаёт число дальше. Ничего не обучается — просто арифметика.</p>
      <p>Слой, который решает задачу, обычно спрятан в середине и так и называется <b>скрытым</b>. Входы и выходы мы видим, а скрытые — нет: это десятки тысяч чисел, которые сами придумали себе роли.</p>
      <span class="formula">вход → [скрытый слой] → [ещё слой] → вероятность ответа</span>
      <ul class="takeaways">
        <li>На выходе модель выдаёт не «кот», а <b>вероятности</b> всех вариантов сразу.</li>
        <li>Один прогон — это миллионы умножений, но для современного железа это доли миллисекунды.</li>
        <li>Именно поэтому «сколько токенов в промпте» влияет на скорость и цену ответа.</li>
      </ul>`,
    mount(body, api) {
      const W1 = [[1.6, -1.8, 0.2], [-1.0, 1.8, -0.2], [0.5, 0.6, -1.6]];
      const b1 = [0.2, -0.2, -0.9];
      const W2 = [[4.6, 2.2, -2.4], [-4.6, -2.2, 2.4]];
      const b2 = [-1.0, 1.0];
      const tanh = Math.tanh, sig = z => 1 / (1 + Math.exp(-z));
      const IN = [
        { n: 'природа', d: 1, k: 0 },
        { n: 'дома', d: 0, k: 1 },
        { n: 'шум', d: 0, k: 0 }
      ];

      const ROUNDS = [
        { title: 'Кот на подоконнике', ins: [1, 0, 0] },
        { title: 'Шумный пылесос', ins: [0, 1, 1] },
        { title: 'Кот и пылесос вместе', ins: [1, 1, 0] },
        { title: 'Дикий лес ночью', ins: [1, 0, 1] },
        { title: 'Тихая квартира', ins: [0, 1, 0] }
      ];
      let round = 0, score = 0, revealed = false, done = false;
      const inputs = [1, 0, 0];

      /* --- сеть --- */
      const svg = S('svg', { viewBox: '0 0 640 250', style: 'width:100%;height:auto' });
      const gEdges = S('g'), gNodes = S('g'), gLabels = S('g');
      svg.append(gEdges, gLabels, gNodes);
      const X = [70, 300, 540], R = [26, 30, 34];
      const nodePos = [];
      function buildNet() {
        gEdges.innerHTML = ''; gNodes.innerHTML = ''; gLabels.innerHTML = '';
        nodePos.length = 0;
        for (let l = 0; l < 3; l++) {
          const n = l === 0 ? 3 : (l === 1 ? 3 : 2);
          const col = [];
          for (let i = 0; i < n; i++) {
            const y = 250 / (n + 1) * (i + 1);
            col.push({ x: X[l], y, layer: l, idx: i, g: S('g') });
            const c = S('circle', { cx: X[l], cy: y, r: R[l], fill: '#1d2537', stroke: '#3b4560', 'stroke-width': 2, 'data-node': l + '-' + i, style: 'cursor:pointer' });
            const t = S('text', { x: X[l], y: y + 4, 'text-anchor': 'middle', fill: '#e9eefa', 'font-size': l === 2 ? 13 : 14, 'font-family': 'JetBrains Mono, monospace', text: '0' });
            c.addEventListener('click', () => inspect(l, i));
            c.addEventListener('mouseenter', () => { c.setAttribute('stroke', '#35d6a4'); });
            c.addEventListener('mouseleave', () => { c.setAttribute('stroke', l === 0 ? '#61a8f5' : (l === 1 ? '#9b8cf5' : '#35d6a4')); });
            col[i].g.append(c, t); gNodes.append(col[i].g);
          }
          nodePos.push(col);
        }
        for (let l = 0; l < 2; l++) {
          for (let i = 0; i < nodePos[l].length; i++) {
            for (let j = 0; j < nodePos[l + 1].length; j++) {
              gEdges.append(S('line', { x1: nodePos[l][i].x, y1: nodePos[l][i].y, x2: nodePos[l + 1][j].x, y2: nodePos[l + 1][j].y, stroke: '#2a3143', 'stroke-width': 1.2, 'data-e': l + '-' + i + '-' + j }));
            }
          }
        }
        ['входы', 'скрытый слой', 'выход'].forEach((t, l) => {
          gLabels.append(S('text', { x: X[l], y: 14, 'text-anchor': 'middle', fill: '#6f7a94', 'font-size': 11.5, 'font-family': 'Manrope, sans-serif', text: t }));
        });
      }
      buildNet();

      const outLabels = [S('text', { fill: '#e9eefa', 'font-size': 12, 'font-family': 'Manrope, sans-serif', 'text-anchor': 'middle' })];
      gLabels.append(outLabels[0]);
      const inspectBox = h('div', { class: 'card card-pad', style: { background: 'rgba(255,255,255,.03)', minHeight: '108px' } },
        h('div', { style: { fontSize: '13.5px', color: '#aab4cc' } }, 'Кликни по любому кругу сети — покажу, из чего сложилась его цифра.'));

      function fwd(x) {
        const hid = W1.map((w, i) => tanh(w[0] * x[0] + w[1] * x[1] + w[2] * x[2] + b1[i]));
        const out = W2.map((w, i) => sig(w[0] * hid[0] + w[1] * hid[1] + w[2] * hid[2] + b2[i]));
        return { hid, out };
      }

      function paint(anim) {
        const { hid, out } = fwd(inputs);
        nodePos[0].forEach((n, i) => {
          n.g.querySelector('text').textContent = fmt(inputs[i], 0);
          n.g.querySelector('circle').setAttribute('stroke', '#61a8f5');
          n.g.querySelector('circle').setAttribute('fill', inputs[i] ? 'rgba(97,168,245,.25)' : '#1d2537');
        });
        nodePos[1].forEach((n, i) => {
          n.g.querySelector('text').textContent = fmt(hid[i], 2);
          n.g.querySelector('circle').setAttribute('stroke', '#9b8cf5');
          n.g.querySelector('circle').setAttribute('fill', 'rgba(155,140,245,.2)');
        });
        nodePos[2].forEach((n, i) => {
          n.g.querySelector('text').textContent = fmt(out[i], 2);
          n.g.querySelector('circle').setAttribute('stroke', i ? '#f4617e' : '#35d6a4');
          n.g.querySelector('circle').setAttribute('fill', i ? 'rgba(244,97,126,.2)' : 'rgba(53,214,164,.2)');
        });
        gEdges.querySelectorAll('line').forEach((ln, i) => {
          const [l, a, b] = ln.getAttribute('data-e').split('-').map(Number);
          const w = l === 0 ? W1[b][a] : W2[b][a];
          ln.setAttribute('stroke-width', 1 + Math.abs(w) * 1.5);
          ln.setAttribute('stroke', w >= 0 ? 'rgba(53,214,164,.5)' : 'rgba(244,97,126,.45)');
        });
        outLabels[0].setAttribute('x', X[2]); outLabels[0].setAttribute('y', nodePos[2][1].y - 42);
        outLabels[0].textContent = 'кот ' + Math.round(out[0] * 100) + '% · не кот ' + Math.round(out[1] * 100) + '%';
        return out;
      }
      const curOut = paint();

      function inspect(l, i) {
        const { hid, out } = fwd(inputs);
        const rows = [];
        let title = '';
        if (l === 0) {
          title = 'Вход «' + IN[i].n + '» — это просто число, которое пришло из текста';
          rows.push(['значение', fmt(inputs[i], 2)]);
        } else if (l === 1) {
          title = 'Скрытый нейрон ' + (i + 1) + ': умножает входы на свои веса';
          const names = ['природа', 'дома', 'шум'];
          const w = W1[i];
          let acc = '';
          names.forEach((nm, k) => { acc += fmt(w[k], 1) + '·' + fmt(inputs[k], 0) + '  '; });
          rows.push(['входы × веса', acc.trim()]);
          rows.push(['смещение', fmt(b1[i], 2)]);
          rows.push(['порог tanh', fmt(hid[i], 2)]);
        } else {
          title = 'Выход ' + (i + 1) + ' — это вероятность, а не ответ';
          const names = ['скрытый 1', 'скрытый 2', 'скрытый 3'];
          let acc = '';
          names.forEach((nm, k) => { acc += fmt(W2[i][k], 1) + '·' + fmt(hid[k], 2) + '  '; });
          rows.push(['входы × веса', acc.trim()]);
          rows.push(['смещение', fmt(b2[i], 2)]);
          rows.push(['сигмоида', fmt(out[i], 2) + ' = ' + Math.round(out[i] * 100) + '%']);
        }
        inspectBox.innerHTML = '';
        inspectBox.append(
          h('div', { style: { fontWeight: '700', marginBottom: '8px', color: '#e9eefa' } }, title),
          NF.ui.table(['часть', 'значение'], rows));
        NF.sfx.tap();
      }

      /* --- игра «угадай ответ» --- */
      const sceneTitle = h('div', { style: { fontWeight: '800', fontSize: '16px' } }, ROUNDS[0].title);
      const scorePill = h('span', { class: 'pill' }, '0 угадано');
      const guessBtns = [0, 1].map(k => {
        const b = h('button', { class: 'btn ' + (k ? 'rose' : '') }, k ? 'Не кот' : 'Кот');
        b.addEventListener('click', () => guess(k));
        return b;
      });
      const resultBox = h('div', { style: { minHeight: '34px', fontSize: '13.5px', color: '#aab4cc' } }, 'Сначала угадай, потом нажми «Прогнать».');

      function setInputs(vals) {
        for (let i = 0; i < 3; i++) {
          inputs[i] = vals[i];
          IN[i].d = vals[i];
        }
        paint();
      }
      function loadRound() {
        revealed = false;
        setInputs(ROUNDS[round].ins);
        sceneTitle.textContent = 'Пример ' + (round + 1) + ': ' + ROUNDS[round].title;
        resultBox.textContent = 'Сначала угадай, потом нажми «Прогнать».';
        resultBox.style.color = '#aab4cc';
        guessBtns.forEach(b => { b.disabled = false; b.style.opacity = 1; });
        api.status('Раунд ' + (round + 1) + ' из 5', '');
      }
      let guessVal = null;
      function guess(k) {
        if (revealed) return;
        guessVal = k;
        guessBtns.forEach(b => b.style.opacity = .5);
        guessBtns[k].style.opacity = 1;
        const p = fwd(inputs).out[0] > 0.5 ? 0 : 1;
        guessBtns.forEach((b, i) => b.style.borderColor = i === p ? 'rgba(53,214,164,.7)' : '');
        NF.sfx.tap();
      }
      function runForward() {
        revealed = true;
        const out = paint();
        const ans = out[0] > 0.5 ? 0 : 1;
        const hit = guessVal === ans;
        if (hit) { score++; NF.sfx.good(); } else NF.sfx.bad();
        scorePill.textContent = score + ' угадано';
        scorePill.className = 'pill ' + (score >= 4 ? 'ok' : 'amber');
        resultBox.innerHTML = '';
        resultBox.append(h('div', {},
          h('span', { style: { color: hit ? '#35d6a4' : '#f4617e', fontWeight: '800' } },
            hit ? 'Точно! ' : 'Сеть решила иначе. '),
          'Сеть ответила «' + (ans ? 'не кот' : 'кот') + '» с уверенностью ' + Math.round(out[0] * 100) + '%.',
          h('div', { style: { marginTop: '4px', color: '#6f7a94', fontSize: '12.5px' } },
            'Входы примера: ' + ROUNDS[round].ins.map((v, k) => IN[k].n + '=' + v).join(' · '))));
        api.status('Угадано: ' + score + ' из ' + (round + 1), hit ? 'warn' : 'bad');
        if (round === ROUNDS.length - 1) finish();
        else {
          nextBtn.disabled = false;
          nextBtn.textContent = nextLabel;
        }
      }
      let nextLabel = 'Следующий пример';
      const nextBtn = h('button', { class: 'btn', disabled: true }, nextLabel);
      nextBtn.addEventListener('click', () => {
        if (done) {
          done = false; round = 0; score = 0; scorePill.textContent = '0 угадано';
          scorePill.className = 'pill'; guessVal = null;
        } else round++;
        nextBtn.disabled = true; nextBtn.textContent = nextLabel;
        loadRound();
      });

      function finish() {
        if (done) return;
        done = true;
        if (score >= 4) {
          api.status('Сеть разгадана: ' + score + ' из 5', 'ok');
          NF.ui.win(api, {
            text: 'Обрати внимание: сеть не «понимает» картинку — она считает веса. Тот же механизм, только ручек миллионы.'
          });
        } else {
          api.status('Угадано ' + score + ' из 5 — можно переиграть', 'bad');
          nextLabel = 'Начать заново';
          nextBtn.textContent = nextLabel;
          nextBtn.disabled = false;
          resultBox.innerHTML = '';
          resultBox.append(h('div', { style: { color: '#6f7a94' } },
            'Сеть оказалась непредсказуемее. Нажми «Начать заново» и попробуй иначе: понаблюдай, как входы меняют ответ.'));
        }
      }

      const runBtn = h('button', { class: 'btn blue' },
        S('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, S('path', { d: 'm13 2-9 12h7l-1 8 9-12h-7z' })),
        'Прогнать через сеть');

      const inputToggles = h('div', { class: 'test-grid', style: { gridTemplateColumns: 'repeat(3,1fr)' } });
      IN.forEach((it, i) => {
        const cell = h('div', { class: 'test' });
        const paintCell = () => {
          cell.className = 'test ' + (inputs[i] ? 'ok' : '');
          cell.innerHTML = '';
          cell.append(h('span', {}, it.n + ' = ' + inputs[i]),
            h('small', {}, inputs[i] ? 'признак найден' : 'нет признака'));
        };
        cell.addEventListener('click', () => {
          if (done && round >= ROUNDS.length) { }
          inputs[i] = inputs[i] ? 0 : 1; paintCell(); paint(); NF.sfx.tap();
        });
        paintCell();
        inputToggles.append(cell);
      });

      body.append(
        h('div', { class: 'cols', style: { gap: '22px' } },
          h('div', {},
            h('div', { class: 'card card-pad', style: { padding: '10px' } }, svg),
            h('div', { style: { marginTop: '12px' } }, inspectBox),
            h('p', { style: { fontSize: '12.5px', color: '#6f7a94', marginTop: '10px' } },
              'Толщина линии — вес. Зелёная тянет вверх, красная вниз.')),
          h('div', {},
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' } },
              sceneTitle, scorePill),
            h('p', { style: { fontSize: '13px', color: '#aab4cc', marginTop: '6px' } },
              'Покрути входы признаков вручную в любой момент — сеть пересчитается мгновенно.'),
            h('div', { style: { margin: '12px 0 4px', fontSize: '12px', color: '#6f7a94' } }, 'Признаки на входе:'),
            inputToggles,
            h('div', { class: 'btn-row', style: { marginTop: '14px' } }, guessBtns[0], guessBtns[1], runBtn),
            h('div', { style: { marginTop: '10px' } }, resultBox),
            h('div', { class: 'btn-row end', style: { marginTop: '8px' } }, nextBtn))),
      );
      api.hints(['кликни по узлу', 'крути признаки', 'угадай 4 из 5']);
    }
  });

})(window.NF);
