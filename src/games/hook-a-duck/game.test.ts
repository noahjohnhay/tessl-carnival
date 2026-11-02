import { describe, expect, it } from 'vitest';
import {
  CASTS,
  DUCK_POINTS,
  DUCK_RADIUS,
  HOOK_BOTTOM,
  HOOK_TOP,
  STREAM,
  aim,
  cast,
  createState,
  duckPosition,
  isHooked,
  step,
  type HookADuckState,
} from './game';

/** Leaves one duck in the stream, parked at `angle`, and stops it moving. */
function oneDuck(state: HookADuckState, angle: number, points = 25) {
  state.ducks = [{ angle, points, caught: false }];
  return state.ducks[0];
}

/** Steps until the hook is back at the top, or gives up. */
function finishCast(state: HookADuckState) {
  for (let i = 0; i < 200 && state.hook.phase !== 'ready'; i++) step(state, 0.02);
}

describe('hook a duck', () => {
  it('starts with every cast, no score and a duck for each number', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.points)).toEqual(DUCK_POINTS);
    expect(state.hook.phase).toBe('ready');
    expect(state.hook.y).toBe(HOOK_TOP);
  });

  it('floats the ducks round the loop', () => {
    const state = createState();
    const before = duckPosition(state.ducks[0]);
    step(state, 0.5);
    expect(duckPosition(state.ducks[0])).not.toEqual(before);
  });

  it('uses one cast per lowering of the hook', () => {
    const state = createState();
    expect(cast(state)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook.phase).toBe('lowering');
  });

  it('cannot cast again while the hook is in the water', () => {
    const state = createState();
    cast(state);
    expect(cast(state)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('only moves the hook along the rod while it is up', () => {
    const state = createState();
    aim(state, 120);
    expect(state.hook.x).toBe(120);
    cast(state);
    aim(state, 600);
    expect(state.hook.x).toBe(120);
  });

  it('scores the number on the base of the duck it hooks', () => {
    const state = createState();
    // Park a duck at the front of the loop, right under the hook.
    const duck = oneDuck(state, Math.PI / 2, 25);
    aim(state, STREAM.x);
    state.hook.y = STREAM.y + STREAM.ry - 1;
    state.hook.phase = 'lowering';
    step(state, 0);
    expect(state.score).toBe(25);
    expect(duck.caught).toBe(true);
    expect(state.hook.phase).toBe('raising');
  });

  it('puts the duck back in the stream once the hook is up', () => {
    const state = createState();
    const duck = oneDuck(state, Math.PI / 2);
    aim(state, STREAM.x);
    state.hook.y = STREAM.y + STREAM.ry;
    state.hook.phase = 'lowering';
    step(state, 0);
    finishCast(state);
    expect(state.hook.y).toBe(HOOK_TOP);
    expect(state.hook.duck).toBeNull();
    expect(duck.caught).toBe(false);
  });

  it('scores nothing when the hook misses every duck', () => {
    const state = createState();
    state.ducks = [];
    cast(state);
    for (let i = 0; i < 100 && state.hook.phase === 'lowering'; i++) step(state, 0.02);
    expect(state.hook.y).toBe(HOOK_BOTTOM);
    finishCast(state);
    expect(state.score).toBe(0);
    expect(state.hook.phase).toBe('ready');
  });

  it('hooks a duck inside its radius and misses one outside it', () => {
    const duck = { angle: 0, points: 5, caught: false };
    const { x, y } = duckPosition(duck);
    const hook = { x, y: y + DUCK_RADIUS - 1, phase: 'lowering' as const, duck: null };
    expect(isHooked(hook, duck)).toBe(true);
    expect(isHooked({ ...hook, x: x + DUCK_RADIUS + 1, y }, duck)).toBe(false);
    expect(isHooked(hook, { ...duck, caught: true })).toBe(false);
  });

  it('ends the round once the last cast is back up', () => {
    const state = createState();
    state.ducks = [];
    state.casts = 1;
    cast(state);
    step(state, 0.02);
    expect(state.phase).toBe('playing');
    finishCast(state);
    expect(state.phase).toBe('over');
    expect(cast(state)).toBe(false);
  });

  it('plays a whole round of casts', () => {
    const state = createState();
    for (let i = 0; i < CASTS; i++) {
      expect(cast(state)).toBe(true);
      finishCast(state);
    }
    expect(state.casts).toBe(0);
    expect(state.phase).toBe('over');
  });
});
