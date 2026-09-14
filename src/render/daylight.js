import * as THREE from 'three';

/**
 * An afternoon, as a cube map: warm above, field-green below, one bright
 * patch where the sun is. Every standard material in here samples it, which
 * is what stops the shaded side of a bale going flat black — and it is also
 * what lights Marc's shell, in place of the studio he came out of.
 */
export function buildEnvironment(scene, renderer) {
  try {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, '#5ea6dd');
    g.addColorStop(0.44, '#cfe6f2');
    g.addColorStop(0.52, '#c4cfa4');
    g.addColorStop(1, '#4f6b38');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = 'rgba(255,248,224,0.95)'; ctx.beginPath();
    ctx.ellipse(21, 6, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    const tex = new THREE.Texture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose(); tex.dispose();
  } catch {
  }
}

/**
 * Sun, sky and bounce. Marc's studio had a neutral key and a warm fill; this
 * is the same rig taken outdoors — the key is the sun and it is warm, the
 * hemisphere is blue over green because that is what a field is standing
 * under and standing on, and the fill is the cool light coming back off the
 * sky behind the camera.
 *
 * The rig travels with the egg, which costs nothing — a directional light has
 * a direction and no place — and means the shell is lit the same at 400 metres
 * as it is at the gate.
 */
export function buildLights(scene) {
  const rig = new THREE.Group();
  rig.name = 'daylight';

  const sky = new THREE.HemisphereLight(0xbcdcf4, 0x76913f, 1.15);

  const sun = new THREE.DirectionalLight(0xfff0d0, 2.3);
  sun.position.set(6, 9, 4);

  const bounce = new THREE.DirectionalLight(0xdce9ff, 0.8);
  bounce.position.set(-5, 3, -6);

  rig.add(sky, sun, sun.target, bounce, bounce.target);
  scene.add(rig);
  return rig;
}
