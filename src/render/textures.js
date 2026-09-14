import * as THREE from 'three';

/**
 * The field's surfaces, painted once onto canvases the way the eggshell's
 * speckle is. Nothing here is loaded over the wire: the whole farm is four
 * procedural tiles, which is why the page is still a page and not a download.
 */

const cache = new Map();

function paint(size, draw) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  /** The soil is looked at almost edge-on for most of its life, which is
   *  exactly where a mipmap gives up — so it is worth the samples. */
  texture.anisotropy = 16;
  return texture;
}

/** Grit, in the colour and the quantity a surface wants. */
function speckle(ctx, size, count, colours, radius = 2.6) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colours[(Math.random() * colours.length) | 0];
    const r = 0.6 + Math.random() * radius;
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Tilled soil. The furrows run up the canvas, which lands them running down
 * the course once the plane is laid flat — the egg rolls along a furrow
 * rather than across the ridges, which is both how a field is ploughed and
 * the only way the ridges do not strobe at twenty metres a second.
 */
function soil(ctx, size) {
  ctx.fillStyle = '#7a5636';
  ctx.fillRect(0, 0, size, size);

  const furrows = 8;
  const step = size / furrows;
  for (let i = 0; i < furrows; i++) {
    const x = i * step;
    const g = ctx.createLinearGradient(x, 0, x + step, 0);
    g.addColorStop(0, 'rgba(60, 40, 24, 0.55)');
    g.addColorStop(0.35, 'rgba(146, 106, 68, 0.28)');
    g.addColorStop(0.62, 'rgba(146, 106, 68, 0.20)');
    g.addColorStop(1, 'rgba(60, 40, 24, 0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, step, size);
  }

  speckle(ctx, size, 2600, ['rgba(52,36,21,0.5)', 'rgba(158,119,78,0.4)', 'rgba(92,66,40,0.45)']);
}

/** Pasture: a green that is not one green. */
function grass(ctx, size) {
  ctx.fillStyle = '#6fa243';
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, 4000, ['rgba(126,175,78,0.55)', 'rgba(74,116,46,0.5)', 'rgba(150,188,96,0.4)'], 2);
  ctx.lineWidth = 1;
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(96,142,58,0.5)' : 'rgba(142,184,90,0.45)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 3, y - 3 - Math.random() * 4);
    ctx.stroke();
  }
}

/** Straw, which is a thousand strands lying every way at once. */
function straw(ctx, size) {
  ctx.fillStyle = '#d9b45c';
  ctx.fillRect(0, 0, size, size);
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = Math.random() * Math.PI;
    const l = 5 + Math.random() * 16;
    ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(150,110,36,0.75)' : 'rgba(250,228,162,0.8)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
}

/** Weathered board, grain along the length of the plank. */
function wood(ctx, size) {
  ctx.fillStyle = '#a9793f';
  ctx.fillRect(0, 0, size, size);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 180; i++) {
    const y = Math.random() * size;
    ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(126,86,42,0.5)' : 'rgba(201,158,104,0.45)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 9, size * 0.7, y + (Math.random() - 0.5) * 9, size, y);
    ctx.stroke();
  }
  speckle(ctx, size, 500, ['rgba(92,62,30,0.35)'], 1.6);

  /** A dark line top and bottom, so the tile's own repeat draws the joint
   *  between one board and the next. */
  ctx.fillStyle = 'rgba(62,41,20,0.75)';
  ctx.fillRect(0, 0, size, 5);
  ctx.fillRect(0, size - 5, size, 5);
}

const PAINTERS = { soil, grass, straw, wood };

/** One texture per surface, for the whole run. */
export function texture(name) {
  if (!cache.has(name)) cache.set(name, paint(512, PAINTERS[name]));
  return cache.get(name);
}

/**
 * The shadow the egg drops onto the soil — a soft smudge rather than the
 * shadow map the studio would have cast, because the sun here only has one
 * thing worth shadowing and a blur is cheaper than a second render pass.
 */
export function blot() {
  if (cache.has('blot')) return cache.get('blot');
  const made = paint(128, (ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(46,31,17,0.72)');
    g.addColorStop(0.45, 'rgba(46,31,17,0.38)');
    g.addColorStop(1, 'rgba(46,31,17,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
  if (made) {
    made.wrapS = THREE.ClampToEdgeWrapping;
    made.wrapT = THREE.ClampToEdgeWrapping;
  }
  cache.set('blot', made);
  return made;
}
