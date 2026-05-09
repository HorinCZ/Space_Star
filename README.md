# Lunar Fleet Command

Lunar Fleet Command is a browser-based 2D roguelite sci-fi fleet management prototype. The player commands Lunar Base 1, buys and renames ships, hires crew by department, assigns them to ships, sends ships on multi-phase missions, and tries to grow a fleet while managing damage, energy, injuries, XP, and credits.

Public version: https://horincz.github.io/Space_Star/

## Project Status

This is an early playable prototype. It runs as a static website, so it does not need a server, database, account system, or installed game engine.

Current focus:

- Fleet and crew management
- Multi-phase mission runs
- Local browser save
- Export/import save backup
- Visual ship, crew, enemy, and mission placeholders
- Simple sci-fi sound effects with a sound toggle

## How To Play

1. Start at Lunar Base 1 with 1000 credits, 2 docks, no ships, and no crew.
2. Buy ships in Shipyard.
3. Hire personnel in Personnel.
4. Assign crew to a selected ship in Station Ops.
5. Run missions from Missions.
6. Return to base, repair hull, restore shields, recharge energy, heal resting crew, level crew, and expand the fleet.

## Local Save And Backup

The game saves automatically in the browser with `localStorage`.

- Save key: `lunar-fleet-command-save-v2`
- Save version: `2`
- Export creates a text backup of the current save.
- Import reads that text backup and restores the save if the save version and structure are valid.

Important: local browser saves are tied to the browser and device. For backup, use Export and keep the exported text somewhere safe.

## Running Locally

Open `index.html` directly in a browser, or serve the folder with a simple local web server.

The current project has no build step and no package install step.

## File Structure

- `index.html` contains the page layout and connects the scripts/styles.
- `styles.css` contains the main visual style.
- `sections.css` contains additional section/layout styling.
- `data.js` contains tuning data: ships, missions, departments, ranks, enemies, names, and core constants.
- `game.js` contains the game state, save system, actions, mission flow, formulas, rendering, portraits, and sounds.
- `feedback.js` contains UI feedback helpers.
- `console-status.js` contains top status panel behavior.

## Starting State

New game state:

- Credits: `1000`
- Dock limit: `2`
- Ships: none
- Crew: none
- Calendar: `1.5.2326`
- Sound: enabled
- Hall of Fame: empty

## Core Constants

| Constant | Value |
| --- | ---: |
| Cadet hire cost | 100 credits |
| Crew max HP | 3 |
| Repair cost | 40 credits per missing hull |
| Recharge cost | 10 credits per missing energy cell |
| Calendar start | 1.5.2326 |
| Calendar month length | 30 days |

## Departments And Starting Skills

Every hired crew member starts as a Cadet with XP 0, HP 3/3, and a department-based skill block.

| Department | Command | Engineering | Science | Medical | Tactical | Operations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Command | 5 | 2 | 2 | 1 | 2 | 3 |
| Engineering | 1 | 5 | 2 | 1 | 2 | 3 |
| Science | 1 | 2 | 5 | 2 | 1 | 3 |
| Medical | 1 | 2 | 3 | 5 | 1 | 2 |
| Tactical | 2 | 2 | 1 | 1 | 5 | 3 |
| Operations | 2 | 3 | 2 | 1 | 2 | 5 |

## Rank Ladder

XP is not reset when a crew member levels up.

| Level | XP Needed | Rank | Code |
| ---: | ---: | --- | --- |
| 0 | 0 | Cadet | CDT |
| 1 | 10 | Crewman | CRW |
| 2 | 30 | Specialist | SPC |
| 3 | 80 | Ensign | ENS |
| 4 | 160 | Lieutenant JG | LTJG |
| 5 | 280 | Lieutenant | LT |
| 6 | 450 | Commander | CDR |
| 7 | 700 | Captain | CPT |
| 8 | 1000 | Commodore | CMD |

When a crew member reaches a new rank, they gain pending skill points equal to the number of levels gained. Each skill point increases one chosen skill by `+1`.

Current rule: a crew member with unspent pending skill points does not gain more XP until the upgrade is chosen.

## Ship Classes

| Ship Class | Cost | Crew | Hull | Shields | Energy | Sensors | Weapons | Range |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Aster-5 Scout | 500 | 5 | 12 | 7 | 10 | 8 | 3 | 5 |
| Vega-7 Cutter | 850 | 7 | 16 | 9 | 11 | 7 | 6 | 6 |
| Orion-9 Surveyor | 1300 | 9 | 18 | 10 | 12 | 11 | 4 | 8 |
| Helios-12 Frigate | 2100 | 12 | 26 | 14 | 13 | 8 | 12 | 8 |
| Atlas-16 Cruiser | 3600 | 16 | 38 | 18 | 15 | 12 | 16 | 12 |

