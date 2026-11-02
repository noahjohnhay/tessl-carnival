import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How far, in pixels, the ring's landing spot sways around the aim. */
export const WOBBLE = 40;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
const ROWS = [
  { y: 120, points: 30, neckRadius: 12 },
  { y: 200, points: 20, neckRadius: 14 },
  { y: 280, points: 10, neckRadius: 16 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  x: number;
  y: number;
  /** A ring that lands this close to the neck rings the bottle. */
  neckRadius: number;
  points: number;
  ringed: boolean;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the ring was thrown. */
  age: number;
}

export interface Landing {
  x: number;
  y: number;
  hit: boolean;
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  rings: Ring[];
  landings: Landing[];
  ringsLeft: number;
  score: number;
  /** Seconds since the round started; drives the sway of the aim. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = 90;
  const left = WIDTH / 2 - (spacing * (BOTTLES_PER_ROW - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      neckRadius: row.neckRadius,
      points: row.points,
      ringed: false,
    })),
  );
  return {
    bottles,
    rings: [],
    landings: [],
    ringsLeft: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** Where a ring thrown now at the aim point would land: the aim, plus the sway. */
export function landingSpot(state: RingTossState, aimX: number, aimY: number) {
  return {
    x: aimX + Math.sin(state.time * 3) * WOBBLE,
    y: aimY + Math.cos(state.time * 2.3) * WOBBLE * 0.5,
  };
}

/** The unringed bottle whose neck the point lands on, if any. */
export function bottleAt(state: RingTossState, x: number, y: number): Bottle | undefined {
  return state.bottles.find((b) => !b.ringed && Math.hypot(x - b.x, y - b.y) <= b.neckRadius);
}

/** Throws one ring towards the aim point. Returns false if nothing was thrown. */
export function throwRing(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.ringsLeft === 0) return false;
  const spot = landingSpot(state, aimX, aimY);
  state.rings.push({ fromX: THROWER.x, fromY: THROWER.y, toX: spot.x, toY: spot.y, age: 0 });
  state.ringsLeft -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  const flying: Ring[] = [];
  for (const ring of state.rings) {
    ring.age += dt;
    if (ring.age < FLIGHT_TIME) {
      flying.push(ring);
      continue;
    }
    const bottle = bottleAt(state, ring.toX, ring.toY);
    if (bottle) {
      bottle.ringed = true;
      state.score += bottle.points;
    }
    state.landings.push({ x: ring.toX, y: ring.toY, hit: bottle !== undefined, age: 0 });
  }
  state.rings = flying;

  for (const landing of state.landings) landing.age += dt;
  state.landings = state.landings.filter((l) => l.age < 0.5);

  if (state.ringsLeft === 0 && state.rings.length === 0) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, size, size * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(WIDTH / 2 - 240, row.y + 34, 480, 6);
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 12, bottle.y + 4, 24, 30);
    ctx.fillRect(bottle.x - 4, bottle.y - 10, 8, 16);
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.arc(bottle.x, bottle.y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (bottle.ringed) drawRing(ctx, bottle.x, bottle.y + 2, 14);
  }

  ctx.strokeStyle = colors.danger;
  ctx.lineWidth = 2;
  for (const landing of state.landings) {
    if (landing.hit) continue;
    ctx.globalAlpha = 1 - landing.age / 0.5;
    ctx.beginPath();
    ctx.ellipse(landing.x, landing.y, 14, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Rings in the air arc up and shrink as they fly away.
  for (const ring of state.rings) {
    const t = Math.min(ring.age / FLIGHT_TIME, 1);
    const x = ring.fromX + (ring.toX - ring.fromX) * t;
    const y = ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(t * Math.PI) * 80;
    drawRing(ctx, x, y, 26 - 12 * t);
  }

  if (state.phase === 'playing') {
    const spot = landingSpot(state, aim.x, aim.y);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 8, 0, Math.PI * 2);
    ctx.moveTo(spot.x - 12, spot.y);
    ctx.lineTo(spot.x + 12, spot.y);
    ctx.moveTo(spot.x, spot.y - 12);
    ctx.lineTo(spot.x, spot.y + 12);
    ctx.stroke();
    if (state.ringsLeft > 0) drawRing(ctx, THROWER.x, THROWER.y, 26);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.ringsLeft}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: ROWS[1].y };

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
        throwRing(state, aim.x, aim.y);
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
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
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

export default ringToss;
