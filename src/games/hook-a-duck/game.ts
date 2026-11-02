import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 10;
/** The stream is an oval loop; ducks float round it. */
export const STREAM = { x: WIDTH / 2, y: 280, rx: 300, ry: 90 } as const;
/** Radians per second; the back of the loop moves right, the front moves left. */
export const DUCK_SPEED = 0.5;
export const DUCK_RADIUS = 24;
/** The numbers on the ducks' bases, round the loop. */
export const DUCK_POINTS = [10, 5, 25, 5, 10, 5, 50, 5];
export const HOOK_TOP = 70;
/** The hook stops at the bed of the stream, just past the front of the loop. */
export const HOOK_BOTTOM = STREAM.y + STREAM.ry + DUCK_RADIUS + 10;
export const HOOK_SPEED = 320;

export interface Duck {
  /** Position round the loop, in radians. */
  angle: number;
  points: number;
  /** True while the duck hangs on the hook. */
  caught: boolean;
}

export interface Hook {
  x: number;
  y: number;
  phase: 'ready' | 'lowering' | 'raising';
  /** The duck on the hook, if any. */
  duck: Duck | null;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook;
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_POINTS.map((points, i) => ({
    angle: (Math.PI * 2 * i) / DUCK_POINTS.length,
    points,
    caught: false,
  }));
  return {
    ducks,
    hook: { x: WIDTH / 2, y: HOOK_TOP, phase: 'ready', duck: null },
    casts: CASTS,
    score: 0,
    phase: 'playing',
  };
}

export function duckPosition(duck: Duck): { x: number; y: number } {
  return {
    x: STREAM.x + STREAM.rx * Math.cos(duck.angle),
    y: STREAM.y + STREAM.ry * Math.sin(duck.angle),
  };
}

export function isHooked(hook: Hook, duck: Duck): boolean {
  if (duck.caught) return false;
  const { x, y } = duckPosition(duck);
  return Math.hypot(hook.x - x, hook.y - y) <= DUCK_RADIUS;
}

/** Moves the hanging hook along the rod while it waits for a cast. */
export function aim(state: HookADuckState, x: number): void {
  if (state.hook.phase !== 'ready') return;
  state.hook.x = Math.min(Math.max(x, 0), WIDTH);
}

/** Lowers the hook into the stream. Returns false if no cast was made. */
export function cast(state: HookADuckState): boolean {
  if (state.phase !== 'playing' || state.hook.phase !== 'ready' || state.casts === 0) {
    return false;
  }
  state.casts -= 1;
  state.hook.phase = 'lowering';
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    if (!duck.caught) duck.angle = (duck.angle + DUCK_SPEED * dt) % (Math.PI * 2);
  }

  const { hook } = state;
  if (hook.phase === 'lowering') {
    hook.y = Math.min(hook.y + HOOK_SPEED * dt, HOOK_BOTTOM);
    // Ducks nearer the front of the loop sit in front, so they're hooked first.
    const duck = state.ducks
      .filter((d) => isHooked(hook, d))
      .sort((a, b) => duckPosition(b).y - duckPosition(a).y)[0];
    if (duck) {
      duck.caught = true;
      hook.duck = duck;
      state.score += duck.points;
      hook.phase = 'raising';
    } else if (hook.y >= HOOK_BOTTOM) {
      hook.phase = 'raising';
    }
  } else if (hook.phase === 'raising') {
    hook.y = Math.max(hook.y - HOOK_SPEED * dt, HOOK_TOP);
    if (hook.y <= HOOK_TOP) {
      // Put the duck back in the stream for the next cast.
      if (hook.duck) hook.duck.caught = false;
      hook.duck = null;
      hook.phase = 'ready';
    }
  }

  if (state.casts === 0 && hook.phase === 'ready') state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, duck: Duck) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, DUCK_RADIUS, DUCK_RADIUS * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.55, y - DUCK_RADIUS * 0.7, DUCK_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.fillRect(x + DUCK_RADIUS * 0.9, y - DUCK_RADIUS * 0.75, 10, 5);
  ctx.fillStyle = colors.background;
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'center';
  ctx.fillText(String(duck.points), x - 2, y + 6);
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream: a wooden trough round the loop, filled with water.
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + 44, STREAM.ry + 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.water;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + 34, STREAM.ry + 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - 34, STREAM.ry - 34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw back to front so nearer ducks sit in front.
  const floating = state.ducks
    .filter((d) => !d.caught)
    .map((d) => ({ duck: d, ...duckPosition(d) }))
    .sort((a, b) => a.y - b.y);
  for (const { duck, x, y } of floating) drawDuck(ctx, x, y, duck);

  // Rod along the top, line and hook.
  const { hook } = state;
  ctx.fillStyle = colors.wood;
  ctx.fillRect(0, HOOK_TOP - 24, WIDTH, 8);
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hook.x, HOOK_TOP - 16);
  ctx.lineTo(hook.x, hook.y);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hook.x - 6, hook.y, 6, 0, Math.PI);
  ctx.stroke();
  if (hook.duck) drawDuck(ctx, hook.x, hook.y + DUCK_RADIUS, hook.duck);

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description:
    'Lower your hook to catch a rubber duck as it floats by. The number underneath is your score.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const toCanvasX = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return ((event.clientX - rect.left) / rect.width) * WIDTH;
    };
    const onMove = (event: PointerEvent) => aim(state, toCanvasX(event));
    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        aim(state, toCanvasX(event));
        cast(state);
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
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
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

export default hookADuck;
