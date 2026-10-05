/*!
 * things-chat.js: a Things plush character that answers visitor questions on any website.
 *
 *   <script src="https://YOUR-THINGS-SITE/things-chat.js"
 *           data-endpoint="https://YOUR-COLLECTOR"   // where chat + analytics go (defaults to the origin this script was loaded from)
 *           data-preset="pebble" async></script>
 *
 * Options (data-* attributes or ThingsChat.init({...})): endpoint, preset, title, greeting, suggestions (starter questions: a | separated list or an array), key,
 * position (right|left), color, track (default true), schema (default false), assets, chat (default true; false = decoration only,
 * no chat panel, tracking still runs), config (a custom character exported from the studio: a JSON string
 * in data-config, or an object passed to init as preset).
 * Plain script, no build step. Loads three.js + things.umd.js from the same place as this file if missing.
 * Part of Things, MIT licensed: https://github.com/Rothenhall/Things
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
    ['endpoint', 'preset', 'title', 'greeting', 'key', 'position', 'color', 'assets', 'suggestions'].forEach(function (k) { if (d[k]) o[k] = d[k]; });
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
    '*{box-sizing:border-box;font-family:"Instrument Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}',
    '.wrap{position:fixed;bottom:16px;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:10px;max-width:calc(100vw - 24px)}',
    '.wrap.left{left:16px;align-items:flex-start}.wrap.right{right:16px}',
    '.panel{width:380px;max-width:calc(100vw - 24px);height:min(560px,calc(100vh - 170px));display:none;flex-direction:column;background:#fbf9f3;color:#1a1712;border:1px solid #ddd5c4;border-radius:20px;box-shadow:0 24px 60px rgba(26,23,18,.22),0 2px 6px rgba(26,23,18,.08);overflow:hidden;transform-origin:bottom right}',
    '.wrap.left .panel{transform-origin:bottom left}',
    '.open .panel{display:flex;animation:in .28s cubic-bezier(.22,1,.36,1)}',
    '@keyframes in{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}',
    '.head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 14px 14px 18px;background:#fff;border-bottom:1px solid #ddd5c4}',
    '.ht{display:flex;flex-direction:column;gap:3px;min-width:0}',
    '.ht .t{font-weight:600;font-size:15px;line-height:1.2;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ht .s{display:flex;align-items:center;gap:6px;font-size:12px;line-height:1.2;color:#5c5648}',
    '.ht .s::before{content:"";width:7px;height:7px;border-radius:50%;background:#4f9d6b;flex:none}',
    '.x{all:unset;cursor:pointer;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;color:#5c5648;flex:none;transition:background .2s}.x:hover{background:#efe9dc;color:#1a1712}.x:focus-visible{outline:2px solid var(--c)}.x svg{width:16px;height:16px}',
    '.log{flex:1;overflow:auto;padding:16px 16px 8px;display:flex;flex-direction:column;gap:10px;font-size:14.5px;line-height:1.5;scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:#cbc0a9 transparent}',
    '.m{max-width:86%;padding:10px 14px;border-radius:18px;white-space:pre-wrap;word-wrap:break-word;animation:pop .22s cubic-bezier(.22,1,.36,1)}',
    '@keyframes pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
    '.m.bot{background:#efe9dc;border-bottom-left-radius:6px;align-self:flex-start}',
    '.m.me{background:var(--c);color:#fff;border-bottom-right-radius:6px;align-self:flex-end}',
    '.m a{color:inherit}',
    '.srcs{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;white-space:normal}',
    '.srcs a{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:4px 9px;border:1px solid #cbc0a9;border-radius:999px;background:#fbf9f3;color:#3a352c;font-size:12px;line-height:1.3;text-decoration:none;transition:border-color .2s,background .2s}.srcs a:hover{border-color:var(--c);background:#fff}.srcs svg{width:11px;height:11px;flex:none;opacity:.7}.srcs span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.sugg{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}',
    '.sugg button{all:unset;cursor:pointer;padding:8px 13px;border:1px solid #cbc0a9;border-radius:999px;background:#fff;color:#1a1712;font-size:13.5px;line-height:1.2;transition:border-color .2s,background .2s,transform .15s}.sugg button:hover{border-color:var(--c);background:#fbf9f3}.sugg button:active{transform:scale(.97)}.sugg button:focus-visible{outline:2px solid var(--c);outline-offset:1px}',
    '.dots span{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:#857d6c;animation:b 1s infinite}.dots span:nth-child(2){animation-delay:.15s}.dots span:nth-child(3){animation-delay:.3s}',
    '@keyframes b{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}',
    'form{display:flex;align-items:center;gap:8px;margin:8px 12px 6px;padding:5px 5px 5px 16px;border:1px solid #cbc0a9;border-radius:999px;background:#fff;transition:border-color .2s,box-shadow .2s}form:focus-within{border-color:var(--c);box-shadow:0 0 0 3px rgba(168,92,48,.14)}',
    'input{all:unset;flex:1;min-width:0;font-size:15px;line-height:1.4;padding:7px 0;color:#1a1712}input::placeholder{color:#857d6c}',
    'button.go{all:unset;cursor:pointer;display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:var(--c);color:#fff;flex:none;transition:transform .15s,opacity .2s}button.go:hover:not(:disabled){transform:scale(1.06)}button.go:active:not(:disabled){transform:scale(.95)}button.go:disabled{opacity:.4;cursor:default}button.go:focus-visible{outline:2px solid var(--c);outline-offset:2px}button.go svg{width:17px;height:17px}',
    '.foot{padding:2px 12px 10px;text-align:center;font-size:11.5px;color:#857d6c}.foot a{color:#5c5648;text-decoration:none;border-bottom:1px solid #cbc0a9}.foot a:hover{color:#1a1712}',
    '.av{width:120px;height:120px;cursor:pointer;border-radius:50%}.av:focus-visible{outline:2px solid var(--c)}',
    '@media(max-width:520px){.wrap{left:8px;right:8px;bottom:8px;max-width:none}.wrap.right,.wrap.left{align-items:flex-end}.panel{width:100%;height:min(76vh,calc(100vh - 130px));border-radius:18px}.av{width:92px;height:92px}}',
    '@media(prefers-reduced-motion:reduce){.dots span{animation:none}.open .panel,.m{animation:none}.log{scroll-behavior:auto}*{transition:none!important}}'
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
      var row = el('div', 'srcs');
      sources.slice(0, 3).forEach(function (src) {
        if (!/^https?:\/\//i.test(src.url)) return;
        var a = el('a'); a.href = src.url; a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';
        a.appendChild(el('span', null, src.title));
        row.appendChild(a);
      });
      if (row.childNodes.length) m.appendChild(row);
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
    var ht = el('div', 'ht'); ht.appendChild(el('span', 't', o.title)); ht.appendChild(el('span', 's', 'Answers from this site'));
    head.appendChild(ht);
    var close = el('button', 'x'); close.type = 'button'; close.setAttribute('aria-label', 'Close chat');
    close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    head.appendChild(close);
    var log = el('div', 'log'); log.setAttribute('aria-live', 'polite');
    var form = el('form');
    var input = el('input'); input.type = 'text'; input.maxLength = 500; input.placeholder = 'Ask a question…'; input.setAttribute('aria-label', 'Your question'); input.autocomplete = 'off';
    var btn = el('button', 'go'); btn.type = 'submit'; btn.setAttribute('aria-label', 'Send');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
    form.appendChild(input); form.appendChild(btn);
    var foot = el('div', 'foot'); foot.appendChild(document.createTextNode('Powered by '));
    var fl = el('a', null, 'Things by Rothenhall'); fl.href = 'https://things.rothenhall.com'; fl.target = '_blank'; fl.rel = 'noopener'; foot.appendChild(fl);
    panel.appendChild(head); panel.appendChild(log); panel.appendChild(form); panel.appendChild(foot);

    var av = el('div', 'av'); av.tabIndex = 0; av.setAttribute('role', 'button'); av.setAttribute('aria-label', 'Open chat with ' + o.title);
    wrap.appendChild(panel); wrap.appendChild(av);
    root.appendChild(wrap);
    document.body.appendChild(host);
    Object.assign(state, { host: host, root: root, wrap: wrap, log: log, input: input });

    say(log, 'bot', o.greeting);
    var picks = Array.isArray(o.suggestions) ? o.suggestions : String(o.suggestions || '').split('|');
    picks = picks.map(function (x) { return String(x).trim(); }).filter(Boolean).slice(0, 4);
    var sugg = null;
    if (picks.length) {
      sugg = el('div', 'sugg');
      picks.forEach(function (q) {
        var b = el('button', null, q); b.type = 'button';
        b.addEventListener('click', function () { if (state.busy) return; if (sugg) { sugg.remove(); sugg = null; } ask(log, input, btn, q); });
        sugg.appendChild(b);
      });
      log.appendChild(sugg);
    }
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
      if (sugg) { sugg.remove(); sugg = null; }
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
