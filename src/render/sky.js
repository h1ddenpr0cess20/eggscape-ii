import * as THREE from 'three';

const WIDTH = 1024;
const HEIGHT = 512;

/** How fast the weather goes past: a full turn of the sky in half an hour,
 *  which is nothing in a frame and everything in a run. */
const DRIFT = 0.0035;

function cloud(ctx, x, y, w, h, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, w);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The sky, painted once and hung on a sphere the camera sits inside.
 *
 * It is a dome rather than `scene.background`, which is not fussiness: three
 * runs an equirectangular background through PMREM, and PMREM is a blur —
 * it dragged the clouds down into the haze and left a bright seam lying
 * across the horizon in every frame. Owning the sphere costs forty triangles
 * and samples the canvas exactly as it was painted.
 *
 * It is also why there is parallax at all. A texture pinned to the frame
 * cannot lean when the camera does, and a sky that never moves is the one
 * thing that gives a backdrop away as a backdrop.
 *
 * The band at the horizon is the same colour as the fog, which is what lets
 * the far end of the field dissolve into it instead of stopping dead.
 */
export function createSky({ random = Math.random } = {}) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const horizon = HEIGHT * 0.52;

  const air = ctx.createLinearGradient(0, 0, 0, horizon);
  air.addColorStop(0, '#2f7fc4');
  air.addColorStop(0.45, '#6fb2e4');
  air.addColorStop(0.8, '#b4d6e8');
  air.addColorStop(0.95, '#cfe0e0');
  air.addColorStop(1, '#cfe0e0');
  ctx.fillStyle = air;
  ctx.fillRect(0, 0, WIDTH, horizon);

  /**
   * Under the horizon the sky is nothing but haze, and it stays that way for
   * a good way down. There is real country down there — the quilt — and it
   * fades into the fog as it goes; where the two meet, the backdrop has to be
   * the fog's own colour for long enough that neither edge can be found, or
   * the far side of the quilt draws itself across the horizon as a seam.
   */
  const land = ctx.createLinearGradient(0, horizon, 0, HEIGHT);
  land.addColorStop(0, '#cfe0e0');
  land.addColorStop(0.45, '#cfe0e0');
  land.addColorStop(1, '#a8c095');
  ctx.fillStyle = land;
  ctx.fillRect(0, horizon, WIDTH, HEIGHT - horizon);

  /** Weather low enough to be in the frame — the camera looks slightly down
   *  and sees barely twenty degrees of sky — but never low enough to touch
   *  the haze, where a cloud stops reading as weather and starts reading as
   *  a seam lying across the horizon. */
  for (let i = 0; i < 90; i++) {
    const t = random();
    const y = horizon * (0.06 + t * 0.72);
    const w = 28 + random() * 120 * (1 - t * 0.55);
    cloud(ctx, random() * WIDTH, y, w, w * (0.22 + random() * 0.16), 0.3 + random() * 0.45);
  }

  /** The sun sits high and to one side. The directional light does the work;
   *  this is only so the sky is not lying about where the light comes from. */
  const sx = WIDTH * 0.33;
  const sy = horizon * 0.22;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 190);
  glow.addColorStop(0, 'rgba(255,248,222,0.95)');
  glow.addColorStop(0.18, 'rgba(255,241,196,0.55)');
  glow.addColorStop(1, 'rgba(255,241,196,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 200, sy - 200, 400, 400);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 24),
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      depthTest: false,
    }),
  );
  dome.name = 'sky';
  /** Drawn before anything else and never written to the depth buffer, so
   *  the field lands on top of it whatever order the rest arrives in. */
  dome.renderOrder = -1000;
  dome.frustumCulled = false;

  return {
    object: dome,

    /**
     * The dome rides with the camera — it has no distance of its own, and a
     * sky the egg can outrun is worse than no sky at all — and turns while it
     * does, which is the weather going past.
     */
    update(dt, camera) {
      dome.position.copy(camera.position);
      dome.rotation.y = (dome.rotation.y + dt * DRIFT) % (Math.PI * 2);
    },
  };
}
