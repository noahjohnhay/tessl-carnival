import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  RINGS_PER_ROUND,
  WOBBLE,
  bottleAt,
  createState,
  landingSpot,
  step,
  throwRing,
  type RingTossState,
} from './game';

/** Puts a ring in the air that lands exactly on the point. */
function ringLandingOn(state: RingTossState, x: number, y: number) {
  state.rings.push({ fromX: 400, fromY: 470, toX: x, toY: y, age: 0 });
}

describe('ring toss', () => {
  it('starts with every ring, no score and no bottle ringed', () => {
    const state = createState();
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles.length).toBeGreaterThan(0);
    expect(state.bottles.every((b) => !b.ringed)).toBe(true);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(throwRing(state, 400, 200)).toBe(true);
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND - 1);
    expect(state.rings).toHaveLength(1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.ringsLeft = 0;
    expect(throwRing(state, 400, 200)).toBe(false);
    expect(state.rings).toHaveLength(0);
  });

  it('lands the ring near the aim, within the sway', () => {
    const state = createState();
    for (const time of [0, 0.4, 1.3, 2.7]) {
      state.time = time;
      const spot = landingSpot(state, 400, 200);
      expect(Math.abs(spot.x - 400)).toBeLessThanOrEqual(WOBBLE);
      expect(Math.abs(spot.y - 200)).toBeLessThanOrEqual(WOBBLE);
    }
  });

  it('scores a ring that lands on a bottle neck once it lands', () => {
    const state = createState();
    const bottle = state.bottles[0];
    ringLandingOn(state, bottle.x + 2, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(bottle.points);
    expect(bottle.ringed).toBe(true);
  });

  it('scores nothing for a ring that misses every neck', () => {
    const state = createState();
    ringLandingOn(state, 5, 480);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
    expect(state.bottles.every((b) => !b.ringed)).toBe(true);
  });

  it('scores a ringed bottle only once', () => {
    const state = createState();
    const bottle = state.bottles[0];
    ringLandingOn(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME);
    ringLandingOn(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(bottle.points);
    expect(bottleAt(state, bottle.x, bottle.y)).toBeUndefined();
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const back = state.bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = state.bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('ends the round when the rings run out and the last ring has landed', () => {
    const state = createState();
    state.ringsLeft = 0;
    ringLandingOn(state, 5, 480);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
  });

  it('cannot throw once the round is over', () => {
    const state = createState();
    state.phase = 'over';
    expect(throwRing(state, 400, 200)).toBe(false);
  });
});
