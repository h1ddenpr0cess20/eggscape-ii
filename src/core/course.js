import { createRng, intBelow, range } from './rng.js';
import { AIRTIME, APEX, laneBounds, LANES, laneX, speedAt } from './tuning.js';

/** The headland starts behind the egg, so there is soil under it at t=0. */
const START_Z = -16;
const OPENING = 36;

/** Metres to full difficulty. */
const DIFFICULTY_RUN = 950;

/** A ditch is a share of the reach a flat hop has at that speed — never more. */
const GAP_SHARE = { easy: 0.3, hard: 0.55 };
const GAP_MIN = 2.2;

/** A step up has to be comfortably under the apex, and over the landing snap. */
const STEP = { min: 0.7, max: APEX * 0.62 };

/** How far past a plot's edge the egg can still stand. */
export const EDGE_MARGIN = 0.25;

/** How many kinds of produce are in the ground, and how many bales in the
 *  barn. The renderer keeps a mesh per kind; the course decides which grew
 *  where, so a crop looks the same on every frame and on every replay. */
export const CROP_KINDS = 6;
export const BALE_KINDS = 2;

/** Plots never overlap in z, so there is never a wall to run into: miss a hop
 *  and you meet the ditch, which is a fair thing to lose to. */
export function createCourse({ seed = 1, difficultyRun = DIFFICULTY_RUN } = {}) {
  const rng = createRng(seed);

  const segments = [];
  const bales = [];
  const crops = [];

  let cursor = START_Z;
  let level = 0;
  let laid = 0;
  /** Ids never come round again — pruning shortens the array, and a renderer
   *  keyed on a reused id would put an old plot under a new one. */
  let nextId = 0;

  function difficulty() {
    return Math.min(1, Math.max(0, cursor / difficultyRun));
  }

  function reach() {
    return speedAt(Math.max(0, cursor)) * AIRTIME;
  }

  function gapLength(scale = 1) {
    const share = GAP_SHARE.easy + (GAP_SHARE.hard - GAP_SHARE.easy) * difficulty();
    return Math.max(GAP_MIN, reach() * share * range(rng, 0.85, 1.15) * scale);
  }

  function plot(length, { lane = 0, span = LANES, y = level } = {}) {
    const seg = {
      id: nextId++,
      z0: cursor,
      z1: cursor + length,
      y,
      lane,
      span,
      /** Which way the scenery leans on this one, decided once and for all. */
      dressing: intBelow(rng, 4),
      ...laneBounds(lane, span),
    };
    segments.push(seg);
    cursor = seg.z1;
    level = y;
    return seg;
  }

  function gap(length = gapLength()) {
    cursor += length;
    return length;
  }

  function bale(seg, z, lane) {
    bales.push({ z, lane, x: laneX(lane), y: seg.y, kind: intBelow(rng, BALE_KINDS), hit: false });
  }

  function crop(z, lane, y) {
    crops.push({ z, lane, x: laneX(lane), y, kind: intBelow(rng, CROP_KINDS), taken: false });
  }

  function row(seg, count, lane = seg.lane + intBelow(rng, seg.span), step = 2.4, from = 2) {
    const room = seg.z1 - seg.z0 - from - 1;
    const gapZ = Math.min(step, room / Math.max(1, count));
    for (let i = 0; i < count; i++) crop(seg.z0 + from + i * gapZ, lane, seg.y + 0.75);
    return lane;
  }

  /** A breather: flat, wide, and planted end to end. */
  function pasture() {
    row(plot(range(rng, 22, 32)), 5);
  }

  /** Bales dropped off the back of the wagon, one lane at a time. */
  function windrow(d) {
    const rows = 2 + Math.round(d * 3);
    const seg = plot((rows + 1) * 6 + range(rng, 0, 6));
    let lane = intBelow(rng, LANES);
    for (let i = 1; i <= rows; i++) {
      const z = seg.z0 + (seg.z1 - seg.z0) * (i / (rows + 1));
      bale(seg, z, lane);
      crop(z + 1.8, (lane + 1 + intBelow(rng, LANES - 1)) % LANES, seg.y + 0.75);
      lane = (lane + 1 + intBelow(rng, LANES - 1)) % LANES;
    }
  }

  /** An irrigation cut, with an arc of produce over it to say how far. */
  function ditch() {
    const before = plot(range(rng, 10, 16));
    const length = gap();
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      crop(before.z1 + length * t, 1, before.y + 0.9 + Math.sin(t * Math.PI) * 1.1);
    }
    row(plot(range(rng, 12, 20)), 3);
  }

  /** A plank across the water, one or two lanes wide. The run-up is the tell. */
  function plank(d) {
    plot(range(rng, 8, 12));
    const span = rng() < 0.35 + d * 0.4 ? 1 : 2;
    const lane = intBelow(rng, LANES - span + 1);
    gap(gapLength(0.7));
    const seg = plot(range(rng, 12, 20), { lane, span });
    const line = row(seg, 5, lane + intBelow(rng, span), 2.6);
    if (span === 2 && d > 0.4) {
      bale(seg, seg.z0 + (seg.z1 - seg.z0) * 0.6, lane + (line === lane ? 1 : 0));
    }
    plot(range(rng, 6, 10), { y: seg.y });
  }

  /** Up onto the next terrace, or back down to the field. Either way, over a
   *  cut in the bank. */
  function terrace(d) {
    const down = level > 0.4;
    gap(gapLength(down ? 0.8 : 0.55));
    const span = rng() < 0.5 ? LANES : 2;
    const lane = span === LANES ? 0 : intBelow(rng, LANES - 1);
    const seg = plot(range(rng, 14, 22), { y: down ? 0 : range(rng, STEP.min, STEP.max), lane, span });
    const line = row(seg, 4, lane + intBelow(rng, span));
    if (d > 0.3 && span > 1) {
      const other = lane + ((line - lane + 1) % span);
      bale(seg, seg.z0 + (seg.z1 - seg.z0) * 0.72, other);
    }
  }

  /** Fence after fence with exactly one gate open — and a crop standing in it. */
  function gate(d) {
    const rows = 2 + Math.round(d * 2);
    const seg = plot((rows + 1) * 6.5 + range(rng, 0, 4));
    let open = intBelow(rng, LANES);
    for (let i = 1; i <= rows; i++) {
      const z = seg.z0 + (seg.z1 - seg.z0) * (i / (rows + 1));
      for (let lane = 0; lane < LANES; lane++) if (lane !== open) bale(seg, z, lane);
      crop(z, open, seg.y + 0.75);
      /** The way through never jumps more than a lane between fences. */
      open = Math.max(0, Math.min(LANES - 1, open + (rng() < 0.5 ? -1 : 1)));
    }
  }

  function next() {
    if (laid++ === 0) {
      /**
       * The headland runs from sixteen metres behind the egg, and the row it
       * is planted with starts in front of it — laid from the near end, the
       * first two crops come up between the camera and the shell and the
       * title screen opens on a pumpkin with an egg behind it.
       */
      row(plot(OPENING), 6, 1, 2.6, -START_Z + 2);
      return;
    }
    const d = difficulty();
    const roll = rng();
    if (roll < 0.18) pasture();
    else if (roll < 0.42) windrow(d);
    else if (roll < 0.62) ditch(d);
    else if (roll < 0.78) plank(d);
    else if (roll < 0.9) terrace(d);
    else gate(d);
  }

  return {
    segments,
    bales,
    crops,

    get end() { return cursor; },

    /** Lay field until it reaches z. */
    ensure(z) {
      while (cursor < z) next();
      return this;
    },

    /** The plot under a point, or null over the ditch. */
    groundAt(x, z) {
      let lo = 0;
      let hi = segments.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const seg = segments[mid];
        if (z < seg.z0) hi = mid - 1;
        else if (z >= seg.z1) lo = mid + 1;
        else return x >= seg.xMin - EDGE_MARGIN && x <= seg.xMax + EDGE_MARGIN ? seg : null;
      }
      return null;
    },

    /** Where a fallen egg is put back: the first plot still ahead of it. */
    landingAfter(z) {
      for (const seg of segments) if (seg.z0 > z) return seg;
      return null;
    },

    /** Everything behind the egg is scenery nobody will look at again. */
    prune(z) {
      while (segments.length > 1 && segments[0].z1 < z) segments.shift();
      while (bales.length && bales[0].z < z) bales.shift();
      while (crops.length && crops[0].z < z) crops.shift();
    },
  };
}
