# PokemonGoPvpHelper

Helper to build PvP teams in Pokémon GO.

Pick a league and one Pokémon, and it suggests two partners to complete the team. Pick two, and it
suggests the third that fills the gap best. Each team member comes with recommended moves, IVs, and
a role (lead, safe swap, closer), and the team gets its top 3 strengths and weaknesses against the
current meta.

## Status

Live at **https://jesusnm4.github.io/PokemonGoPvpHelper/**. Fully usable: pick a league, a team
style and one or two Pokémon to get suggested teams. Polish (shareable links, an IV checker) is
next. See [PLAN.md](PLAN.md) for the design and milestones.

| Milestone | State |
| --- | --- |
| 1. Scaffold | ✅ done |
| 2. Data pipeline (PvPoke snapshot) | ✅ done |
| 3. Core engine | ✅ done |
| 4. UI | ✅ done |
| 5. Polish | ⏳ next |

## Features

- Great (1500), Ultra (2500) and Master League
- Team styles: ABC (balanced), ABB, ABA, or any
- Pokémon search by name or nickname (shadow forms included), plus one-tap popular picks
- Pick one Pokémon to get two partners, or two to get the best third; the top 5 teams are listed
  with a team score out of 100
- Per Pokémon: role (lead, safe swap, closer), recommended fast and charged moves (Elite TM moves
  marked), rank-1 IVs with level and CP
- Per team: how many of the league's top 100 it has a winning answer to, top 3 strengths, top 3
  weaknesses, and any type that hits two members super-effectively
- Remembers your league, style and picks; light and dark theme; works on phones

## Running locally

No build step and no dependencies. Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## How it works

Teams are scored with a simplified battle simulator: every Pokémon at its rank-1 IVs with PvPoke's
recommended moveset, battling each of the top 100 Pokémon in the league with 0, 1 and 2 shields.
It agrees with PvPoke's own results on the winner about 84% of the time. Suggestions favour teams
whose members cover each other's losses and don't share weaknesses. Details in [PLAN.md](PLAN.md).

## Tests

Open `tests.html` in a browser, or run them headless with Node (no dependencies):

```sh
node scripts/run-tests.js            # add --verbose to list every check
```

The **Tests** GitHub Action runs them on every push, and the weekly data refresh runs them before
committing new data.

## Data

`data/` holds a trimmed snapshot of PvPoke's game master and overall rankings for Great, Ultra and
Master League. The **Update PvPoke data** GitHub Action refreshes it every Monday and commits only
when something changed. To run it now: **Actions → Update PvPoke data → Run workflow**. To refresh
locally (Python 3, no dependencies):

```sh
python3 scripts/update_data.py
```

The files are `.js` rather than `.json` so the page still works when opened straight from disk.

## Deploying

GitHub Pages: **Settings → Pages → Build and deployment → Deploy from a branch**, branch `main`,
folder `/ (root)`.

## Credits

Pokémon data and rankings come from [PvPoke](https://pvpoke.com)
([source](https://github.com/pvpoke/pvpoke), MIT License, © 2019 pvpoke). Pokémon and Pokémon GO
are trademarks of Nintendo, Creatures Inc., GAME FREAK and Niantic. This is an unofficial fan
project.
