import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LANES, laneBounds } from '../src/core/tuning.js';
import { createPlot, disposePlot } from '../src/render/props.js';

/** A plot wide enough and long enough to be dressed, at the given id. */
function plot(id, dressing = 0) {
  return {
    id, z0: id * 40, z1: id * 40 + 24, y: 0, lane: 0, span: LANES, dressing,
    ...laneBounds(0, LANES),
  };
}

/** Whether a geometry's buffers were freed while `run` was running. */
function freed(geometry, run) {
  let fired = false;
  const listen = () => { fired = true; };
  geometry.addEventListener('dispose', listen);
  run();
  geometry.removeEventListener('dispose', listen);
  return fired;
}

describe('plots', () => {
  it('dresses a wide plot with a fence and a scarecrow', () => {
    const group = createPlot(plot(1));
    assert.ok(group.getObjectByName('fence'), 'no fence down the side of it');
    assert.ok(group.getObjectByName('scarecrow'), 'nobody standing in it');
  });

  it('frees the geometry it built for itself', () => {
    const group = createPlot(plot(2));
    const fence = group.getObjectByName('fence');
    assert.ok(freed(fence.geometry, () => disposePlot(group)), 'the fence kept its buffers');
  });

  /**
   * Every scarecrow in the field is a clone of one pattern and shares its
   * buffers. Pulling down the plot one is standing in used to free them for
   * all of the others, and the driver quietly uploaded them again next frame.
   */
  it('leaves the scarecrow it shares with every other plot alone', () => {
    const mine = createPlot(plot(3));
    const yours = createPlot(plot(4));
    const shared = yours.getObjectByName('scarecrow').children[0].geometry;
    assert.equal(shared, mine.getObjectByName('scarecrow').children[0].geometry, 'not shared at all');
    assert.ok(!freed(shared, () => disposePlot(mine)), 'one plot took every scarecrow with it');
  });
});
