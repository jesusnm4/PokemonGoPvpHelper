# PokemonGoPvpHelper

Helper to build PvP teams in Pokémon GO.

Pick a league and one Pokémon, and it suggests two partners to complete the team. Pick two, and it
suggests the third that fills the gap best. Each team member comes with recommended moves, IVs, and
a role (lead, safe swap, closer), and the team gets its top 3 strengths and weaknesses against the
current meta.

## Status

🚧 Early development. The page skeleton is in place, and suggestions are not wired up yet. See
[PLAN.md](PLAN.md) for the design and milestones.

| Milestone | State |
| --- | --- |
| 1. Scaffold | ✅ done |
| 2. Data pipeline (PvPoke snapshot) | ⏳ next |
| 3. Core engine | — |
| 4. UI | — |
| 5. Polish | — |

## Features (planned)

- Great (1500), Ultra (2500) and Master League
- Team styles: ABC (balanced), ABB, ABA, or any
- "Suggest 2" from one Pokémon, or "suggest 1" from two
- Per Pokémon: recommended fast and charged moves, rank-1 IVs with level and CP, and role
- Per team: top 3 strengths and top 3 weaknesses against the top-ranked meta

## Running locally

No build step and no dependencies. Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploying

GitHub Pages: **Settings → Pages → Build and deployment → Deploy from a branch**, branch `main`,
folder `/ (root)`.

## Credits

Pokémon data and rankings come from [PvPoke](https://pvpoke.com)
([source](https://github.com/pvpoke/pvpoke), MIT License, © 2019 pvpoke). Pokémon and Pokémon GO
are trademarks of Nintendo, Creatures Inc., GAME FREAK and Niantic. This is an unofficial fan
project.