Ship rules:

- Buying a ship costs its listed price.
- Selling a ship refunds `floor(ship cost / 2)`.
- Selling a ship unassigns its crew back to base.
- Ships away on mission cannot be repaired, recharged, shield-restored, renamed, sold, or changed normally.
- A ship with hull `0` cannot launch.

## Missions

| Mission | Risk | Base Reward | Needed Skill | Ship Stat Used |
| --- | ---: | ---: | --- | --- |
| Repair Relay Station | 18 | 190 | Engineering | Hull |
| Map Spatial Anomaly | 28 | 280 | Science | Sensors |
| Escort Supply Convoy | 36 | 360 | Tactical | Weapons |
| Emergency Triage Run | 24 | 250 | Medical | Range |

## Universal Roll Formula

Most mission checks use the same roll system:

```text
chance = clamp(48 + power * 4 - difficulty, 12, 92)
roll = random integer from 1 to 100
success = roll <= chance
critical = roll <= max(5, floor(chance / 5))
```

This means:

- Every check has at least a 12% success chance.
- Every check has at most a 92% success chance.
- Critical success is roughly one fifth of the success chance, with a minimum critical range of 5%.

## Crew Power

Crew power is the sum of the chosen skill across all living crew assigned to the ship.

```text
crewPower(ship, skill) = sum(skill value for assigned crew with HP > 0)
```

Crew with 0 HP are not counted. Dead crew are removed and placed in the Hall of Fame.

## Mission Chance Display

The percentage shown on mission cards is an estimate for the mission objective, not the full mission run.

```text
departmentPower = sum crew skill matching the mission need
commandPower = sum Command skill on the ship
commandSupport = floor(commandPower / 3)
shipPower = selected ship stat required by the mission
chance = clamp(40 + departmentPower + commandSupport + shipPower - mission risk, 18, 92)
```

## Mission Flow

A mission run has these phases:

1. Launch
2. Scan
3. Approach
4. Encounter, if an enemy appears
5. Objective
6. Return

Every mission action advances the calendar by 1 day. Launch and final return/abort/loss also advance the calendar by 1 day.

## Launch

To launch:

- The selected ship must exist.
- The ship must not already be away.
- Hull must be above 0.
- Energy must be at least 1.
- At least one crew member must be assigned.
- At least one assigned crew member must have HP above 0.

On launch:

```text
calendar +1 day
ship missions +1
each assigned crew missions +1
ship energy -1
mission phase = scan
scan progress = 0
objective progress = 0
banked reward = 0
```

## Scan Phase

Scan is used to find the mission location.

Cost:

```text
1 energy per scan
calendar +1 day
```

Scan power:

```text
power = crewPower(Operations) + floor(ship sensors / 2)
difficulty = mission risk
```

Scan result:

- Critical success: scan progress `+2`
- Normal success: scan progress `+1`
- Failure with hazard: 18% chance to lose 1 shield damage and risk crew injury
- Failure without hazard: energy is spent, no progress

Scan injury rule on hazard:

```text
20% chance to injure one random living assigned crew by 1 HP
```

Ambush rule after scan:

```text
12% chance after a scan to trigger an enemy encounter
Only happens if scan progress is still below 3
```

When scan progress reaches `3`, the mission advances to Approach.

## Approach Phase

Approach decides what happens while moving from the scan location to the mission site.

```text
calendar +1 day
eventRoll = random number from 0 to 1
```

Results:

- `eventRoll < 0.28`: enemy encounter
- `0.28 <= eventRoll < 0.50`: debris field check
- `eventRoll >= 0.50`: clean approach

Debris field check:

```text
power = crewPower(Tactical) + ship range
difficulty = mission risk
```

On debris failure:

```text
ship takes 2 shield damage
25% chance to injure one random living assigned crew by 1 HP
```

After approach, if the ship still has hull above 0, the mission advances to Objective.

## Enemy Generation

When an encounter starts, one enemy type is chosen randomly.

Base enemy contacts:

| Enemy | Base Hull | Base Damage | Base Reward | Difficulty |
| --- | ---: | ---: | ---: | ---: |
| Raider Skiff | 4 | 1 | 80 | 18 |
| Corsair Cutter | 7 | 2 | 130 | 28 |
| Automated Drone | 5 | 1 | 100 | 24 |

Mission risk modifies enemy stats:

```text
riskBonus = floor(mission risk / 12)
enemy hull = base hull + riskBonus
enemy damage = base damage + floor(riskBonus / 2)
enemy reward = base reward + riskBonus * 12
```

## Combat Actions

### Attack

