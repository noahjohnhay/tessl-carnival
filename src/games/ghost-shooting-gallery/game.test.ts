import { describe, expect, it } from 'vitest';
import { theme } from '../../carnival';
import {
  BOB,
  ROWS,
  SHOTS,
  createState,
  ghostShootingGallery,
  ghostY,
  isHit,
  scoreForHit,
  step,
  zap,
  type Ghost,
} from './game';

const ghost = (overrides: Partial<Ghost> = {}): Ghost => ({
  x: 400,
  row: 200,
  radius: 26,
  speed: 130,
  phase: 0,
  ...overrides,
});

describe('ghost shooting gallery', () => {
  it('has an id that matches its folder', () => {
    expect(ghostShootingGallery.id).toBe('ghost-shooting-gallery');
  });

  it('starts with every shot, three ghosts per row and no score', () => {
    const state = createState();
    expect(state.shots).toBe(SHOTS);
    expect(state.score).toBe(0);
    expect(state.hits).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ghosts).toHaveLength(ROWS.length * 3);
  });

  it('scores 10 points per 50 px/s, rounded up, so each row is worth 40, 30 and 20', () => {
    expect(ROWS.map((row) => scoreForHit(ghost({ speed: row.speed })))).toEqual([40, 30, 20]);
    expect(scoreForHit(ghost({ speed: -130 }))).toBe(30);
  });

  it('bobs a ghost no more than BOB pixels from its row', () => {
    for (let phase = 0; phase < 7; phase += 0.5) {
      expect(Math.abs(ghostY(ghost({ phase })) - 200)).toBeLessThanOrEqual(BOB);
    }
  });

  it('hits a ghost inside its radius, where it is bobbing now', () => {
    const g = ghost({ phase: Math.PI / 2 });
    expect(isHit(g, 400, 200 + BOB)).toBe(true);
    expect(isHit(g, 400 + 27, 200 + BOB)).toBe(false);
  });

  it('scores a hit, uses a shot and sends the ghost back to the start of its row', () => {
    const state = createState();
    state.ghosts = [ghost()];
    expect(zap(state, 400, 200)).toBe(30);
    expect(state.score).toBe(30);
    expect(state.hits).toBe(1);
    expect(state.shots).toBe(SHOTS - 1);
    expect(state.ghosts[0].x).toBeLessThan(0);
    expect(state.poofs).toHaveLength(1);
  });

  it('sends a left-floating ghost back to the right edge when hit', () => {
    const state = createState();
    state.ghosts = [ghost({ speed: -130 })];
    zap(state, 400, 200);
    expect(state.ghosts[0].x).toBeGreaterThan(theme.canvas.width);
  });

  it('uses a shot on a miss without scoring', () => {
    const state = createState();
    state.ghosts = [ghost()];
    expect(zap(state, 10, 480)).toBe(0);
    expect(state.score).toBe(0);
    expect(state.shots).toBe(SHOTS - 1);
  });

  it('ends the round on the last shot and cannot zap after that', () => {
    const state = createState();
    state.shots = 1;
    zap(state, 10, 480);
    expect(state.phase).toBe('over');
    expect(zap(state, 400, 200)).toBeNull();
    expect(state.shots).toBe(0);
  });

  it('floats ghosts along their row and wraps them round the edges', () => {
    const state = createState();
    state.ghosts = [ghost({ x: theme.canvas.width + 20, speed: 100, radius: 26 })];
    step(state, 0.1);
    expect(state.ghosts[0].x).toBe(-26);
  });

  it('clears poofs once they have faded', () => {
    const state = createState();
    state.poofs = [{ x: 0, y: 0, age: 0, points: 10 }];
    step(state, 0.5);
    expect(state.poofs).toHaveLength(0);
  });
});
