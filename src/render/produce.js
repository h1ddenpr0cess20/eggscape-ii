import * as THREE from 'three';

import { produce as material } from './materials.js';
import { PRODUCE } from './theme.js';

/**
 * Six things growing in the field, one builder each. They are all about a fist
 * across and all read from behind at twenty metres a second, which is the only
 * brief: a carrot you notice a beat too late is a carrot you do not get.
 *
 * Each is a Group so the renderer can spin it on the spot; the course decides
 * which kind grew where, so a tomato stays a tomato for the whole of a run.
 */

function skin(kind, which = 'body') {
  return material(PRODUCE[kind][which]);
}

/** A few leaves out of the top of a root, splayed. */
function tops(kind, count, height, spread, y) {
  const group = new THREE.Group();
  const leaf = new THREE.ConeGeometry(0.05, height, 6);
  for (let i = 0; i < count; i++) {
    const blade = new THREE.Mesh(leaf, skin(kind, 'trim'));
    const a = (i / count) * Math.PI * 2;
    blade.position.set(Math.cos(a) * spread, y + height / 2, Math.sin(a) * spread);
    blade.rotation.z = Math.cos(a) * -0.5;
    blade.rotation.x = Math.sin(a) * 0.5;
    group.add(blade);
  }
  return group;
}

function carrot(kind) {
  const group = new THREE.Group();
  const root = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.52, 10), skin(kind));
  root.rotation.x = Math.PI;
  root.position.y = -0.04;
  group.add(root, tops(kind, 3, 0.24, 0.05, 0.2));
  return group;
}

function corn(kind) {
  const group = new THREE.Group();
  const cob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skin(kind));
  cob.scale.set(0.76, 1.4, 0.76);
  group.add(cob);

  const husk = new THREE.ConeGeometry(0.11, 0.34, 6);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(husk, skin(kind, 'trim'));
    leaf.position.set(side * 0.1, -0.12, 0);
    leaf.rotation.z = side * 0.55;
    group.add(leaf);
  }
  return group;
}

function tomato(kind) {
  const group = new THREE.Group();
  const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), skin(kind));
  fruit.scale.set(1, 0.86, 1);
  group.add(fruit);

  const calyx = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.1, 5), skin(kind, 'trim'));
  calyx.position.y = 0.2;
  group.add(calyx);
  return group;
}

function pumpkin(kind) {
  const group = new THREE.Group();
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skin(kind));
  gourd.scale.set(1, 0.74, 1);
  group.add(gourd);

  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 6), skin(kind, 'trim'));
  stalk.position.y = 0.24;
  group.add(stalk);
  return group;
}

function aubergine(kind) {
  const group = new THREE.Group();
  const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), skin(kind));
  fruit.scale.set(0.88, 1.32, 0.88);
  group.add(fruit);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.12, 6), skin(kind, 'trim'));
  cap.position.y = 0.22;
  group.add(cap);
  return group;
}

function apple(kind) {
  const group = new THREE.Group();
  const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), skin(kind));
  fruit.scale.set(1, 0.94, 1);
  group.add(fruit);

  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 5), skin(kind, 'trim'));
  stalk.position.y = 0.25;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), skin(kind, 'trim'));
  leaf.scale.set(1, 0.22, 0.5);
  leaf.position.set(0.09, 0.28, 0);
  leaf.rotation.z = 0.4;
  group.add(stalk, leaf);
  return group;
}

const GROWERS = [carrot, corn, tomato, pumpkin, aubergine, apple];

/** One of the six, by the kind the course rolled for it. `GROWERS` and
 *  `PRODUCE` are the same six in the same order, so one index reaches both. */
export function createProduce(kind) {
  const which = kind % GROWERS.length;
  const group = GROWERS[which](which);
  group.name = PRODUCE[which].name;
  return group;
}

export const KINDS = GROWERS.length;
