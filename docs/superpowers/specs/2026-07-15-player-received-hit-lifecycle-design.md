# Player Received-Hit Lifecycle Design

## Goal

Replace the ground-only quick-recover shortcut with an authoritative DNF-style player reaction chain. Strong monster attacks must visibly launch, drop, floor, and recover the player while gameplay input and animation use the same combat state.

## Authoritative States

Strong impacts use a separate received-hit state so player-controlled jumping remains unchanged:

- `hit`: 90 ms contact reaction after hitstop.
- `launched`: 180 ms rising reaction.
- `falling`: 220 ms descending reaction.
- `downed`: 520 ms floor state.
- `natural-rise`: 360 ms authored get-up motion.
- `quick-rise`: 260 ms authored get-up motion triggered by `C`.
- `grounded`: normal control.

Enemy attacks declare an explicit `light-hit`, `launch`, `bind`, `pull`, or `none` reaction independently from damage, feedback art, and knockback tuning. `launch` starts the timeline only for a living, non-armored player. Heavy arena hazards such as Forge Collapse explicitly use the same launch lifecycle. Light hits retain the existing hurt-lock reaction. Defeat always takes priority over recovery.

## Recovery Rules

- Quick recovery is unavailable while launched or falling.
- The `C` window opens on floor contact and remains open for 420 ms.
- A valid quick recovery grants 520 ms invulnerability and clears the remaining knockdown timeline.
- Missing the input starts natural rise after the 520 ms downed interval.
- Natural rise grants invulnerability from rise start through 180 ms after the authored 360 ms motion.
- Hitstop shifts every active received-hit timestamp so visual and gameplay phases remain frozen together.

## Input Contract

While the received-hit state is not `grounded`:

- Movement, dash, attacks, skills, jump, backstep, and consumables are rejected.
- `C` is accepted only in the valid `downed` quick-recovery window.
- Buffered attacks and active skill movement are cleared by the strong impact.

## Presentation Contract

- Combat DOM exposes the authoritative received-hit state and phase timestamps.
- Sprite frames use impact frames 12-13, floor frames 14-15, then recovery frames 12 and 0.
- Actor transforms provide rising, falling, floor contact, and stand-up body motion without moving the logical lane coordinate.
- Landing dust and recovery aura are driven by the same state, not by an independent timer.
- Recovery audio is emitted once for floor contact and once for quick or natural rise.

## Acceptance

- Core tests prove all phase boundaries, input locks, quick recovery, natural recovery, light-hit exclusion, and hitstop-safe timing.
- UI tests prove DOM state, sprite-frame state, VFX, and audio hooks.
- A real browser route receives a real heavy monster hit, observes every phase, presses physical `C` only after floor contact, and verifies invulnerability plus restored control.
