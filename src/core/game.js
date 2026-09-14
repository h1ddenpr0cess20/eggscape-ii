import { createCourse } from './course.js';
import { createEmitter } from './emitter.js';
import { advance, createPlayer, respawn } from './player.js';
import {
  AHEAD, BALE, BEHIND, CROP, INVULNERABLE, LIVES, PLAYER, SCORE,
} from './tuning.js';

const STEP = 1 / 120;
const MAX_STEPS = 6;

/**
 * How far the landing of a slam reaches: a thump through the soil, not a
 * blast. Narrower than a lane, so it only ever takes the bale the egg came
 * down on — and short enough that it has to be aimed.
 */
const SMASH = { z: 2.2, x: 1.2, y: 1 };

function overlaps(player, bale) {
  return Math.abs(player.x - bale.x) < PLAYER.radius + BALE.halfWidth
    && Math.abs(player.z - bale.z) < PLAYER.radius + BALE.halfDepth
    && player.y < bale.y + BALE.height
    && player.y + PLAYER.height > bale.y;
}

function within(player, crop) {
  return Math.abs(player.x - crop.x) < CROP.reach
    && Math.abs(player.z - crop.z) < CROP.reach
    && Math.abs(player.y + PLAYER.height / 2 - crop.y) < 1.15;
}

/**
 * Fold a frame's intent into whatever is still waiting to be spent. Lane
 * presses add up, so a double tap crosses two lanes even when both taps landed
 * inside one frame; a hop and a slam are flags, and pressing either twice
 * before a tick is still one of it.
 */
function hold(into, intent) {
  if (!intent) return into;
  const out = into ?? { left: 0, right: 0, jump: false, dive: false };
  out.left += Number(intent.left ?? 0);
  out.right += Number(intent.right ?? 0);
  out.jump = out.jump || Boolean(intent.jump);
  out.dive = out.dive || Boolean(intent.dive);
  return out;
}

/**
 * The run, with no pixels in it: field, egg, lives, score. Everything the
 * renderer shows and the HUD reads is here, and nothing here knows either
 * exists.
 *
 * Events: 'start' 'jump' 'land' 'crop' 'burst' 'hit' 'respawn' 'over'.
 */
export function createGame({ seed = 1, lives = LIVES } = {}) {
  const emitter = createEmitter();

  let course = createCourse({ seed }).ensure(AHEAD);
  let player = createPlayer();
  let state = 'ready';
  let livesLeft = lives;
  let picked = 0;
  let burst = 0;
  let distance = 0;
  let invulnerable = 0;
  let elapsed = 0;
  let carry = 0;
  let held = null;

  function score() {
    return Math.floor(distance * SCORE.perMetre)
      + picked * SCORE.perCrop
      + burst * SCORE.perBale;
  }

  function snapshot() {
    return {
      state,
      player,
      course,
      lives: livesLeft,
      crops: picked,
      bales: burst,
      distance,
      score: score(),
      invulnerable,
      elapsed,
    };
  }

  /** The only way a run ends. Setting `state` on its own left the page with
   *  no overlay, no best score, and an egg standing still. */
  function finish() {
    livesLeft = Math.max(0, livesLeft);
    state = 'over';
    emitter.emit('over', snapshot());
  }

  function damage(reason) {
    livesLeft -= 1;
    invulnerable = INVULNERABLE;
    emitter.emit('hit', { reason, lives: livesLeft });
    if (livesLeft <= 0) finish();
  }

  function collect() {
    for (const crop of course.crops) {
      if (crop.taken || crop.z < player.z - 2) continue;
      if (crop.z > player.z + 2) break;
      if (within(player, crop)) {
        crop.taken = true;
        picked += 1;
        emitter.emit('crop', { crop, crops: picked });
      }
    }
  }

  function scatter(bale) {
    bale.hit = true;
    burst += 1;
    emitter.emit('burst', { bale, bales: burst });
  }

  /**
   * The landing of a slam, gone through the soil. Coming down at 24m/s crosses
   * the whole of a bale in a couple of ticks, so catching one purely on the
   * way through would be a window no hand can hit; the landing is what the
   * player is aiming, so the landing is what bursts it.
   */
  function thump() {
    for (const bale of course.bales) {
      if (bale.hit || bale.z < player.z - SMASH.z) continue;
      if (bale.z > player.z + SMASH.z) break;
      /** Its own lane, on its own plot — not one a terrace up or down. */
      if (Math.abs(bale.x - player.x) > SMASH.x) continue;
      if (Math.abs(bale.y - player.y) > SMASH.y) continue;
      scatter(bale);
    }
  }

  function struck() {
    for (const bale of course.bales) {
      if (bale.hit || bale.z < player.z - 2) continue;
      if (bale.z > player.z + 2) break;
      if (overlaps(player, bale)) return bale;
    }
    return null;
  }

  function tick(dt) {
    elapsed += dt;
    const moved = advance(player, dt, tick.intent, course);
    tick.intent = null;

    course.ensure(player.z + AHEAD);
    course.prune(player.z - BEHIND);

    distance = Math.max(distance, player.z);
    if (invulnerable > 0) invulnerable = Math.max(0, invulnerable - dt);

    if (moved.jumped) emitter.emit('jump', { player });
    if (moved.landed) emitter.emit('land', { player });
    if (moved.slammed) thump();

    collect();

    if (moved.fell) {
      damage('fall');
      if (state === 'running') {
        const seg = course.ensure(player.z + AHEAD).landingAfter(player.z);
        if (!seg) finish();
        else {
          respawn(player, seg);
          emitter.emit('respawn', { player, seg });
        }
      }
      return;
    }

    /**
     * A bale met on the way down with the slam on is a bale burst, grace or no
     * grace. That is what the slam is for, and the reason to spend a hop
     * getting above one instead of weaving round it.
     */
    const bale = invulnerable > 0 && !player.diving ? null : struck();
    if (bale && player.diving) scatter(bale);
    else if (bale) {
      bale.hit = true;
      damage('bale');
    }
  }

  return {
    on: emitter.on,
    snapshot,

    get state() { return state; },
    get player() { return player; },
    get course() { return course; },
    get score() { return score(); },

    start(nextSeed = seed) {
      course = createCourse({ seed: nextSeed }).ensure(AHEAD);
      player = createPlayer();
      state = 'running';
      livesLeft = lives;
      picked = 0;
      burst = 0;
      distance = 0;
      invulnerable = 0;
      elapsed = 0;
      carry = 0;
      held = null;
      tick.intent = null;
      emitter.emit('start', snapshot());
      return snapshot();
    },

    /**
     * Real seconds in, fixed ticks out. Physics at a steady 120Hz keeps a
     * landing a landing whatever the display is doing; a tab that was in the
     * background hands back a huge dt, and the clamp eats it rather than
     * teleporting the egg through the soil.
     *
     * Intent is *held* until a tick spends it, which is not fussiness: a frame
     * shorter than the step runs no tick at all, and a display faster than
     * 120Hz has one of those every few frames. Handing intent straight to the
     * first tick threw away a press each time — roughly one in six on a 144Hz
     * screen, always the press you meant.
     */
    advance(dt, intent) {
      if (state !== 'running') return snapshot();
      held = hold(held, intent);
      carry = Math.min(carry + dt, STEP * MAX_STEPS);
      while (carry >= STEP) {
        carry -= STEP;
        tick.intent = held;
        held = null;
        tick(STEP);
        if (state !== 'running') break;
      }
      return snapshot();
    },
  };
}
