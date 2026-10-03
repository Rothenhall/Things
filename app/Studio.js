'use client';
import { useEffect } from 'react';
import markup from './markup';

const SCRIPTS = ['/three.min.js', '/fuzzkit.umd.js', '/studio.js'];

function load(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load ' + src));
    document.body.appendChild(s);
  });
}

export default function Studio() {
  useEffect(() => {
    if (window.__fuzzkitStarted) return;
    window.__fuzzkitStarted = true;
    SCRIPTS.reduce((p, src) => p.then(() => load(src)), Promise.resolve()).catch((e) => {
      const el = document.getElementById('avatar');
      if (el) el.innerHTML = '<p class="err">' + e.message + '</p>';
    });
  }, []);

  return <div className="app-root" dangerouslySetInnerHTML={{ __html: markup }} />;
}
