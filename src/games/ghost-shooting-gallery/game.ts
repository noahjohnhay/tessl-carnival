import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const SHOTS = 12;
/** How far, in pixels, a ghost bobs above and below its row. */
export const BOB = 10;
export const ROWS = [
  { y: 120, speed: 200, radius: 22 },
  { y: 220, speed: -130, radius: 26 },
  { y: 320, speed: 70, radius: 30 },
] as const;
const GHOSTS_PER_ROW = 3;
const POOF_TIME = 0.4;

export interface Ghost {
  x: number;
  /** The row's height; the ghost bobs around it. */
  row: number;
  radius: number;
  /** Pixels per second; negative floats left. */
  speed: number;
  /** Where the ghost is in its bob, in radians. */
  phase: number;
}

export interface Poof {
  x: number;
  y: number;
  age: number;
  points: number;
}

export interface GhostGalleryState {
  ghosts: Ghost[];
  poofs: Poof[];
  shots: number;
  hits: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): GhostGalleryState {
  const spacing = WIDTH / GHOSTS_PER_ROW;
  const ghosts = ROWS.flatMap((row, r) =>
    Array.from({ length: GHOSTS_PER_ROW }, (_, i) => ({
      x: spacing * i + spacing / 2,
      row: row.y,
      radius: row.radius,
      speed: row.speed,
      phase: i * 2 + r,
    })),
  );
  return { ghosts, poofs: [], shots: SHOTS, hits: 0, score: 0, phase: 'playing' };
}

/** The ghost's height right now, bobbing round its row. */
export function ghostY(ghost: Ghost): number {
  return ghost.row + Math.sin(ghost.phase) * BOB;
}

/** Faster ghosts are worth more: 10 points per 50 px/s, rounded up. */
export function scoreForHit(ghost: Ghost): number {
  return 10 * Math.ceil(Math.abs(ghost.speed) / 50);
}

export function isHit(ghost: Ghost, x: number, y: number): boolean {
  return Math.hypot(x - ghost.x, y - ghostY(ghost)) <= ghost.radius;
}

/**
 * Zaps the spot at (x, y), using one shot. A ghost there scores and floats back
 * to the start of its row. Returns the points scored, or null if nothing fired.
 */
export function zap(state: GhostGalleryState, x: number, y: number): number | null {
  if (state.phase !== 'playing' || state.shots === 0) return null;
  state.shots -= 1;
  const ghost = state.ghosts.find((g) => isHit(g, x, y));
  let points = 0;
  if (ghost) {
    points = scoreForHit(ghost);
    state.score += points;
    state.hits += 1;
    state.poofs.push({ x: ghost.x, y: ghostY(ghost), age: 0, points });
    ghost.x = ghost.speed > 0 ? -ghost.radius : WIDTH + ghost.radius;
  }
  if (state.shots === 0) state.phase = 'over';
  return points;
}

/** Advances the game by `dt` seconds. */
export function step(state: GhostGalleryState, dt: number): void {
  for (const ghost of state.ghosts) {
    ghost.x += ghost.speed * dt;
    ghost.phase += dt * 3;
    if (ghost.x > WIDTH + ghost.radius) ghost.x = -ghost.radius;
    if (ghost.x < -ghost.radius) ghost.x = WIDTH + ghost.radius;
  }
  for (const poof of state.poofs) poof.age += dt;
  state.poofs = state.poofs.filter((p) => p.age < POOF_TIME);
}

function drawGhost(ctx: CanvasRenderingContext2D, ghost: Ghost, t: number) {
  const { colors } = theme;
  const r = ghost.radius;
  const x = ghost.x;
  const y = ghostY(ghost);
  const facing = ghost.speed > 0 ? 1 : -1;

  ctx.fillStyle = colors.text;
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  // A wavy hem that ripples as the ghost floats.
  const bottom = y + r * 1.1;
  ctx.lineTo(x + r, bottom);
  const waves = 4;
  for (let i = waves; i > 0; i--) {
    const left = x - r + ((i - 1) * 2 * r) / waves;
    const mid = left + r / waves;
    const lift = Math.sin(t * 6 + i + ghost.phase) * 3;
    ctx.quadraticCurveTo(mid, bottom - r * 0.35 + lift, left, bottom);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = colors.background;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      x + side * r * 0.35 + facing * r * 0.12,
      y - r * 0.1,
      r * 0.14,
      r * 0.22,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(x + facing * r * 0.12, y + r * 0.4, r * 0.16, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function draw(
  ctx: CanvasRenderingContext2D,
  state: GhostGalleryState,
  aim: { x: number; y: number },
  t: number,
) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // A shelf under each row.
  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(0, row.y + row.radius * 1.1 + BOB + 8, WIDTH, 6);
  }

  for (const ghost of state.ghosts) drawGhost(ctx, ghost, t);

  for (const poof of state.poofs) {
    const fade = 1 - poof.age / POOF_TIME;
    ctx.globalAlpha = fade;
    ctx.strokeStyle = colors.water;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(poof.x, poof.y, 12 + poof.age * 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('body', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(`+${poof.points}`, poof.x, poof.y - 20 - poof.age * 60);
  }
  ctx.globalAlpha = 1;

  // Crosshair.
  if (state.phase === 'playing') {
    ctx.strokeStyle = colors.danger;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, 14, 0, Math.PI * 2);
    ctx.moveTo(aim.x - 22, aim.y);
    ctx.lineTo(aim.x + 22, aim.y);
    ctx.moveTo(aim.x, aim.y - 22);
    ctx.lineTo(aim.x, aim.y + 22);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Shots ${state.shots}/${SHOTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of shots! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText(`${state.hits} of ${SHOTS} ghosts zapped`, WIDTH / 2, HEIGHT / 2 + 36);
    ctx.fillStyle = colors.muted;
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 70);
  }
}

export const ghostShootingGallery: CarnivalGame = {
  id: 'ghost-shooting-gallery',
  name: 'Ghost Shooting Gallery',
  description: 'Zap the floating ghosts before your shots run out. Faster ghosts score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: HEIGHT / 2 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        zap(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ghostShootingGallery.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim, time / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ghostShootingGallery;
