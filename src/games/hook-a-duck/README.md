# Hook a Duck

Rubber ducks float round a stream. Hook one as it passes and score the number on
its base.

## How to play

- Move the mouse left and right to slide the hook along the rod.
- Click to cast: the hook drops into the stream and comes back up, with a duck
  if it caught one on the way down.
- You have 10 casts. The round ends when the last cast is back up.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and hooking it scores that number. The eight
ducks round the loop are numbered 10, 5, 25, 5, 10, 5, 50 and 5. A cast that
hooks nothing scores 0. A hooked duck goes back in the stream when the hook is
up, so it can be caught again.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `aim`, `cast`, `step`, `isHooked`,
  `duckPosition`) and the `hookADuck` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
