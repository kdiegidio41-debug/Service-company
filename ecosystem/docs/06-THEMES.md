# Themes

The map, the roster and the docs all render from one file: `world/farm.world.json`. The theme is a **name
overlay** applied on top of it — same zones, same stations, same roles, same wiring, different vocabulary.

Two ship in this repo:

| Theme | File | Feel |
| --- | --- | --- |
| **The Steading** (default) | `world/farm.world.json` | A working farm. Seasons, crews, weather, things that grow. |
| **The Vessel** | `world/starship.theme.json` | A long-haul ship. Decks, watches, systems, things that must not fail. |

---

## Why a farm was the default

Three reasons, in order of how much they mattered:

1. **A farm has real parallelism that is obviously independent.** Rows in a field do not depend on each other,
   and everyone already knows that. On a ship, systems are coupled by design — which makes it a worse metaphor
   for the thing this architecture most needs people to understand.
2. **A farm has a natural memory story.** Sowing, harvest, storage, seed kept back for next season, compost
   made from what failed. Those map onto working / episodic / semantic / procedural memory and the failure
   loop without any strain.
3. **A farm is legibly boring in the right places.** Fences, gates, ledgers and weighing are unglamorous and
   obviously necessary, which is exactly the posture you want around security and cost.

**Where the ship is better:** if the system is going to be mostly long-running stateful services with hard
safety interlocks and very little fan-out work, the ship's vocabulary fits better. Watches, alarms, airlocks
and sealed compartments carry more weight than barns and fences do.

---

## Zone mapping

| Farm | Ship | Domain |
| --- | --- | --- |
| The Farmhouse | **The Bridge** | Orchestration |
| The Fields | **The Processing Bays** | Execution |
| The Barn | **The Habitat Ring** | Long-running & stateful agents |
| The Silo Row | **The Data Core** | Memory & knowledge |
| The Toolshed | **The Fabrication Bay** | Tools & integrations |
| The Greenhouse | **The Proving Deck** | R&D and evaluation |
| The Watchtower | **The Sensor Array** | Observability |
| The Gatehouse | **The Airlock** | Security & the outside world |

The full station and role mapping is in `world/starship.theme.json`.

---

## Applying a theme

```bash
node tools/apply-theme.mjs starship   # writes world/active.world.json + rebuilds the map
node tools/apply-theme.mjs farm       # back to the default
```

The overlay only renames. Geometry, wiring, charters, duties, tasks and failure modes are untouched — which
is the point: if switching themes changed behaviour, the theme would be architecture, and it is not.

---

## Adding your own

A theme file needs three keys:

```jsonc
{
  "id": "vessel",
  "name": "The Vessel",
  "tagline": "...",
  "palette": { "...": "overrides for zone colours, optional" },
  "zones":    { "farmhouse": { "name": "The Bridge", "subtitle": "Command Deck" } },
  "stations": { "fh-house":  { "name": "The Captain's Chair" } },
  "roles":    { "r-farmer":  { "name": "The Captain", "title": "Prime Orchestrator" } }
}
```

Anything you leave out keeps its farm name. A partial theme is valid — start with the zones and fill in the
rest when the names start bothering you.

**One rule:** a theme may rename and recolour. It may not add, remove or re-wire anything. The moment a theme
wants a station the other theme does not have, that is a change to `farm.world.json`, not to the theme.
