import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_MOLE = 10;
export const COLUMNS = 3;
export const ROWS = 3;
export const HOLE_RADIUS = 48;
/** How long a whacked mole stays dazed before it drops. */
export const BONK_SECONDS = 0.25;
/** Seconds between pop-ups, and how long a mole stays up, at the start and end of a round. */
export const POP_EVERY = { start: 1.0, end: 0.35 } as const;
export const UP_FOR = { start: 1.2, end: 0.55 } as const;

export interface Hole {
  x: number;
  y: number;
  /** Seconds left before the mole drops; 0 when the hole is empty. */
  up: number;
  /** Seconds left of the dazed look after a whack; 0 when not whacked. */
  bonked: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  /** Seconds left in the round. */
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextPop: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const top = 120;
  const rowGap = (HEIGHT - top - 70) / ROWS;
  const colGap = WIDTH / COLUMNS;
  const holes: Hole[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      holes.push({
        x: colGap * col + colGap / 2,
        y: top + rowGap * row + rowGap / 2,
        up: 0,
        bonked: 0,
      });
    }
  }
  return { holes, timeLeft: ROUND_SECONDS, nextPop: 0.5, score: 0, phase: 'playing' };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
export function progress(state: WhackAMoleState): number {
  return Math.min(Math.max(1 - state.timeLeft / ROUND_SECONDS, 0), 1);
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Seconds between pop-ups: shrinks as the round goes on. */
export function popInterval(state: WhackAMoleState): number {
  return lerp(POP_EVERY.start, POP_EVERY.end, progress(state));
}

/** How long a mole stays up: shrinks as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return lerp(UP_FOR.start, UP_FOR.end, progress(state));
}

export function isMoleUp(hole: Hole): boolean {
  return hole.up > 0 && hole.bonked === 0;
}

/** Pops a mole up in a random empty hole. Returns false if every hole is busy. */
export function popMole(state: WhackAMoleState, random: () => number = Math.random): boolean {
  const empty = state.holes.filter((h) => h.up === 0 && h.bonked === 0);
  if (empty.length === 0) return false;
  const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
  hole.up = upTime(state);
  return true;
}

/** Whacks at a point on the canvas. Returns true if it hit a mole that was up. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => isMoleUp(h) && Math.hypot(x - h.x, y - h.y) <= HOLE_RADIUS);
  if (!hole) return false;
  state.score += POINTS_PER_MOLE;
  hole.up = 0;
  hole.bonked = BONK_SECONDS;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random) {
  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(state.timeLeft - dt, 0);
  for (const hole of state.holes) {
    hole.up = Math.max(hole.up - dt, 0);
    hole.bonked = Math.max(hole.bonked - dt, 0);
  }

  if (state.timeLeft === 0) {
    state.phase = 'over';
    for (const hole of state.holes) hole.up = 0;
    return;
  }

  state.nextPop -= dt;
  if (state.nextPop <= 0) {
    popMole(state, random);
    state.nextPop = popInterval(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    // The hole.
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 20, HOLE_RADIUS, HOLE_RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.up > 0 || hole.bonked > 0) {
      const dazed = hole.bonked > 0;
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, HOLE_RADIUS * 0.7, Math.PI, 0);
      ctx.lineTo(hole.x + HOLE_RADIUS * 0.7, hole.y + 20);
      ctx.lineTo(hole.x - HOLE_RADIUS * 0.7, hole.y + 20);
      ctx.closePath();
      ctx.fill();

      // Eyes, and a nose.
      ctx.fillStyle = colors.text;
      ctx.font = canvasFont('body', 'bold');
      ctx.textAlign = 'center';
      if (dazed) {
        ctx.fillText('x  x', hole.x, hole.y - 8);
      } else {
        ctx.beginPath();
        ctx.arc(hole.x - 10, hole.y - 12, 4, 0, Math.PI * 2);
        ctx.arc(hole.x + 10, hole.y - 12, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = colors.danger;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // The front lip of the hole, so the mole looks like it rises out of it.
    ctx.fillStyle = colors.wood;
    ctx.fillRect(hole.x - HOLE_RADIUS - 6, hole.y + 20, HOLE_RADIUS * 2 + 12, 10);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get faster as the clock runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
