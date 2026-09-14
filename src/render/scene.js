import * as THREE from 'three';

import { buildEnvironment, buildLights } from './daylight.js';
import { createSky } from './sky.js';
import { THEME } from './theme.js';

/**
 * Renderer, camera, haze and sky. Everything in the field is a lit surface
 * now rather than a line, so the light in here is the whole look: one sun,
 * one sky, and a fog the same colour as the horizon it hands the far end of
 * the course to.
 */
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(THEME.haze, 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(THEME.haze, 48, 165);

  /** 52°, not the 64° this started on: a wide lens stretches whatever sits
   *  away from the middle of the frame, and what sits there is the egg. */
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 320);
  camera.position.set(0, 3.2, -8.4);

  const studio = buildLights(scene);
  buildEnvironment(scene, renderer);

  const sky = createSky();
  if (sky) {
    /** Big enough to sit outside the far plane's business and small enough
     *  to stay inside it: the dome travels with the camera, so its radius is
     *  only ever a number the projection has to swallow. */
    sky.object.scale.setScalar(260);
    scene.add(sky.object);
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /** A tall window needs a taller lens, or the course shrinks to a thread. */
    camera.fov = camera.aspect < 1 ? 64 : 52;
    camera.updateProjectionMatrix();
  }

  resize();
  addEventListener('resize', resize);

  return {
    renderer,
    scene,
    camera,
    studio,
    resize,
    tick(dt) {
      sky?.update(dt, camera);
    },
    render() { renderer.render(scene, camera); },
  };
}
