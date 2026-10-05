'use client';
import { useEffect } from 'react';

const S = 100;
const PAD = 0.31 * S;
const SCRIPTS = ['/three.min.js', '/things.umd.js', '/things-chat.js'];

// Knob along one edge, in edge-local coords (x along the edge 0..1, y outward).
// Each entry is a segment: one point = line, three points = cubic curve.
const KNOB = [
  [[0.34, 0]],
  [[0.4, 0.0], [0.44, 0.03], [0.41, 0.08]],
  [[0.37, 0.13], [0.38, 0.29], [0.5, 0.29]],
  [[0.62, 0.29], [0.63, 0.13], [0.59, 0.08]],
  [[0.56, 0.03], [0.6, 0], [0.66, 0]],
  [[1, 0]]
];

function hash(a, b, c, d) {
  const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + d * 19.3) * 43758.5453;
  return n - Math.floor(n) > 0.5 ? 1 : -1;
}

function piecePath(cells, [c, r]) {
  const has = (x, y) => cells.some((q) => q[0] === x && q[1] === y);
  // clockwise from the top-left corner: direction d and outward normal n = (d.y, -d.x)
  const edges = [[1, 0, 0, -1], [0, 1, 1, 0], [-1, 0, 0, 1], [0, -1, -1, 0]];
  const corner = [[c, r], [c + 1, r], [c + 1, r + 1], [c, r + 1]];
  let d = '';
  edges.forEach(([dx, dy], i) => {
    const [x0, y0] = corner[i];
    const nx = dy, ny = -dx;
    const bx = c + nx, by = r + ny;
    const first = bx > c || by > r; // canonical owner of a shared edge
    const s = first ? hash(c, r, bx, by) : hash(bx, by, c, r);
    let v;
    if (has(bx, by)) v = first ? s : -s;
    else v = s === 1 ? 1 : 0;
    const P = ([x, y]) => [
      (x0 + dx * x + nx * y * v) * S + PAD,
      (y0 + dy * x + ny * y * v) * S + PAD
    ];
    if (i === 0) d += `M${(x0 * S + PAD).toFixed(1)} ${(y0 * S + PAD).toFixed(1)}`;
    if (v === 0) {
      const [ex, ey] = P([1, 0]);
      d += `L${ex.toFixed(1)} ${ey.toFixed(1)}`;
      return;
    }
    const f = (p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    KNOB.forEach((seg) => {
      const pts = seg.map(P);
      d += (pts.length === 1 ? 'L' : 'C') + pts.map(f).join(' ');
    });
  });
  return d + 'Z';
}

function cluster(cells) {
  const cols = Math.max(...cells.map((q) => q[0])) + 1;
  const rows = Math.max(...cells.map((q) => q[1])) + 1;
  const w = cols * S + PAD * 2, h = rows * S + PAD * 2;
  return { w, h, paths: cells.map((q) => piecePath(cells, q)) };
}

const LEFT = cluster([[1, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [1, 3]]);
const RIGHT = cluster([[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]]);

function Cluster({ id, shape, className, src, pos, zoom }) {
  const { w, h, paths } = shape;
  return (
    <div className={'lp-cluster ' + className} style={{ aspectRatio: `${w} / ${h}` }}>
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <clipPath id={id} clipPathUnits="objectBoundingBox">
          {paths.map((d, i) => <path key={i} d={d} transform={`scale(${1 / w} ${1 / h})`} />)}
        </clipPath>
      </svg>
      <div className="lp-photo" style={{ clipPath: `url(#${id})` }}>
        <div className="lp-img" style={{ backgroundImage: `url(${src})`, backgroundPosition: pos, backgroundSize: `${zoom}% auto` }} role="img" aria-label="A plush character resting in windswept grass at sunset" />
      </div>
      <svg className="lp-seams" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    </div>
  );
}

export default function Landing() {
  useEffect(() => {
    let dead = false;
    const load = (src) => new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      // The page starts the chat itself below, with its own title, greeting and starter questions.
      if (src.indexOf('things-chat') >= 0) s.setAttribute('data-manual', '');
      document.body.appendChild(s);
    });
    SCRIPTS.reduce((p, src) => p.then(() => load(src)), Promise.resolve()).then(() => {
      if (dead) return;
      if (window.ThingsChat) window.ThingsChat.init({ preset: 'pebble', endpoint: '', title: 'Ask Things', greeting: 'Hi! Ask me about Things.', suggestions: ['How do I embed this on my site?', 'Can I use my own AI model?', 'Is it free?'] });
    }).catch(() => {});
    return () => { dead = true; if (window.ThingsChat) window.ThingsChat.destroy(); };
  }, []);

  return (
    <main className="lp">
      <nav className="lp-nav">
        <span className="lp-brand"><span className="lp-script-sm">Things</span> <span className="by">by Rothenhall</span></span>
        <a href="https://github.com/Rothenhall/things" rel="noopener">Open source · MIT</a>
      </nav>

      <section className="lp-stage">
        <Cluster id="lp-clip-a" shape={LEFT} className="lp-a" src="/landing/meadow-1.webp" pos="64% 80%" zoom={200} />
        <h2 className="lp-word lp-w1">Make one</h2>
        <h2 className="lp-word lp-w2">Boop it</h2>
        <Cluster id="lp-clip-b" shape={RIGHT} className="lp-b" src="/landing/meadow-2.webp" pos="56% 74%" zoom={190} />
      </section>

      <footer className="lp-foot">
        <p className="lp-script">Things <span className="by">by Rothenhall</span></p>
        <p className="lp-lede">Build a 3D plush character, then give it a job: a mascot that answers your visitors' questions and makes your site easy for AI to read.</p>
        <a className="lp-cta" href="/studio">Open the studio</a>
      </footer>
    </main>
  );
}
