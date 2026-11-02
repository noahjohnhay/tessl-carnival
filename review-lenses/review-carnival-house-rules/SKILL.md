---
name: review-carnival-house-rules
description: Review a change to a carnival game for the house rules in AGENTS.md that keep every game part of the midway, registering through its folder's game.ts, reporting scores through recordScore from src/carnival, and drawing with theme and canvasFont. Use as one lens in a code review run on changes under src/games/.
---

# Review lens: Carnival House Rules

Review whether a changed game still follows house rules 1 to 3 in the root `AGENTS.md`, so it shows up on the midway, its scores reach the shared table, and it looks like every other booth.

## Scope

- **Registration** Whether each game folder under `src/games/<game-id>/` has a `game.ts` whose default export is its `CarnivalGame`, and whether that game's `id` matches the folder name. `src/games/index.ts` finds games from there, so a game registered any other way, or a change to `src/games/index.ts` or `src/midway/` made to fit one game in, breaks the rule.
- **Scores** Whether a game reports its score with `recordScore(game.id, score)` imported from `src/carnival`, once, when a round ends. A game that reads or writes `localStorage` or `sessionStorage` itself, keeps its own high score table, or records the same round twice or not at all, breaks the rule.
- **Theme** Whether a game takes its colours, fonts and sizes from `theme` and `canvasFont` in `src/carnival/theme.ts`. A hex, `rgb()`, `hsl()` or named colour literal, or a CSS font string such as `'bold 20px sans-serif'`, inside a game breaks the rule.

## Method

Read the root `AGENTS.md` for the current wording of house rules 1 to 3 before judging a change against them; it wins over this lens where they differ.

Only files under `src/games/` are in scope. `src/carnival/` is where the theme and the scores module are defined, so it holds the raw colours, font strings and storage calls that games must not, and `src/midway/palette.ts` has its own scenery colours built on the theme. Do not report code outside `src/games/`.

For a new or changed `game.ts`, find its default export and the `id` it carries, and compare that `id` with the folder name.

Trace every place the game's score is stored or shown back to `recordScore`, `bestScore` or `topScores` from `src/carnival`. Follow the round's end through the game's state functions and `start` to count how many times `recordScore` runs for one round, including when the player restarts or the cleanup function from `start` runs mid-round.

Search the changed game files for colour literals, font strings, `font =` assignments, `localStorage`, `sessionStorage` and `document.cookie`, then read each hit in context.

## Threshold

Report a change that breaks one of house rules 1 to 3 in shipped game code.

Do not report:

- Values derived from the theme, such as `theme.colors.accent`, a colour or size computed from a `theme` value, or a font built with `canvasFont`.
- Test data in `game.test.ts`, including literal colours, ids or scores used to set up or assert state.
- Anything lint, the type-checker or the tests already enforce, which `npm run check` runs in CI. A default export that is not a `CarnivalGame` fails the type-check, and `src/games/index.test.ts` fails when a folder's game is missing from the registry.
- House rules 4 to 7, which other lenses or people review.

## Reporting

- Name the rule by its number and title from `AGENTS.md`, the file and line, and the code that breaks it.
- State the consequence as it is in the code today, not as a guess. Read `src/games/index.ts` before stating what a registration problem does: today it throws when a folder's `game.ts` has no default export, or exports a game whose `id` differs from the folder name, so the midway fails to load for every game rather than one booth going missing. Where the consequence is only that the house rule is broken and nothing breaks for the player, say that plainly.
- For a score that bypasses `recordScore`, say what the player loses: a score missing from the booth card's best score and top scores, or recorded twice for one round.
- For a theme bypass, name the literal and the `theme` key or `canvasFont` call that replaces it. If no theme value fits, say so, because the fix is then a change to `src/carnival/theme.ts` in its own pull request, per house rule 7.
