import * as THREE from 'three';

import { BALE } from '../core/tuning.js';
import { builder, FACE, tile } from './build.js';
import { flat, matte, SURFACE } from './materials.js';
import { dress } from './scenery.js';
import { THEME } from './theme.js';

/** How deep the cut bank under a plot goes, and how far the grass verge
 *  stands proud of the soil. */
const DEPTH = 0.8;
const RIM = 0.26;

/**
 * A plot: tilled soil with a bank of earth under it and a verge round the
 * edge. Built where it is rather than pooled and scaled, because the furrows
 * have to keep their spacing — a field stretched to fit would ripple.
 *
 * One lane wide it stops being a field at all and becomes a plank over the
 * water, which is the only honest thing a strip of ground that narrow can be.
 */
export function createPlot(seg) {
  const group = new THREE.Group();
  group.name = `plot-${seg.id}`;

  const w = seg.xMax - seg.xMin;
  const l = seg.z1 - seg.z0;
  const boardwalk = seg.span === 1;

  const top = new THREE.PlaneGeometry(w, l);
  tile(top, boardwalk ? 1 : w / 2, boardwalk ? l / 1.4 : l / 2);
  const deck = new THREE.Mesh(top, boardwalk ? SURFACE.wood() : SURFACE.soil());
  deck.rotation.x = -Math.PI / 2;
  group.add(deck);

  /** The bank the plot is cut out of. No top face: the deck is the top. */
  const bank = builder();
  bank.box(0, -DEPTH / 2, 0, w, DEPTH, l, 63 & ~FACE.py);
  group.add(new THREE.Mesh(bank.geometry(), boardwalk ? SURFACE.post() : SURFACE.earth()));

  if (!boardwalk) {
    /** A verge of grass round the rim, standing a little over the soil. */
    const verge = builder();
    const h = 0.2;
    const y = 0.02 - h / 2;
    verge.box(-w / 2 - RIM / 2, y, 0, RIM, h, l + RIM * 2);
    verge.box(w / 2 + RIM / 2, y, 0, RIM, h, l + RIM * 2);
    verge.box(0, y, -l / 2 - RIM / 2, w, h, RIM);
    verge.box(0, y, l / 2 + RIM / 2, w, h, RIM);
    group.add(new THREE.Mesh(verge.geometry(), matte(THEME.meadow)));
  }

  for (const prop of dress(seg, w, l)) group.add(prop);

  group.position.set((seg.xMin + seg.xMax) / 2, seg.y, (seg.z0 + seg.z1) / 2);
  return group;
}

/** Materials are shared and stay; the geometry belongs to this plot. */
export function disposePlot(group) {
  group.traverse((node) => node.geometry?.dispose());
}

/**
 * A bale, in the two shapes a bale comes in. Both stand as tall and as wide
 * as the collider says one does, because the thing you have to hop is the
 * thing you can see.
 */
export function createBale(kind = 0) {
  const group = new THREE.Group();
  /** Scale lives on an inner group: the round one is stretched across the
   *  lane, and stretching the thing that also turns would shear it. */
  const shape = new THREE.Group();
  group.add(shape);

  const w = BALE.halfWidth * 2;
  const d = BALE.halfDepth * 2;

  if (kind === 0) {
    /**
     * Round, and stood on its end so the coil faces the way the egg is
     * coming from. Laid on its side it is a rounded box from behind — the
     * same silhouette as the square one, banded into pale rolls by its own
     * twine — and a hazard you cannot name at a glance is a hazard you do
     * not read in time.
     */
    const r = BALE.height / 2;
    const barrel = tile(new THREE.CylinderGeometry(r, r, d, 22, 1), 3, 1);
    const roll = new THREE.Mesh(barrel, SURFACE.straw());
    roll.rotation.x = Math.PI / 2;
    roll.position.y = r;
    shape.add(roll);

    /** Net wrap, two hoops of it, thin enough to read as string. */
    const hoop = new THREE.TorusGeometry(r * 1.01, 0.022, 6, 24);
    for (const z of [-d * 0.28, d * 0.28]) {
      const band = new THREE.Mesh(hoop, SURFACE.twine());
      band.position.set(0, r, z);
      shape.add(band);
    }

    /** Two rings of the coil showing on the end the egg is coming at, which
     *  is the difference between a bale and a large biscuit. */
    for (const ring of [0.62, 0.34]) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(r * ring, 0.018, 5, 22), SURFACE.twine());
      coil.position.set(0, r, -d / 2 - 0.012);
      shape.add(coil);
    }

    /** A round bale is wider than it is tall; the collider says how much. */
    shape.scale.x = w / (r * 2);
  } else {
    /** Square, and tied twice. */
    const h = BALE.height * 0.92;
    const body = builder();
    body.box(0, h / 2, 0, w, h, d);
    shape.add(new THREE.Mesh(tile(body.geometry(), 2, 2), SURFACE.straw()));

    const twine = builder();
    for (const x of [-w * 0.24, w * 0.24]) {
      twine.box(x, h / 2, 0, 0.04, h * 1.02, d * 1.02);
    }
    shape.add(new THREE.Mesh(twine.geometry(), SURFACE.twine()));
  }

  return group;
}

/**
 * The country under the field. It is a long way down and lit by nothing —
 * flat colour, no shading — because at that distance a lit surface only ever
 * resolves into the same haze the fog gives it for free.
 *
 * The hedgerows are the gaps: every field is inset inside its own cell, and
 * what shows between them is the dark plane underneath.
 *
 * It reaches further than the fog does on purpose. Stop it short of the far
 * plane and its own edge draws a hard line across the horizon — the quilt
 * has to run out of visibility before it runs out of fields.
 */
export function createCountry({ half = 170, cell = 17, y = -24, random = Math.random } = {}) {
  const group = new THREE.Group();
  group.name = 'country';

  const base = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), flat({ color: THEME.hedge }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = y - 0.1;
  group.add(base);

  const position = [];
  const color = [];
  const index = [];
  const hue = new THREE.Color();
  const inset = 0.5;

  for (let x = -half; x < half; x += cell) {
    for (let z = -half; z < half; z += cell) {
      const base4 = position.length / 3;
      const x0 = x + inset;
      const x1 = x + cell - inset;
      const z0 = z + inset;
      const z1 = z + cell - inset;
      position.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
      hue.setHex(THEME.quilt[(random() * THEME.quilt.length) | 0]);
      /** A little lighter or darker per field, so the quilt is not a chessboard. */
      hue.multiplyScalar(0.86 + random() * 0.28);
      for (let i = 0; i < 4; i++) color.push(hue.r, hue.g, hue.b);
      index.push(base4, base4 + 2, base4 + 1, base4, base4 + 3, base4 + 2);
    }
  }

  const fields = new THREE.BufferGeometry();
  fields.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  fields.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  fields.setIndex(index);
  group.add(new THREE.Mesh(fields, flat({ vertexColors: true })));

  return { object: group, spacing: cell };
}

