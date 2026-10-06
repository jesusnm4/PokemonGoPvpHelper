# Plan

Pokémon GO PvP team builder. Give it one Pokémon and it suggests two partners, or give it two
and it suggests the third. Each team member comes with recommended moves, IVs, and a role, and the
team gets its top 3 strengths and top 3 weaknesses against the current meta.

## Constraints

- **Static site on GitHub Pages.** No backend and no build step: plain HTML, CSS and JS, deployed
  from `main` as-is. If a feature ever needs a server, we flag it before building it.
- **All three open leagues:** Great (1500 CP), Ultra (2500 CP), Master (no cap).

## Data: PvPoke snapshot

[PvPoke](https://github.com/pvpoke/pvpoke) (MIT) publishes its game data and rankings on GitHub:

| File | What we use |
| --- | --- |
| `src/data/gamemaster.min.json` | base stats, types, movepools, elite/legacy moves, move data, shadow forms |
| `src/data/rankings/all/overall/rankings-{1500,2500,10000}.json` | overall score, recommended moveset, role sub-scores (lead, closer, switch, charger, attacker, consistency), top 5 matchups and counters |

A scheduled GitHub Action (weekly, plus a manual trigger) runs `scripts/update_data.py`, which
downloads these, trims them to the fields we use, and commits the result to `data/` (about 1.2 MB,
~200 KB gzipped). The site reads only its own copy, so it never depends on a third-party site being
up. PvPoke is credited in the README and the page footer.

The snapshot is written as `.js` files that assign into `window.PvpData.raw`, loaded with script
tags, because browsers block `fetch()` of local files under `file://`. Megas (not allowed in GO
Battle League) and unreleased Pokémon are dropped.

Rank-1 IVs are computed by the engine from base stats and the CP multiplier table, not taken from
PvPoke's `defaultIVs`, which are not always the rank-1 spread.

## Engine

All in `js/engine.js`, pure and DOM-free.

1. **Meta:** the top 100 Pokémon in the chosen league's rankings. These are the threats a team
   must answer, weighted by rank: #1 counts 1, #25 counts 0.5, #100 counts 0.2.
2. **Stats:** every Pokémon is simulated at its rank-1 stat product IVs for the league (max level
   50; 15/15/15 at level 50 in Master League), with PvPoke's IV floors (traded legendaries 1,
   shadow legendaries 6, untradeable 10) and shadow attack ×1.2 / defense ×0.833.
3. **Matchups: a simplified battle simulator.** Each Pokémon uses PvPoke's recommended moveset,
   with the game's damage formula and turn timing. Policy: bait with the cheapest charged move
   while the opponent has shields, otherwise wait for the best damage-per-energy move unless a
   cheaper one knocks out or this side is about to faint; defenders always shield. Guaranteed stat
   buffs, Mimikyu's Disguise and Cramorant's Gulp Missile are modelled. The rating is PvPoke's
   battle rating (500 = even, 1000 = flawless win), averaged over 0-0, 1-1 and 2-2 shields.

   Checked against the top 5 wins and losses PvPoke lists for each of the top 100 Pokémon (its
   1-1 shield results): the simulator picks the same winner **84%** of the time in Great and Ultra
   League, with an average gap of 62–74 rating points. Known gaps: chance-based buffs, Aegislash
   and Morpeko form changes, and PvPoke's smarter shielding and baiting decisions.
4. **Team score:** for each threat, the chance the team's best answer wins (a smooth curve over
   the rating), weighted by the threat's rank; plus 0.2× the same for the second-best answer
   (a backup), minus 0.02 per extra member hit super-effectively by a shared weakness, plus a
   small bonus for the members' own PvPoke scores.
5. **Search:**
   - given 1 Pokémon: every pair from the top 150 (about 11k teams, under a second)
   - given 2 Pokémon: every candidate for the third slot

   GO Battle League allows one of each species, so partners sharing a Pokédex number with a pick
   (shadow forms included) are excluded. Results show the best 5 teams; with one pick, no
   partner appears in more than two of them so the list has variety.
6. **Team style:** the common PvP structures, named by how the lead (A), safe swap (B) and
   closer slots overlap in typing:
   - **ABC (balanced):** no two members share a type. This is the default.
   - **ABB:** the safe swap and the closer share a type; the lead shares none with them.
   - **ABA:** the lead and the closer share a type; the safe swap shares none with them.
   - **Any:** no structural constraint, best score wins.
7. **Roles:** each team is ordered lead / safe swap / closer by PvPoke's role sub-scores, choosing
   the order that fits the style with the highest combined role score.

## Output

For each team member:
- role (lead / safe swap / closer)
- recommended fast move and two charged moves, with move types
- recommended IVs: rank-1 stat product IVs, level, and CP for the league

For the team:
- a team score out of 100 (`scoreTeam` scaled by its maximum, so it follows the ranking order)
- how many of the top 100 threats it has a winning answer to
- top 3 strengths: the top-30 meta threats the team handles best, and which member answers each
- top 3 weaknesses: the top-30 meta threats it handles worst, plus any type that hits two or more
  members super-effectively

## Layout

Same layering as the author's InvestmentCalculator: every JS file is a plain IIFE on `window`, so
the site also works when opened over `file://`.

```
js/theme.js    light/dark theme, applied before first paint
js/data.js     loads data/*.js on demand
js/engine.js   pure logic: type chart, CP/IV math, battle simulator, team scoring. No DOM.
js/app.js      state, form wiring, rendering
tests.html     runs js/engine.test.js in the browser (scripts/run-tests.js runs it in Node)
```

## Milestones

1. **Scaffold:** page skeleton (league and style pickers, theme), README, this plan, Pages-ready
   layout. ✅
2. **Data pipeline:** Action that snapshots and trims PvPoke data, plus attribution. ✅
3. **Core engine:** type chart, CP/IV math, battle simulator, team scoring, team styles, with
   tests and a CI workflow that runs them. ✅
4. **UI:** Pokémon search with autocomplete (shadow forms included), "suggest 2" and "suggest 1"
   modes, team cards, strengths and weaknesses. ✅
5. **Polish:** mobile layout, shareable URL for a team, a "check my IVs" input that compares your
   Pokémon's IVs against rank 1.
6. **Later (optional):** closer simulator accuracy (chance buffs, Aegislash, smarter shielding),
   and limited-format cups.
