/* ============================================================
   LLMborn — движок
   ============================================================ */
(function (w) {
  'use strict';

  const NF = {
    levels: [],
    cur: 0,
    done: [],
    els: {},
    cleanup: [],
    sound: true,
    solvedFlag: false
  };

  /* ---------- мелкие помощники ---------- */
  const h = function (tag, props) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === 'class') e.className = props[k];
      else if (k === 'html') e.innerHTML = props[k];
      else if (k === 'text') e.textContent = props[k];
      else if (k === 'style' && typeof props[k] === 'object') Object.assign(e.style, props[k]);
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else if (props[k] !== null && props[k] !== undefined && props[k] !== false) e.setAttribute(k, props[k]);
    }
    for (let i = 2; i < arguments.length; i++) {
      const c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) c.forEach(x => x && e.append(x.nodeType ? x : document.createTextNode(x)));
      else e.append(c.nodeType ? c : document.createTextNode(c));
    }
    return e;
  };
  const S = function (tag, attrs) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (const k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    }
    for (let i = 2; i < arguments.length; i++) {
      const c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) c.forEach(x => x && e.append(x));
      else e.append(c);
    }
    return e;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (n, d) => (Math.abs(n) < 1e-9 ? 0 : n).toFixed(d === undefined ? 3 : d);
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  NF.h = h; NF.S = S; NF.clamp = clamp; NF.fmt = fmt; NF.rng = rng;

  /* ---------- звук ---------- */
  let actx = null;
  function tone(freq, dur, type, vol, when) {
    if (!NF.sound) return;
    try {
      actx = actx || new (w.AudioContext || w.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, actx.currentTime + (when || 0));
      g.gain.setValueAtTime(0.0001, actx.currentTime + (when || 0));
      g.gain.exponentialRampToValueAtTime(vol || 0.09, actx.currentTime + (when || 0) + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (when || 0) + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(actx.currentTime + (when || 0));
      o.stop(actx.currentTime + (when || 0) + dur + 0.02);
    } catch (e) { /* звук не критичен */ }
  }
  const sfx = {
    tap: () => tone(520, 0.06, 'triangle', 0.05),
    good: () => { tone(660, 0.1, 'sine', 0.08); tone(880, 0.14, 'sine', 0.07, 0.08); },
    bad: () => tone(190, 0.16, 'sawtooth', 0.05),
    win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.07, i * 0.09)); },
    tick: () => tone(1200, 0.03, 'square', 0.02)
  };
  NF.sfx = sfx;

  /* ---------- тост ---------- */
  let toastTimer = null;
  NF.toast = function (msg, type) {
    const t = NF.els.toast;
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast ' + (type || ''); }, 2600);
  };

  /* ---------- прогресс ---------- */
  const KEY = 'nf.progress.v1';
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ done: NF.done, last: NF.cur, sound: NF.sound }));
    } catch (e) { }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && Array.isArray(d.done)) NF.done = d.done;
      if (d && typeof d.last === 'number') NF._last = d.last;
      if (d && typeof d.sound === 'boolean') NF.sound = d.sound;
    } catch (e) { }
  }

  /* ---------- регистрация уровней ---------- */
  NF.register = function (lv) { NF.levels.push(lv); };

  /* ---------- API, доступный уровню ---------- */
  function makeApi(i) {
    return {
      solved: function () {
        if (NF.done[i]) return;
        NF.done[i] = true;
        sfx.win();
        save();
        paint();
        NF.toast('Уровень пройден — звёзда получена!', 'ok');
      },
      status: function (text, state) {
        const s = NF.els.status;
        s.querySelector('span').textContent = text;
        s.querySelector('i').className = 'dot ' + (state || '');
      },
      hints: function (list) {
        NF.els.hints.innerHTML = '';
        (list || []).forEach(x => NF.els.hints.append(h('span', { class: 'pill' }, x)));
      },
      tools: function () { return NF.els.tools; },
      body: function () { return NF.els.body; },
      onClean: function (fn) { NF.cleanup.push(fn); },
      unlock: function (unlockNext) {
        if (unlockNext === false) return;
        NF.els.next.disabled = false;
      }
    };
  }

  /* ---------- отрисовка ---------- */
  function paint() {
    const lv = NF.levels[NF.cur];
    const dots = NF.els.dots;
    dots.innerHTML = '';
    NF.levels.forEach((L, i) => {
      const d = h('button', {
        class: NF.done[i] ? 'done' : (i === NF.cur ? 'cur' : ''),
        title: 'Уровень ' + (i + 1) + ': ' + L.title,
        'aria-label': 'Уровень ' + (i + 1) + ': ' + L.title,
        onclick: () => { if (i !== NF.cur) { sfx.tap(); NF.go(i); } }
      });
      dots.append(d);
    });
    const stars = NF.done.filter(Boolean).length;
    NF.els.stars.textContent = stars;
    const pct = Math.round(NF.done.filter(Boolean).length / NF.levels.length * 100);
    NF.els.fill.style.width = pct + '%';
    NF.els.idx.textContent = 'Уровень ' + (NF.cur + 1) + ' / ' + NF.levels.length;
    NF.els.name.textContent = lv.title;
    NF.els.prev.disabled = NF.cur === 0;
    const last = NF.cur === NF.levels.length - 1;
    NF.els.next.disabled = last || !NF.done[NF.cur];
    NF.els.nextLabel.textContent = last ? 'Ты прошёл' : (NF.cur === NF.levels.length - 2 ? 'Итоги' : 'Дальше');
  }

  NF.go = function (i) {
    if (i < 0 || i >= NF.levels.length) return;
    NF.cleanup.forEach(fn => { try { fn(); } catch (e) { } });
    NF.cleanup = [];
    NF.cur = i;
    save();
    const lv = NF.levels[i];
    const stage = NF.els.stage;
    stage.innerHTML = '';

    const head = h('div', { class: 'lv-head' },
      h('span', { class: 'chip ' + (lv.tone || '') }, lv.tag || ('Шаг ' + (i + 1))),
      h('div', {},
        h('h1', {}, lv.title),
        h('p', {}, lv.lead),
        h('div', { class: 'goal' }, S('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
          S('path', { d: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2' }),
          S('circle', { cx: 12, cy: 12, r: 4 })), h('span', {}, lv.goal))
      ));

    const explainCard = h('section', { class: 'card card-pad' },
      h('h2', { class: 'card-title' },
        S('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' },
          S('path', { d: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.6 1 2.5h6c0-.9.3-1.8 1-2.5A6 6 0 0 0 12 3z' })),
        'Что здесь происходит'),
      h('div', { class: 'explain', html: lv.explain }));

    const status = h('div', { class: 'status' }, h('i', { class: 'dot' }), h('span', {}, lv.hint || 'Готов?'));
    const tools = h('div', { class: 'btn-row' });
    const body = h('div', { class: 'play-body' });
    const playCard = h('section', { class: 'card play' },
      h('div', { class: 'play-bar' }, status, tools),
      body);

    const wrap = h('div', { class: 'lv' }, head);
    if (lv.wide) wrap.append(explainCard, playCard);
    else wrap.append(h('div', { class: 'cols' }, explainCard, playCard));
    stage.append(wrap);

    NF.els.status = status; NF.els.tools = tools; NF.els.body = body;
    NF.els.hints.innerHTML = '';
    paint();

    if (lv.mount) {
      try { lv.mount(body, makeApi(i)); }
      catch (err) {
        body.append(h('div', { class: 'card card-pad', style: { border: '1px solid rgba(244,97,126,.4)' } },
          h('div', { style: { fontWeight: '700', color: '#f4617e', marginBottom: '6px' } }, 'Уровень не загрузился'),
          h('div', { class: 'mono', style: { fontSize: '12px', color: '#aab4cc', wordBreak: 'break-word' } }, String(err && err.message || err))));
        api_status(i, 'Ошибка на уровне — см. подробности', 'bad');
      }
    }
    if (location.hash !== '#' + (i + 1)) {
      try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) { }
    }
    stage.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  function api_status(i, text, state) { NF.els.status.querySelector('span').textContent = text; NF.els.status.querySelector('i').className = 'dot ' + (state || ''); }

  /* ---------- старт ---------- */
  NF.boot = function () {
    NF.els = {
      stage: document.getElementById('stage'),
      idx: document.getElementById('lvl-idx'),
      name: document.getElementById('lvl-name'),
      fill: document.getElementById('track-fill'),
      dots: document.getElementById('track-dots'),
      stars: document.getElementById('star-count'),
      status: null, tools: null, body: null,
      hints: document.getElementById('hints'),
      next: document.getElementById('btn-next'),
      nextLabel: document.getElementById('next-label'),
      prev: document.getElementById('btn-prev'),
      toast: document.getElementById('toast'),
      sound: document.getElementById('btn-sound')
    };
    load();
    if (!NF.done.length) NF.done = NF.levels.map(() => false);

    NF.els.next.addEventListener('click', () => { sfx.tap(); NF.go(NF.cur + 1); });
    NF.els.prev.addEventListener('click', () => { sfx.tap(); NF.go(NF.cur - 1); });

    const sb = NF.els.sound;
    const paintSound = () => { sb.classList.toggle('muted', !NF.sound); };
    paintSound();
    sb.addEventListener('click', () => {
      NF.sound = !NF.sound; paintSound(); save();
      if (NF.sound) sfx.tap();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      if (!confirm('Сбросить весь прогресс и звёзды?')) return;
      NF.done = NF.levels.map(() => false);
      save(); NF.go(0);
    });

    document.addEventListener('keydown', e => {
      if (NF._keys && NF._keys(e) === true) { e.preventDefault(); return; }
      const t = e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' && !NF.els.next.disabled) NF.go(NF.cur + 1);
      if (e.key === 'ArrowLeft' && NF.cur > 0) NF.go(NF.cur - 1);
    });

    window.addEventListener('hashchange', () => {
      const n = parseInt(String(location.hash).replace('#', ''), 10);
      if (!Number.isNaN(n) && n - 1 !== NF.cur) NF.go(n - 1);
    });

    const startAt = parseInt(String(location.hash).replace('#', ''), 10);
    NF.go(Number.isNaN(startAt) ? Math.min(NF._last || 0, NF.levels.length - 1)
      : clamp(startAt - 1, 0, NF.levels.length - 1));
  };

  /* ---------- общие куски, переиспользуемые уровнями ---------- */
  NF.ui = {
    table: function (head, rows) {
      return h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {}, head.map(x => h('th', {}, x)))),
        h('tbody', {}, rows.map(r => h('tr', {}, r.map((c, i) =>
          h('td', { class: i === 0 ? 'name' : '' }, c))))));
    },
    chart: function (w, hh) {
      return S('svg', { class: 'chart', viewBox: '0 0 ' + w + ' ' + hh, preserveAspectRatio: 'xMidYMid meet' });
    },
    win: function (api, opts) {
      opts = opts || {};
      api.body.append(h('div', {
        style: {
          marginTop: '16px', padding: '14px 16px', borderRadius: '14px',
          border: '1px solid rgba(53,214,164,.35)', background: 'rgba(53,214,164,.08)'
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', marginBottom: '6px' } },
          h('span', { style: { color: '#35d6a4', fontSize: '18px' } }, '★'),
          h('span', {}, opts.title || 'Уровень пройден!')),
        h('div', { style: { color: '#aab4cc', fontSize: '13.5px' } }, opts.text || '')));
      api.solved();
      api.status('Готово — уровень закрыт', 'ok');
    }
  };

  w.NF = NF;

})(window);
