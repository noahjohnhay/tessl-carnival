# Whack-a-Mole

Whack the moles as they pop up from the holes, before they duck back down.

## How to play

- Moles pop up from a grid of nine holes, one at a time, and drop back down after a moment.
- Click a mole while it's up to whack it.
- The round lasts 30 seconds. As the clock runs down, moles pop up more often and
  stay up for less time: from one every 1 second, up for 1.2 seconds, at the start,
  to one every 0.35 seconds, up for 0.55 seconds, at the end.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. A whack on an empty hole scores nothing, and
costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `popMole`, `whack`,
  `popInterval`, `upTime`) and the `whackAMole` entry, the default export the
  midway finds.
- `game.test.ts`: tests for the game logic.
