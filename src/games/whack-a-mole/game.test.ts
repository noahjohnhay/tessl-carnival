import { describe, expect, it } from 'vitest';
import {
  BONK_SECONDS,
  COLUMNS,
  POINTS_PER_MOLE,
  POP_EVERY,
  ROUND_SECONDS,
  ROWS,
  UP_FOR,
  createState,
  isMoleUp,
  popInterval,
  popMole,
  step,
  upTime,
  whack,
} from './game';

const first = () => 0;

describe('whack-a-mole', () => {
  it('starts with empty holes, a full clock and no score', () => {
    const state = createState();
    expect(state.holes).toHaveLength(COLUMNS * ROWS);
    expect(state.holes.every((h) => !isMoleUp(h))).toBe(true);
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('pops a mole up once the pop timer runs out', () => {
    const state = createState();
    step(state, state.nextPop, first);
    expect(state.holes.filter(isMoleUp)).toHaveLength(1);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    popMole(state, first);
    state.nextPop = 100;
    step(state, UP_FOR.start + 0.01);
    expect(isMoleUp(state.holes[0])).toBe(false);
  });

  it('scores a whack on a mole that is up, and knocks it down', () => {
    const state = createState();
    popMole(state, first);
    const hole = state.holes[0];
    expect(whack(state, hole.x + 5, hole.y)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(isMoleUp(hole)).toBe(false);
    expect(hole.bonked).toBe(BONK_SECONDS);
  });

  it('scores nothing for a whack on an empty hole', () => {
    const state = createState();
    const hole = state.holes[0];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('scores a mole only once', () => {
    const state = createState();
    popMole(state, first);
    const hole = state.holes[0];
    whack(state, hole.x, hole.y);
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_MOLE);
  });

  it('never pops a mole into a busy hole', () => {
    const state = createState();
    for (let i = 0; i < state.holes.length; i++) expect(popMole(state, first)).toBe(true);
    expect(popMole(state, first)).toBe(false);
  });

  it('pops moles faster and for less time as the round goes on', () => {
    const state = createState();
    expect(popInterval(state)).toBe(POP_EVERY.start);
    expect(upTime(state)).toBe(UP_FOR.start);
    state.timeLeft = ROUND_SECONDS / 2;
    expect(popInterval(state)).toBeLessThan(POP_EVERY.start);
    expect(upTime(state)).toBeLessThan(UP_FOR.start);
    state.timeLeft = 0;
    expect(popInterval(state)).toBeCloseTo(POP_EVERY.end);
    expect(upTime(state)).toBeCloseTo(UP_FOR.end);
  });

  it('ends the round when the clock runs out, and ignores whacks after', () => {
    const state = createState();
    popMole(state, first);
    step(state, ROUND_SECONDS);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    const hole = state.holes[0];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
