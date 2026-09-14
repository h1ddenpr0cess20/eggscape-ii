import * as THREE from 'three';

import { blot, texture } from './textures.js';
import { THEME } from './theme.js';

/**
 * Every surface in the field, shared. A run builds a few hundred objects out
 * of about a dozen materials, and a material is a shader program — making one
 * per bale is how a farm becomes a slideshow.
 */
const cache = new Map();

/** Painted matte: a colour, optionally tiled with one of the four tiles. */
export function matte(color, { map = null, roughness = 0.94, metalness = 0, glow = 0 } = {}) {
  const key = `${color}:${map}:${roughness}:${metalness}:${glow}`;
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({
      color,
      map: map ? texture(map) : null,
      roughness,
      metalness,
      emissive: glow > 0 ? new THREE.Color(color) : new THREE.Color(0x000000),
      emissiveIntensity: glow,
    }));
  }
  return cache.get(key);
}

export const SURFACE = {
  soil: () => matte(0xffffff, { map: 'soil' }),
  earth: () => matte(THEME.earth, { roughness: 1 }),
  grass: () => matte(0xffffff, { map: 'grass' }),
  straw: () => matte(0xffffff, { map: 'straw', roughness: 0.98 }),
  wood: () => matte(0xffffff, { map: 'wood', roughness: 0.85 }),
  post: () => matte(THEME.post, { roughness: 0.9 }),
  twine: () => matte(THEME.twine, { roughness: 1 }),
  sack: () => matte(THEME.sack, { roughness: 1 }),
  barn: () => matte(THEME.barn, { roughness: 0.8 }),
};

/**
 * Produce is lit like everything else and then given a little of its own
 * light back. A carrot the size of a fist has to be spotted, reached and
 * taken at twenty metres a second, and against turned soil a plain matte one
 * simply is not there in time.
 */
export function produce(color) {
  return matte(color, { roughness: 0.55, glow: 0.14 });
}

/** The smudge under the egg. */
export function shade() {
  if (!cache.has('shade')) {
    cache.set('shade', new THREE.MeshBasicMaterial({
      map: blot(),
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      fog: false,
    }));
  }
  return cache.get('shade');
}

/** Unlit and flat, for the country too far below to be lit by anything. */
export function flat({ vertexColors = false, color = 0xffffff } = {}) {
  const key = `flat:${vertexColors}:${color}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshBasicMaterial({ color, vertexColors }));
  return cache.get(key);
}
