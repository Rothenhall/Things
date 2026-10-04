'use client';
import { useEffect } from 'react';

const S = 100;
const PAD = 0.36 * S;
const SCRIPTS = ['/three.min.js', '/things.umd.js'];

// Knob along one edge, in edge-local coords (x along the edge 0..1, y outward).
// Each entry is a segment: one point = line, three points = cubic curve.
const KNOB = [
  [[0.4, 0]],
  [[0.4, 0.05], [0.33, 0.05], [0.36, 0.1]],
  [[0.26, 0.2], [0.34, 0.34], [0.5, 0.34]],
  [[0.66, 0.34], [0.74, 0.2], [0.64, 0.1]],
  [[0.67, 0.05], [0.6, 0.05], [0.6, 0]],
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

function Cluster({ id, shape, className, preset }) {
  const { w, h, paths } = shape;
  return (
    <div className={'lp-cluster ' + className} style={{ aspectRatio: `${w} / ${h}` }}>
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <clipPath id={id} clipPathUnits="objectBoundingBox">
          {paths.map((d, i) => <path key={i} d={d} transform={`scale(${1 / w} ${1 / h})`} />)}
        </clipPath>
      </svg>
      <div className="lp-photo" style={{ clipPath: `url(#${id})` }}>
        <div className="lp-avatar" data-preset={preset} />
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
    let onResize;
    const handles = [];
    const load = (src) => new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.body.appendChild(s);
    });
    SCRIPTS.reduce((p, src) => p.then(() => load(src)), Promise.resolve()).then(() => {
      if (dead || !window.Things) return;
      document.querySelectorAll('.lp-avatar').forEach((el) => {
        const av = window.Things.mount(el, el.dataset.preset, { distance: 9.6 });
        av.setState(el.dataset.preset === "plum" ? "waving" : "idle");
        handles.push(av);
      });
      onResize = () => handles.forEach((h) => h.resize && h.resize());
      window.addEventListener('resize', onResize);
      requestAnimationFrame(onResize);
    }).catch(() => {});
    return () => { dead = true; if (onResize) window.removeEventListener('resize', onResize); handles.forEach((h) => h.destroy && h.destroy()); };
  }, []);

  return (
    <main className="lp">
      <nav className="lp-nav">
        <span className="lp-brand"><span className="lp-script-sm">Things</span> <span className="by">by Rothenhall</span></span>
        <a href="https://github.com/Rothenhall/things" rel="noopener">Open source · MIT</a>
      </nav>

      <section className="lp-stage">
        <Cluster id="lp-clip-a" shape={LEFT} className="lp-a" preset="plum" />
        <h2 className="lp-word lp-w1">Make one</h2>
        <h2 className="lp-word lp-w2">Boop it</h2>
        <Cluster id="lp-clip-b" shape={RIGHT} className="lp-b" preset="tango" />
      </section>

      <footer className="lp-foot">
        <p className="lp-script">Things <span className="by">by Rothenhall</span></p>
        <p className="lp-lede">Build a 3D plush character. Fur, face and outfit, piece by piece.</p>
        <a className="lp-cta" href="/studio">Open the studio</a>
      </footer>
    </main>
  );
}
