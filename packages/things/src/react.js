'use client';
// React components for @rothenhall/things. No JSX, so it ships as plain JavaScript.
//
//   import { ThingsAvatar, ThingsMascot } from '@rothenhall/things/react';
//
//   <ThingsAvatar config="mallow" state="waving" style={{ width: 360, height: 360 }} />   // a character in a box
//   <ThingsMascot endpoint="https://things.example.com" preset="plum" />                  // the corner chat widget
import { createElement as h, useEffect, useRef } from 'react';
import Things from '../dist/things.umd.js';

/**
 * Renders one character into a div. The 3D engine is bundled with this package (three.js r128).
 * config: a preset id such as 'mallow', or a config object exported from the studio.
 */
export function ThingsAvatar({ config = 'mallow', state = 'idle', quality = 'high', interactive = true, autoLook = true, distance, onReady, onPoke, style, className }) {
  const box = useRef(null);
  const handle = useRef(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    let av = null;
    try {
      av = Things.mount(el, config, { state, quality, interactive, autoLook, distance });
    } catch (e) {
      // No WebGL (or the context could not be created): leave the box empty.
      return undefined;
    }
    handle.current = av;
    if (onPoke) av.on('poke', onPoke);
    if (onReady) onReady(av);
    return () => { handle.current = null; av.destroy(); };
    // The avatar is rebuilt only when these change; config/state updates below are applied live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, interactive, autoLook, distance]);

  useEffect(() => { if (handle.current) handle.current.setConfig(config); }, [JSON.stringify(config)]);
  useEffect(() => { if (handle.current) handle.current.setState(state); }, [state]);

  return h('div', { ref: box, className, style, role: 'img', 'aria-label': 'Plush character' });
}

/**
 * The corner widget (chat, or decoration-only with chat={false}). It loads things-chat.js, which `npx @rothenhall/things init`
 * copies to /things/things-chat.js. Mount it once, near the root of your app.
 */
export function ThingsMascot({ src = '/things/things-chat.js', endpoint, preset = 'mallow', config, chat = true, title, greeting, position, color, apiKey, track = true, schema = false, assets }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const s = document.createElement('script');
    s.src = src; s.async = true;
    const set = (k, v) => { if (v !== undefined && v !== null && v !== '') s.setAttribute('data-' + k, String(v)); };
    set('endpoint', endpoint);
    if (config && typeof config === 'object') s.setAttribute('data-config', JSON.stringify(config)); else set('preset', preset);
    if (chat === false) s.setAttribute('data-chat', 'false');
    set('title', title); set('greeting', greeting); set('position', position); set('color', color); set('key', apiKey); set('assets', assets);
    if (track === false) s.setAttribute('data-track', 'false');
    if (schema) s.setAttribute('data-schema', 'true');
    document.body.appendChild(s);
    return () => {
      if (window.ThingsChat) window.ThingsChat.destroy();
      s.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, endpoint, preset, JSON.stringify(config), chat, title, greeting, position, color, apiKey, track, schema, assets]);
  return null;
}

export { Things };
