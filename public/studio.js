(function () {
  'use strict';
  var K = window.FuzzKit, $ = function (id) { return document.getElementById(id); };
  if (!K || !window.THREE) { $('avatar').innerHTML = '<p class="err">The 3D engine could not load. Check your connection and reload.</p>'; return; }

  var KEY = 'fuzzkit-studio-v1';
  var store = {
    get: function () { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  var saved = store.get() || {};
  var quality = saved.quality || 'high', mood = 'idle';
  var av = null;

  function mountAvatar(cfg) {
    if (av) av.destroy();
    av = K.mount($('avatar'), cfg, { quality: quality, state: mood, preserveDrawingBuffer: true });
    av.on('poke', function () { $('avatar').dataset.booped = '1'; });
  }
  mountAvatar(saved.config || 'willow');

  // ---------------- history ----------------
  var hist = [av.getConfig()], hi = 0;
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function commit() {
    var c = av.getConfig();
    if (same(c, hist[hi])) return;
    hist = hist.slice(0, hi + 1); hist.push(c); if (hist.length > 80) hist.shift(); hi = hist.length - 1;
    persist(); toolState();
  }
  function persist() { store.set({ config: av.getConfig(), quality: quality }); }
  function jump(d) { var n = hi + d; if (n < 0 || n >= hist.length) return; hi = n; av.setConfig(hist[hi]); persist(); refresh(); toolState(); }
  function toolState() { $('undo').disabled = hi <= 0; $('redo').disabled = hi >= hist.length - 1; }

  function edit(partial, record) { av.setConfig(partial); refresh(); if (record !== false) commit(); }

  // ---------------- toast ----------------
  var tt = 0;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 1800); }

  // ---------------- controls from schema ----------------
  var controls = [];
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function field(f, label) {
    var wrap = el('div', 'field'), lbl = el('div', 'lbl'), name = el('span', null, label || f.label);
    lbl.appendChild(name); wrap.appendChild(lbl);
    var upd;
    if (f.type === 'select') {
      var box = el('div', 'chips'); box.setAttribute('role', 'group'); box.setAttribute('aria-label', f.label);
      f.options.forEach(function (o) {
        var b = el('button', 'chip', o.label); b.type = 'button'; b.dataset.v = o.id;
        b.onclick = function () { var p = {}; p[f.key] = o.id; edit(p); };
        box.appendChild(b);
      });
      wrap.appendChild(box);
      upd = function (c) { Array.prototype.forEach.call(box.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === c[f.key])); }); };
    } else if (f.type === 'range') {
      var out = el('output'); lbl.appendChild(out);
      var r = el('input'); r.type = 'range'; r.min = f.min; r.max = f.max; r.step = f.step; r.setAttribute('aria-label', f.label);
      var fmt = function (v) { return f.step >= 1 ? String(Math.round(v)) : Number(v).toFixed(2); };
      r.oninput = function () { var p = {}; p[f.key] = parseFloat(r.value); out.textContent = fmt(r.value); av.setConfig(p); refresh(r); };
      r.onchange = commit;
      wrap.appendChild(r);
      upd = function (c, active) { if (active !== r) r.value = c[f.key]; out.textContent = fmt(c[f.key]); };
    } else if (f.type === 'color') {
      var sw = el('div', 'sw'); sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', f.label);
      var buttons = [];
      if (f.nullable) {
        var nb = el('button', 'swatch none'); nb.type = 'button'; nb.title = f.nullLabel || 'None'; nb.setAttribute('aria-label', f.nullLabel || 'None'); nb.dataset.v = '';
        nb.onclick = function () { var p = {}; p[f.key] = null; edit(p); }; sw.appendChild(nb); buttons.push(nb);
      }
      (f.swatches || []).forEach(function (hx) {
        var b = el('button', 'swatch'); b.type = 'button'; b.style.background = hx; b.dataset.v = hx.toLowerCase(); b.title = hx; b.setAttribute('aria-label', hx);
        b.onclick = function () { var p = {}; p[f.key] = hx; edit(p); }; sw.appendChild(b); buttons.push(b);
      });
      var cu = el('label', 'swatch custom'); cu.title = 'Custom color';
      var ci = el('input'); ci.type = 'color'; ci.setAttribute('aria-label', f.label + ' custom color');
      ci.oninput = function () { var p = {}; p[f.key] = ci.value; av.setConfig(p); refresh(ci); };
      ci.onchange = commit;
      cu.appendChild(ci); sw.appendChild(cu); wrap.appendChild(sw);
      upd = function (c, active) {
        var v = c[f.key] ? String(c[f.key]).toLowerCase() : '', hit = false;
        buttons.forEach(function (b) { var on = b.dataset.v === v; if (on) hit = true; b.setAttribute('aria-pressed', String(on)); });
        cu.setAttribute('aria-pressed', String(!hit && !!v)); if (!hit && v) cu.style.boxShadow = ''; 
        if (active !== ci && /^#[0-9a-f]{6}$/.test(v)) ci.value = v;
      };
    } else if (f.type === 'bool') {
      wrap.removeChild(lbl);
      var s = el('button', 'switch'); s.type = 'button'; s.setAttribute('role', 'switch');
      s.appendChild(el('span', null, f.label)); s.appendChild(el('span', 'k'));
      s.onclick = function () { var p = {}; p[f.key] = s.getAttribute('aria-checked') !== 'true'; edit(p); };
      wrap.appendChild(s);
      upd = function (c) { s.setAttribute('aria-checked', String(!!c[f.key])); };
    }
    var ctl = { f: f, el: wrap, upd: upd };
    controls.push(ctl);
    return wrap;
  }

  var GROUPS = [
    { id: 'Body', label: 'Body', sections: [['Build', ['shape', 'ears', 'arms', 'feet', 'tail', 'muzzle']], ['Coloring', ['color', 'accent', 'feetColor', 'tummy', 'tailTip', 'pattern', 'patternColor', 'patternScale']], ['Handmade', ['seed']]] },
    { id: 'Fur', label: 'Fur', sections: [['Fabric', ['fabric']], ['Pile', ['furLength', 'furDensity', 'furThickness', 'furDroop', 'furFlex']], ['Finish', ['sheen', 'furVariation', 'furTip']]] },
    { id: 'Face', label: 'Face', sections: [['Eyes', ['eyes', 'eyeColor', 'eyeSize', 'eyeSpacing', 'eyeHeight']], ['Nose', ['nose', 'noseColor', 'noseSize']], ['Mouth', ['mouth', 'mouthColor', 'mouthSize', 'mouthHeight']], ['Cheeks', ['cheeks', 'cheekColor', 'cheekSize']]] },
    { id: 'Outfit', label: 'Outfit', sections: [['Hat', ['hat', 'hatColor']], ['Neck', ['neck', 'neckColor']], ['Glasses', ['glasses', 'glassesColor']], ['Decoration', ['deco', 'decoColor']]] },
    { id: 'Motion', label: 'Motion' },
    { id: 'Guide', label: 'Guide' },
    { id: 'Export', label: 'Use it' }
  ];
  var byKey = {}; K.schema.forEach(function (f) { byKey[f.key] = f; });
  var panes = {};
  GROUPS.forEach(function (g) {
    var pane = el('div'); pane.id = 'pane-' + g.id; pane.setAttribute('role', 'tabpanel'); pane.hidden = true;
    if (g.sections) g.sections.forEach(function (s) {
      var sec = el('div', 'sec'); sec.appendChild(el('h3', null, s[0]));
      s[1].forEach(function (k, i) { if (byKey[k]) sec.appendChild(field(byKey[k], i === 0 && byKey[k].type === 'select' && g.id !== 'Body' && g.id !== 'Fur' ? 'Style' : null)); });
      pane.appendChild(sec);
    });
    panes[g.id] = pane; $('body').appendChild(pane);
    var tab = el('button', 'tab', g.label); tab.type = 'button'; tab.setAttribute('role', 'tab'); tab.dataset.g = g.id; tab.setAttribute('aria-controls', pane.id);
    tab.onclick = function () { showTab(g.id); };
    $('tabs').appendChild(tab);
  });
  function showTab(id) {
    Array.prototype.forEach.call($('tabs').children, function (t) { t.setAttribute('aria-selected', String(t.dataset.g === id)); t.tabIndex = t.dataset.g === id ? 0 : -1; });
    Object.keys(panes).forEach(function (k) { panes[k].hidden = k !== id; });
    if (id === 'Export') renderCode();
  }
  $('tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var ids = GROUPS.map(function (g) { return g.id; }), cur = ids.indexOf(document.activeElement.dataset.g);
    if (cur < 0) return; var n = ids[(cur + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length];
    showTab(n); $('tabs').querySelector('[data-g="' + n + '"]').focus(); e.preventDefault();
  });

  // ---------------- motion pane ----------------
  var MOODS = { idle: 'Idle', waving: 'Waving', talking: 'Talking', thinking: 'Thinking', excited: 'Excited', sleepy: 'Sleepy' };
  function moodButtons(box, cls) {
    Object.keys(MOODS).forEach(function (m) {
      var b = el('button', cls, MOODS[m]); b.type = 'button'; b.dataset.m = m;
      b.onclick = function () { mood = m; av.setState(m); syncMood(); };
      box.appendChild(b);
    });
  }
  moodButtons($('moods'), 'mood');
  (function () {
    var p = panes.Motion, s1 = el('div', 'sec');
    s1.appendChild(el('h3', null, 'Mood'));
    var mb = el('div', 'chips'); moodButtons(mb, 'chip'); s1.appendChild(mb); p.appendChild(s1);

    var s2 = el('div', 'sec'); s2.appendChild(el('h3', null, 'Test the fur'));
    s2.appendChild(el('p', 'note', 'Floppiness on the Fur tab sets how much the coat, ears and tail swing.'));
    var r = el('div', 'row');
    [['Boop', function () { av.poke(); }], ['Spin', function () { av.shake(); }]].forEach(function (x) { var b = el('button', 'btn', x[0]); b.type = 'button'; b.onclick = x[1]; r.appendChild(b); });
    s2.appendChild(r); p.appendChild(s2);

    var s3 = el('div', 'sec'); s3.appendChild(el('h3', null, 'Mouth'));
    s3.appendChild(el('p', 'note', 'Drive the mouth yourself, the way a voice or lip-sync feed would. Turn it off to let the mood animate it.'));
    var sw = el('button', 'switch'); sw.type = 'button'; sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', 'false');
    sw.appendChild(el('span', null, 'Manual mouth')); sw.appendChild(el('span', 'k'));
    var mf = el('div', 'field'); mf.style.marginTop = '12px';
    var ml = el('div', 'lbl'); ml.appendChild(el('span', null, 'Open')); mf.appendChild(ml);
    var mr = el('input'); mr.type = 'range'; mr.min = 0; mr.max = 1; mr.step = 0.01; mr.value = 0.4; mr.disabled = true; mr.setAttribute('aria-label', 'Mouth open');
    sw.onclick = function () { var on = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', String(on)); mr.disabled = !on; av.setMouth(on ? parseFloat(mr.value) : null); if (on && av.getConfig().mouth === 'none') edit({ mouth: 'smile' }); };
    mr.oninput = function () { av.setMouth(parseFloat(mr.value)); };
    mf.appendChild(mr); s3.appendChild(sw); s3.appendChild(mf); p.appendChild(s3);

    var s4 = el('div', 'sec'); s4.appendChild(el('h3', null, 'Viewer'));
    var lk = el('button', 'switch'); lk.type = 'button'; lk.setAttribute('role', 'switch'); lk.setAttribute('aria-checked', 'true');
    lk.appendChild(el('span', null, 'Follow the pointer')); lk.appendChild(el('span', 'k'));
    lk.onclick = function () { var on = lk.getAttribute('aria-checked') !== 'true'; lk.setAttribute('aria-checked', String(on)); av.setAutoLook(on); };
    s4.appendChild(lk);
    var ql = el('div', 'lbl'); ql.style.marginTop = '16px'; ql.appendChild(el('span', null, 'Render quality')); s4.appendChild(ql);
    var qs = el('div', 'seg'); qs.setAttribute('role', 'group'); qs.setAttribute('aria-label', 'Render quality');
    [['high', 'High'], ['medium', 'Balanced'], ['low', 'Fast']].forEach(function (q) {
      var b = el('button', null, q[1]); b.type = 'button'; b.dataset.q = q[0]; b.setAttribute('aria-pressed', String(q[0] === quality));
      b.onclick = function () { quality = q[0]; Array.prototype.forEach.call(qs.children, function (x) { x.setAttribute('aria-pressed', String(x.dataset.q === quality)); }); mountAvatar(av.getConfig()); persist(); };
      qs.appendChild(b);
    });
    s4.appendChild(qs); s4.appendChild(el('p', 'note', 'Fast uses fewer fur layers and a lower pixel density, for older phones.'));
    p.appendChild(s4);
  })();
  function syncMood() { document.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.m === mood)); }); }

  // ---------------- guide pane ----------------
  (function () {
    var p = panes.Guide;
    var s1 = el('div', 'sec'); s1.appendChild(el('h3', null, 'Make a character'));
    s1.appendChild(el('p', 'note', '1. Pick a preset from Characters. 2. Shape it with the Body, Fur, Face and Outfit tabs. 3. Open the Use it tab to save a photo, the character file, or copy code for your own site.'));
    p.appendChild(s1);

    var s2 = el('div', 'sec'); s2.appendChild(el('h3', null, 'Use it on your site'));
    s2.appendChild(el('p', 'note', 'Load three.js r128 first, then the FuzzKit file, then mount any preset or your saved config:'));
    var pre = el('pre'); pre.tabIndex = 0;
    pre.textContent = '<div id="mascot" style="width:360px;height:360px"></div>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>\n<script src="fuzzkit.umd.js"><\/script>\n<script>\n  const mascot = FuzzKit.mount(document.getElementById("mascot"), "willow");\n  mascot.setState("waving");\n<\/script>';
    s2.appendChild(pre); p.appendChild(s2);

    var s3 = el('div', 'sec'); s3.appendChild(el('h3', null, 'Open source'));
    s3.appendChild(el('p', 'note', 'FuzzKit Studio is MIT-licensed (see LICENSE). Fork it, run npm install and npm run dev, and send a pull request.'));
    p.appendChild(s3);
  })();

  // ---------------- export pane ----------------
  var codeMode = 'react', codeEl = null;
  function diffConfig() {
    var c = av.getConfig(), d = {};
    Object.keys(c).forEach(function (k) { if (JSON.stringify(c[k]) !== JSON.stringify(K.defaults[k])) d[k] = c[k]; });
    return d;
  }
  function renderCode() {
    if (!codeEl) return;
    var cfg = JSON.stringify(diffConfig(), null, 2).replace(/\n/g, '\n');
    codeEl.textContent = codeMode === 'react'
      ? "import { FuzzAvatar } from 'fuzzkit/react';\n\nconst mascot = " + cfg + ";\n\nexport default function Mascot() {\n  return <FuzzAvatar config={mascot} state=\"" + mood + "\" style={{ width: 360, height: 360 }} />;\n}"
      : codeMode === 'next'
        ? "// app/mascot.jsx\n'use client';\nimport { FuzzAvatar } from 'fuzzkit/react';\n\nconst mascot = " + cfg + ";\n\nexport default function Mascot() {\n  return <FuzzAvatar config={mascot} state=\"" + mood + "\" style={{ width: 360, height: 360 }} />;\n}"
        : "<div id=\"mascot\" style=\"width:360px;height:360px\"></div>\n<script src=\"https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js\"><\/script>\n<script src=\"fuzzkit.umd.js\"><\/script>\n<script>\n  const mascot = FuzzKit.mount(document.getElementById('mascot'), " + cfg.replace(/\n/g, '\n  ') + ");\n  mascot.setState('" + mood + "');\n<\/script>";
  }
  (function () {
    var p = panes.Export;
    var s1 = el('div', 'sec'); s1.appendChild(el('h3', null, 'Save'));
    s1.appendChild(el('p', 'note', 'Keep a photo, or save the character file to load it in your own app later.'));
    var r = el('div', 'row');
    var bp = el('button', 'btn primary', 'Save photo'); bp.type = 'button'; bp.onclick = savePhoto;
    var bj = el('button', 'btn', 'Save character file'); bj.type = 'button'; bj.onclick = saveJson;
    var bl = el('label', 'btn'); bl.textContent = 'Open character file'; var fi = el('input'); fi.type = 'file'; fi.accept = '.json,application/json'; fi.hidden = true; bl.appendChild(fi);
    fi.onchange = function () { var f = fi.files[0]; if (!f) return; f.text().then(function (t) { try { edit(K.normalize(JSON.parse(t))); toast('Character loaded'); } catch (e) { toast('That file is not a FuzzKit character'); } }); fi.value = ''; };
    r.appendChild(bp); r.appendChild(bj); r.appendChild(bl); s1.appendChild(r); p.appendChild(s1);

    var s2 = el('div', 'sec'); s2.appendChild(el('h3', null, 'Put it in your app'));
    s2.appendChild(el('p', 'note', 'This code recreates exactly what is on screen. It only lists the settings you changed.'));
    var seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Code format');
    [['react', 'React'], ['next', 'Next.js'], ['html', 'HTML']].forEach(function (m) {
      var b = el('button', null, m[1]); b.type = 'button'; b.dataset.c = m[0]; b.setAttribute('aria-pressed', String(m[0] === codeMode));
      b.onclick = function () { codeMode = m[0]; Array.prototype.forEach.call(seg.children, function (x) { x.setAttribute('aria-pressed', String(x.dataset.c === codeMode)); }); renderCode(); };
      seg.appendChild(b);
    });
    s2.appendChild(seg);
    codeEl = el('pre'); codeEl.tabIndex = 0; s2.appendChild(codeEl);
    var bc = el('button', 'btn', 'Copy code'); bc.type = 'button'; bc.onclick = function () { copy(codeEl.textContent); };
    s2.appendChild(bc); p.appendChild(s2);
  })();
  function copy(text) {
    var done = function () { toast('Copied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() {
      var ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } ta.remove();
      toast(ok ? 'Copied' : 'Select the code and copy it');
    }
  }
  function fileName(ext) { return (av.getConfig().name || 'fuzzbot').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.' + ext; }
  function offer(name, data, onUnavailable) {
    try {
      var blob = data instanceof Blob ? data : new Blob([data], { type: 'application/json' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('Saved');
    } catch (e) { onUnavailable(); }
  }
  function savePhoto() {
    av.snapshotBlob('image/png').then(function (blob) {
      if (!blob) { toast('Could not capture the photo'); return; }
      offer(fileName('png'), blob, function () { $('shot').src = URL.createObjectURL(blob); $('modal').classList.add('on'); $('closeModal').focus(); });
    });
  }
  function saveJson() {
    var text = JSON.stringify(Object.assign({ fuzzkit: K.version }, av.getConfig()), null, 2);
    offer(fileName('json'), text, function () { copy(text); toast('Saving is not available here, so the file was copied instead'); });
  }
  $('photo').onclick = savePhoto;
  $('closeModal').onclick = function () { $('modal').classList.remove('on'); };
  $('modal').onclick = function (e) { if (e.target === $('modal')) $('modal').classList.remove('on'); };

  // ---------------- cast rail ----------------
  K.presets.forEach(function (p) {
    var b = el('button', 'who'); b.type = 'button'; b.dataset.id = p.id;
    var dot = el('i'); dot.style.background = 'radial-gradient(circle at 35% 30%,' + p.accent + ' 0 18%,' + p.color + ' 46%)';
    b.appendChild(dot); b.appendChild(document.createTextNode(p.name));
    b.onclick = function () { edit(p.id); };
    $('cast').appendChild(b);
  });

  // ---------------- toolbar ----------------
  $('undo').onclick = function () { jump(-1); };
  $('redo').onclick = function () { jump(1); };
  $('random').onclick = function () { edit(K.randomize()); };
  $('name').oninput = function () { av.setConfig({ name: $('name').value }); };
  $('name').onchange = commit;
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || /INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'range') return;
    e.preventDefault(); jump(e.shiftKey ? 1 : -1);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('modal').classList.remove('on'); });

  // ---------------- refresh ----------------
  function refresh(active) {
    var c = av.getConfig();
    controls.forEach(function (ctl) {
      ctl.el.hidden = ctl.f.showIf ? !ctl.f.showIf(c) : false;
      ctl.upd(c, active);
    });
    if (document.activeElement !== $('name')) $('name').value = c.name || '';
    var match = K.presets.filter(function (p) { return p.name === c.name; })[0];
    document.querySelectorAll('.who').forEach(function (b) { b.setAttribute('aria-pressed', String(!!match && b.dataset.id === match.id)); });
    if (!panes.Export.hidden) renderCode();
  }
  showTab('Body'); syncMood(); refresh(); toolState();
})();
