# Ghost Shooting Gallery

Ghosts float across three rows of the gallery, bobbing as they go. Zap as many
as you can before your shots run out.

## How to play

- Move the mouse to aim the crosshair, and click to zap the spot under it.
- You have 12 shots, and a miss uses one too. The round ends on your last shot.
- A zapped ghost vanishes in a poof and floats back in from the start of its row.
- Click again on the game over screen to play another round.

## Scoring

Each ghost scores 10 points for every 50 px/s of speed, rounded up:

| Row    | Speed    | Points |
| ------ | -------- | ------ |
| Top    | 200 px/s | 40     |
| Middle | 130 px/s | 30     |
| Bottom | 70 px/s  | 20     |

The best possible round is 12 top-row ghosts, for 480 points. Your final score
is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `zap`, `step`, `scoreForHit`,
  `isHit`, `ghostY`) and the `ghostShootingGallery` entry, the default export
  the midway finds.
- `game.test.ts`: tests for the game logic.