```text
calendar +1 day
power = crewPower(Tactical) + ship weapons
difficulty = enemy difficulty
```

On hit:

```text
damage = max(2, ceil(ship weapons / 2))
critical hit adds +2 damage
```

If the enemy reaches 0 hull:

```text
banked reward += enemy reward
phase = objective
```

If the enemy survives, it attacks back.

### Evade

```text
calendar +1 day
power = crewPower(Operations) + ship range
difficulty = enemy difficulty + 10
```

On success:

```text
enemy is removed
phase = objective
```

On failure, the enemy attacks.

### Defend

```text
calendar +1 day
energy -1
incoming enemy damage is reduced by 1
minimum incoming damage is still 1
```

Defend immediately triggers the enemy attack.

### Retreat

```text
calendar +1 day
power = crewPower(Operations) + ship range
difficulty = enemy difficulty + 4, or 24 if no enemy exists
```

On success, the mission ends as retreated. On failure, the enemy attacks if one exists.

## Enemy Attack

```text
damage = max(1, enemy damage + random integer from 0 to 2 - defend reduction)
```

Damage first hits shields, then hull.

Crew injury chance from enemy attack:

- 45% if the ship survives
- 75% if the ship hull reaches 0

If hull reaches 0, the mission is lost.

## Ship Damage

All shield damage is absorbed by shields first. Any remaining damage goes to hull.

```text
remaining = incoming shield damage
absorbed = min(current shields, remaining)
current shields -= absorbed
remaining -= absorbed
hull -= remaining + direct hull damage
hull cannot go below 0
```

## Objective Phase

Objective progress must reach `3` to complete the mission objective.

Objective power:

```text
power = crewPower(required mission skill) + floor(crewPower(Command) / 3)
```

There are three objective modes.

### Careful Work

```text
energy cost = 0
difficulty = mission risk - 4
success progress = +1
success complication chance = 12%
failure injury chance = 25%
failure damage = 1 shield damage, but only 35% of failed careful attempts cause damage
```

Careful Work is slower and safer.

### Attempt Objective

```text
energy cost = 1
difficulty = mission risk
success progress = +1, or +2 on critical success
success complication chance = 24%, or 12% on critical success
failure injury chance = 40%
failure damage = 1 shield damage
```

Attempt Objective is the normal balanced option.

### Push Hard

```text
energy cost = 2
difficulty = mission risk + 8
success progress = +2
success complication chance = 45%, or 25% on critical success
failure injury chance = 60%
failure damage = 2 shield damage
```

Push Hard is faster but much riskier.

When objective progress reaches `3`, the ship can return to Lunar Base One.

## Mission Completion

Successful return:

```text
calendar +1 day
reward = mission base reward + banked enemy reward + random credits from 0 to 69
assigned crew gain 2 XP each
resting crew at base heal 1 HP
```

Failure, abort, retreat, or loss:

```text
calendar +1 day
assigned crew gain 1 XP each
resting crew at base heal 1 HP
```

## Crew Injury, Death, And Healing

When an injury check succeeds:

```text
one random living assigned crew loses 1 HP
```

If crew HP reaches 0:

- The crew member is removed from active crew.
- A Hall of Fame entry is created.
- The record includes name, rank, level, XP, missions, department, cause of death, and date.

If all assigned crew are dead or at 0 HP during a mission, the mission is lost.

Rest healing:

```text
After a mission ends, every crew member not assigned to the returning/active ship heals 1 HP.
```

This means injured crew must stay at base while another ship flies missions to recover over time.

## Station Service

Only ships at Lunar Base One can be serviced.

Repair:

```text
missingHull = max hull - current hull
cost = missingHull * 40
current hull = max hull
```

Recharge:

```text
missingEnergy = max energy - current energy
cost = missingEnergy * 10
current energy = max energy
```

Restore shields:

```text
cost = 0
current shields = max shields
```

## UI Feedback

The interface uses:

- Button flash feedback for successful clicks
- Toast messages for recent actions
- Command log entries for the latest events
- Colored HP and XP states
- Energy batteries with green, orange, and red states
- Department colors for crew identity
- A sound toggle for sci-fi UI/action sounds

## Deployment

The game is suitable for GitHub Pages because it is a static web project.

Recommended GitHub Pages setup:

- Source branch: `main`
- Folder: `/root`
- Entry file: `index.html`

After pushing changes to GitHub, GitHub Pages updates the public site automatically after a short delay.

## Design Notes

The game is intentionally data-driven. Most balance changes can be made in `data.js` by adjusting ship stats, mission risk/reward, enemy stats, costs, departments, and ranks.

The formulas live in `game.js`. If a mechanic changes, update this README so the documentation remains the source of truth for design and balancing.
