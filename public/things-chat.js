/*!
 * things-chat.js: a Things plush character that answers visitor questions on any website.
 *
 *   <script src="https://YOUR-THINGS-SITE/things-chat.js"
 *           data-endpoint="https://YOUR-COLLECTOR"   // where chat + analytics go (defaults to the origin this script was loaded from)
 *           data-preset="pebble" async></script>
 *
 * Options (data-* attributes or ThingsChat.init({...})): endpoint, preset, title, greeting, key,
 * position (right|left), color, track (default true), schema (default false), assets, chat (default true; false = decoration only,
 * no chat panel, tracking still runs), config (a custom character exported from the studio: a JSON string
 * in data-config, or an object passed to init as preset).
 * Plain script, no build step. Loads three.js + things.umd.js from the same place as this file if missing.
 * Part of Things, MIT licensed: https://github.com/Rothenhall/things
 */
(function () {
  'use strict';
  if (window.ThingsChat) {
    // Loaded again (React remount, SPA navigation): start a fresh widget from this tag's attributes.
    var again = document.currentScript;
    if (again && !again.hasAttribute('data-manual') && window.ThingsChat.initFromScript) window.ThingsChat.initFromScript(again);
    return;
  }

  var thisScript = document.currentScript;
  var scriptBase = thisScript && thisScript.src ? new URL('.', thisScript.src).href.replace(/\/$/, '') : '';
  var scriptOrigin = thisScript && thisScript.src ? new URL(thisScript.src).origin : '';

  var AI_REF = /(chatgpt|openai|perplexity|claude\.ai|gemini\.google|bard\.google|copilot\.microsoft|you\.com|phind|meta\.ai|grok|deepseek|chat\.mistral)/i;
  var state = { o: null, host: null, root: null, avatar: null, open: false, busy: false, talkTimer: 0, gen: 0 };

  function readAttrs(el) {
    var d = (el && el.dataset) || {};
    var o = {};
    ['endpoint', 'preset', 'title', 'greeting', 'key', 'position', 'color', 'assets'].forEach(function (k) { if (d[k]) o[k] = d[k]; });
    if (d.track === 'false') o.track = false;
    if (d.chat === 'false') o.chat = false;
    if (d.config) { try { var cfg = JSON.parse(d.config); if (cfg && typeof cfg === 'object') o.preset = cfg; } catch (e) { /* bad data-config: fall back to data-preset */ } }
    if (d.schema === 'true') o.schema = true;
    return o;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = false; s.onload = resolve;
      s.onerror = function () { reject(new Error('could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function hasWebGL() {
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
  }
  function ensureEngine(assets) {
    var p = Promise.resolve();
    if (!window.THREE) p = p.then(function () { return loadScript(assets + '/three.min.js'); });
    if (!window.Things) p = p.then(function () { return loadScript(assets + '/things.umd.js'); });
    return p;
  }

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}',
    '.wrap{position:fixed;bottom:16px;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:8px;max-width:calc(100vw - 24px)}',
    '.wrap.left{left:16px;align-items:flex-start}.wrap.right{right:16px}',
    '.panel{width:340px;max-width:calc(100vw - 32px);max-height:min(460px,calc(100vh - 200px));display:none;flex-direction:column;background:#fbf9f3;color:#1a1712;border:1px solid #ddd5c4;border-radius:18px;box-shadow:0 12px 40px rgba(26,23,18,.18);overflow:hidden}',
    '.open .panel{display:flex}',
    '.head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #ddd5c4;font-weight:600;font-size:14px}',
    '.x{all:unset;cursor:pointer;padding:2px 8px;border-radius:8px;color:#5c5648;font-size:18px;line-height:1}.x:focus-visible{outline:2px solid var(--c)}',
    '.log{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px;font-size:14px;line-height:1.45}',
    '.m{max-width:88%;padding:8px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}',
    '.m.bot{background:#efe9dc;border-bottom-left-radius:4px;align-self:flex-start}',
    '.m.me{background:var(--c);color:#fff;border-bottom-right-radius:4px;align-self:flex-end}',
    '.m a{color:inherit;text-decoration:underline}.src{display:block;margin-top:6px;font-size:12px;opacity:.75}',
    '.dots span{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:#5c5648;animation:b 1s infinite}.dots span:nth-child(2){animation-delay:.15s}.dots span:nth-child(3){animation-delay:.3s}',
    '@keyframes b{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}',
    'form{display:flex;gap:6px;padding:10px;border-top:1px solid #ddd5c4}',
    'input{flex:1;min-width:0;font-size:14px;padding:9px 12px;border:1px solid #ddd5c4;border-radius:999px;background:#fff;color:#1a1712}input:focus-visible{outline:2px solid var(--c);outline-offset:1px}',
    'button.go{all:unset;cursor:pointer;background:var(--c);color:#fff;padding:0 14px;border-radius:999px;font-size:14px;display:flex;align-items:center}button.go:disabled{opacity:.5;cursor:default}',
    '.av{width:120px;height:120px;cursor:pointer;border-radius:50%}.av:focus-visible{outline:2px solid var(--c)}',
    '@media(prefers-reduced-motion:reduce){.dots span{animation:none}}'
  ].join('');

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function api(path, body) {
    var o = state.o;
    return fetch(o.endpoint + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  function setAvatar(name) { try { if (state.avatar) state.avatar.setState(name); } catch (e) { /* ignore */ } }

  function say(log, who, text, sources) {
    var m = el('div', 'm ' + who);
    m.textContent = text;
    if (sources && sources.length) {
      sources.slice(0, 2).forEach(function (s) {
        if (!/^https?:\/\//i.test(s.url)) return;
        var a = el('a', null, s.title);
        a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
        var line = el('span', 'src'); line.textContent = 'Source: '; line.appendChild(a);
        m.appendChild(line);
      });
    }
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function talkFor(text) {
    clearTimeout(state.talkTimer);
    setAvatar('talking');
    var ms = Math.min(8000, Math.max(1500, text.split(/\s+/).length * 280));
    state.talkTimer = setTimeout(function () { setAvatar('idle'); }, ms);
  }

  function ask(log, input, btn, q) {
    state.engaged = true;
    say(log, 'me', q);
    var dots = el('div', 'm bot dots');
    dots.innerHTML = '<span></span><span></span><span></span>';
    dots.setAttribute('aria-label', 'Thinking');
    log.appendChild(dots); log.scrollTop = log.scrollHeight;
    state.busy = true; btn.disabled = true; setAvatar('thinking');
    api('/api/chat', { question: q, page: location.pathname, key: state.o.key })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        dots.remove();
        var text = x.ok ? x.j.answer : (x.j && x.j.error === 'slow down' ? 'One moment, I need a breather. Try again in a minute.' : 'I cannot answer that right now.');
        say(log, 'bot', text, x.ok && x.j.answered ? x.j.sources : null);
        talkFor(text);
      })
      .catch(function () {
        dots.remove();
        say(log, 'bot', 'I cannot reach my brain right now. Please try again later.');
        setAvatar('sleepy');
      })
      .then(function () { state.busy = false; btn.disabled = false; input.focus(); });
  }

  function build() {
    var o = state.o;
    var host = document.createElement('div');
    host.setAttribute('data-things-chat', '');
    var root = host.attachShadow({ mode: 'open' });
    var style = el('style'); style.textContent = CSS;
    root.appendChild(style);

    var wrap = el('div', 'wrap ' + (o.position === 'left' ? 'left' : 'right'));
    wrap.style.setProperty('--c', o.color);
    if (o.chat === false) {
      // Decoration only: the character sits in the corner and reacts to clicks. No questions are asked or sent.
      var deco = el('div', 'av'); deco.tabIndex = 0; deco.setAttribute('role', 'img'); deco.setAttribute('aria-label', o.title);
      wrap.appendChild(deco); root.appendChild(wrap); document.body.appendChild(host);
      Object.assign(state, { host: host, root: root, wrap: wrap });
      state.toggle = null;
      var gen0 = ++state.gen;
      var wave = function () { setAvatar('excited'); setTimeout(function () { setAvatar('idle'); }, 1400); };
      deco.addEventListener('click', wave);
      if (!hasWebGL()) { deco.style.display = 'none'; return; }
      ensureEngine(o.assets).then(function () {
        if (gen0 !== state.gen) return;
        state.avatar = window.Things.mount(deco, o.preset, { distance: 9 });
        state.avatar.setState('waving'); setTimeout(function () { setAvatar('idle'); }, 2200);
      }).catch(function () { deco.style.display = 'none'; });
      return;
    }
    var panel = el('div', 'panel');
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', o.title);
    var head = el('div', 'head');
    head.appendChild(el('span', null, o.title));
    var close = el('button', 'x', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close chat');
    head.appendChild(close);
    var log = el('div', 'log'); log.setAttribute('aria-live', 'polite');
    var form = el('form');
    var input = el('input'); input.type = 'text'; input.maxLength = 500; input.placeholder = 'Ask a question'; input.setAttribute('aria-label', 'Your question'); input.autocomplete = 'off';
    var btn = el('button', 'go', 'Ask'); btn.type = 'submit';
    form.appendChild(input); form.appendChild(btn);
    panel.appendChild(head); panel.appendChild(log); panel.appendChild(form);

    var av = el('div', 'av'); av.tabIndex = 0; av.setAttribute('role', 'button'); av.setAttribute('aria-label', 'Open chat with ' + o.title);
    wrap.appendChild(panel); wrap.appendChild(av);
    root.appendChild(wrap);
    document.body.appendChild(host);
    Object.assign(state, { host: host, root: root, wrap: wrap, log: log, input: input });

    say(log, 'bot', o.greeting);
    function toggle(force) {
      state.open = force == null ? !state.open : force;
      wrap.classList.toggle('open', state.open);
      if (state.open) { state.engaged = true; setAvatar('waving'); setTimeout(function () { setAvatar('idle'); }, 1800); setTimeout(function () { input.focus(); }, 50); }
    }
    state.toggle = toggle;
    av.addEventListener('click', function () { toggle(); });
    av.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    close.addEventListener('click', function () { toggle(false); av.focus(); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.replace(/\s+/g, ' ').trim();
      if (!q || state.busy) return;
      input.value = '';
      ask(log, input, btn, q);
    });

    var gen = ++state.gen;
    var fallback = function () {
      av.textContent = 'Ask'; av.style.cssText = 'display:flex;align-items:center;justify-content:center;width:64px;height:64px;background:' + o.color + ';color:#fff;font:600 15px system-ui';
    };
    if (!hasWebGL()) { fallback(); return; }
    ensureEngine(o.assets).then(function () {
      if (gen !== state.gen) return;
      state.avatar = window.Things.mount(av, o.preset, { distance: 9 });
    }).catch(fallback);
  }

  // ---- analytics: only visits that arrive from an AI answer are recorded ----
  function trackVisit(o) {
    var utm = new URLSearchParams(location.search).get('utm_source') || '';
    var ref = document.referrer || '';
    var host = ''; try { host = ref ? new URL(ref).hostname : ''; } catch (e) { /* ignore */ }
    if (!AI_REF.test(host) && !AI_REF.test(utm)) return;
    var vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    var t0 = Date.now();
    function send(type) {
      var body = JSON.stringify({ kind: 'visit', vid: vid, type: type, path: location.pathname, referrer: ref, utm: utm, ms: Date.now() - t0, engaged: !!state.engaged });
      try { if (navigator.sendBeacon && navigator.sendBeacon(o.endpoint + '/api/track', new Blob([body], { type: 'text/plain' }))) return; } catch (e) { /* fall through */ }
      try { fetch(o.endpoint + '/api/track', { method: 'POST', body: body, keepalive: true, headers: { 'content-type': 'text/plain' } }); } catch (e) { /* ignore */ }
    }
    ['pointerdown', 'keydown', 'scroll'].forEach(function (ev) { window.addEventListener(ev, function () { state.engaged = true; }, { passive: true, once: true }); });
    send('start');
    var sent = false;
    function end() { if (sent && document.visibilityState !== 'hidden') return; sent = true; send('end'); }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') end(); });
    window.addEventListener('pagehide', end);
  }

  // ---- optional: inject JSON-LD built from the collector's content ----
  function injectSchema(o) {
    fetch(o.endpoint + '/api/schema?path=' + encodeURIComponent(location.pathname))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var s = document.createElement('script');
        s.type = 'application/ld+json'; s.setAttribute('data-things-schema', '');
        s.textContent = JSON.stringify(j).replace(/</g, '\\u003c');
        document.head.appendChild(s);
      }).catch(function () { /* optional */ });
  }

  var ThingsChat = {
    init: function (opts) {
      if (state.host) return ThingsChat;
      var o = Object.assign({
        endpoint: scriptOrigin, preset: 'pebble', title: 'Ask me', greeting: 'Hi! Ask me anything about this site.',
        key: '', position: 'right', color: '#a85c30', track: true, schema: false, chat: true, assets: scriptBase
      }, readAttrs(opts && opts.__el ? opts.__el : thisScript), opts || {});
      delete o.__el;
      o.endpoint = String(o.endpoint || '').replace(/\/+$/, '');
      o.assets = String(o.assets || o.endpoint).replace(/\/+$/, '');
      if (opts && opts.endpoint === '') o.endpoint = '';
      state.o = o;
      var go = function () { build(); if (o.track) trackVisit(o); if (o.schema) injectSchema(o); };
      if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
      return ThingsChat;
    },
    initFromScript: function (el) { return ThingsChat.init({ __el: el }); },
    open: function () { if (state.toggle) state.toggle(true); },
    close: function () { if (state.toggle) state.toggle(false); },
    destroy: function () {
      state.gen++; clearTimeout(state.talkTimer);
      try { if (state.avatar) state.avatar.destroy(); } catch (e) { /* ignore */ }
      if (state.host) state.host.remove();
      state.host = null; state.avatar = null;
    }
  };
  window.ThingsChat = ThingsChat;

  // Auto-start when included with a plain <script src> tag (not when loaded programmatically).
  if (thisScript && !thisScript.hasAttribute('data-manual')) ThingsChat.init();
})();
