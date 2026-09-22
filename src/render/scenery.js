import * as THREE from 'three';

import { LANES } from '../core/tuning.js';
import { builder } from './build.js';
import { SURFACE } from './materials.js';

/**
 * What stands beside the course rather than on it. None of it is in the
 * snapshot and none of it can be hit — a fence the egg can run through would
 * be a lie, so the fences are outside the lanes where the egg cannot reach
 * them, and the only thing in the lanes is a bale.
 */

const POST_GAP = 3.4;

/**
 * How far below the tilled surface a post has to reach. Everything out here
 * stands just off the edge of the plot, where there is no ground — so it is
 * driven down the face of the bank instead, and comes up through the verge.
 * Root it at zero and the whole fence hangs in the air over the country.
 */
const ROOT = -0.8;

/** Two rails and a row of posts, down one side of a plot. */
function fence(side, w, l) {
  const rail = builder();
  const x = side * (w / 2 + 0.44);
  const from = -l / 2 + 0.8;
  const to = l / 2 - 0.8;
  const head = 1.16;

  for (let z = from; z <= to + 0.01; z += POST_GAP) {
    rail.box(x, (ROOT + head) / 2, z, 0.14, head - ROOT, 0.14);
  }
  for (const y of [0.44, 0.84]) rail.box(x, y, (from + to) / 2, 0.07, 0.11, to - from);

  const mesh = new THREE.Mesh(rail.geometry(), SURFACE.post());
  mesh.name = 'fence';
  return mesh;
}

/**
 * A scarecrow, built once and cloned after that — the clone shares both the
 * geometry and the material, so the tenth one on the field costs a matrix.
 */
let pattern = null;

function scarecrow() {
  if (pattern) return copy(pattern);

  const group = new THREE.Group();
  group.name = 'scarecrow';

  const frame = builder();
  frame.box(0, (ROOT + 2.1) / 2, 0, 0.13, 2.1 - ROOT, 0.13);
  frame.box(0, 1.52, 0, 1.34, 0.11, 0.11);
  group.add(new THREE.Mesh(frame.geometry(), SURFACE.post()));

  const shirt = builder();
  shirt.box(0, 1.24, 0, 0.66, 0.68, 0.32);
  /** Straw out of both cuffs, which is the whole joke of a scarecrow. */
  shirt.box(-0.62, 1.5, 0, 0.16, 0.2, 0.16);
  shirt.box(0.62, 1.5, 0, 0.16, 0.2, 0.16);
  group.add(new THREE.Mesh(shirt.geometry(), SURFACE.barn()));

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), SURFACE.sack());
  head.position.y = 1.83;
  head.scale.set(1, 1.1, 1);
  group.add(head);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.045, 16), SURFACE.straw());
  brim.position.y = 2.0;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.28, 16), SURFACE.straw());
  crown.position.y = 2.15;
  group.add(brim, crown);

  pattern = group;
  return copy(group);
}

/**
 * A clone of the pattern, marked as sharing it. `disposePlot` frees the
 * geometry of the plot it is pulling down, and without the mark it freed the
 * buffers behind every other scarecrow standing in the field with it.
 */
function copy(group) {
  const clone = group.clone();
  clone.userData.shared = true;
  return clone;
}

/**
 * What this plot happens to have on it. `seg.dressing` was rolled off the
 * course's own seeded stream, so a seed dresses its field the same way every
 * time — and the renderer stays a function of the snapshot.
 */
export function dress(seg, w, l) {
  if (seg.span !== LANES || l < 11) return [];

  const props = [];
  const side = seg.dressing % 2 ? 1 : -1;

  props.push(fence(side, w, l));
  if (seg.dressing === 3) props.push(fence(-side, w, l));

  if (seg.dressing !== 3 && l > 15) {
    const marc = scarecrow();
    marc.position.set(-side * (w / 2 + 0.44), 0, seg.dressing === 2 ? l * 0.2 : 0);
    marc.rotation.y = -side * 0.4;
    props.push(marc);
  }

  return props;
}

