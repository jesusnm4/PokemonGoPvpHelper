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
| `src/data/gamemaster.min.json` | base stats, types, movepools, move data, shadow forms, rank-1 IVs per league (`defaultIVs.cp1500` = `[level, atk, def, hp]`) |
| `src/data/rankings/all/overall/rankings-{1500,2500,10000}.json` | overall score, recommended moveset, role sub-scores (lead, closer, switch, charger, attacker, consistency), top 5 matchups and counters |

A scheduled GitHub Action (weekly, plus a manual trigger) downloads these, trims them to the fields
we use, and commits the result to `data/`. The site reads only its own copy, so it never depends on
a third-party site being up. PvPoke is credited in the README and the page footer.

## Engine

1. **Meta:** the top ~100 Pokémon in the chosen league's rankings, weighted by PvPoke score. These
   are the threats a team must answer.
2. **Matchup estimate (v1, type-based):** for each team member against each threat, combine
   - offense: the best effectiveness × STAB of its recommended moves against the threat's types
   - defense: how hard the threat's recommended moves hit it
   - bulk and power: both sides' league-capped stats at their rank-1 IVs

   PvPoke's own top 5 matchups and counters override the estimate where they apply. This is a
   heuristic, not a battle simulator.
3. **Team score:** meta coverage (for each threat, the team's best answer, weighted by the
   threat's score), minus a penalty for shared weaknesses (a type that hits two or more members
   super-effectively).
4. **Search:**
   - given 1 Pokémon: try every pair from the top ~150 (about 11k teams, instant in the browser)
   - given 2 Pokémon: score every candidate for the third slot

   Show the best few teams, not just one.
5. **Team style:** the common PvP structures, named by how the lead (A), safe swap (B) and
   closer slots overlap in typing:
   - **ABC (balanced):** three distinct typings and roles. This is the default.
   - **ABB:** the safe swap and the closer share a type, doubling down against what beats the lead.
   - **ABA:** the lead and the closer share a type, giving two answers to the most common threat.
   - **Any:** no structural constraint, best score wins.
6. **Roles:** each member is placed as lead, safe swap, or closer using PvPoke's role sub-scores.

## Output

For each team member:
- role (lead / safe swap / closer)
- recommended fast move and two charged moves, with move types
- recommended IVs: rank-1 stat product IVs, level, and CP for the league

For the team:
- top 3 strengths: meta threats the team handles best
- top 3 weaknesses: meta threats it handles worst, plus any shared type weakness

## Layout

Same layering as the author's InvestmentCalculator: every JS file is a plain IIFE on `window`, so
the site also works when opened over `file://`.

```
js/theme.js    light/dark theme, applied before first paint
js/data.js     loads data/*.json
js/engine.js   pure logic: type chart, CP/IV math, matchups, team scoring. No DOM.
js/app.js      state, form wiring, rendering
tests.html     runs js/engine.test.js in the browser
```

## Milestones

1. **Scaffold:** page skeleton (league and style pickers, theme), README, this plan, Pages-ready
   layout. ✅
2. **Data pipeline:** Action that snapshots and trims PvPoke data, plus attribution.
3. **Core engine:** type chart, CP/IV math, matchup estimate, team scoring, team styles, with tests.
4. **UI:** Pokémon search with autocomplete (shadow forms included), "suggest 2" and "suggest 1"
   modes, team cards, strengths and weaknesses.
5. **Polish:** mobile layout, shareable URL for a team, a "check my IVs" input that compares your
   Pokémon's IVs against rank 1.
6. **Later (optional):** a real battle simulator for matchups, and limited-format cups.
