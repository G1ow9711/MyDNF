# Task 212 Grab And Throw Synchronization Design

## Goal

Turn Iron Forge Guardian's `iron-palm` from a single generic jab into an authoritative DNF-style close-range grab and throw. Player and target must visibly share one action timeline; CSS-only imitation is not accepted.

## Rules

- `iron-palm` attempts one front-facing grab at its authored contact frame.
- A live trash target that is not downed and not protected by super armor is caught.
- Elite targets, bosses, and active super armor resist the grab. Resistance never snaps or teleports the target. Downed targets remain invalid unless a skill explicitly carries the existing slam/OTG tag.
- A successful catch deals no damage. It interrupts the target, anchors it in front of the player, and schedules one throw against the same target.
- The throw deals the skill's damage, launches the target through a short authored arc, then leaves it knocked down.
- A resisted grab deals reduced strike damage so the skill remains useful against ungrabbable enemies, but it does not apply grab control.
- Catch hitstop shifts catch/throw timers and the queued throw effect together. Animation cannot advance while combat is frozen.
- A caught target cannot pursue or attack before release. The player remains action-locked through the complete throw.

## Presentation

- Player phases: reach, clamp, lift, pivot, release, recovery.
- Target phases: caught clamp, lifted hold, thrown arc, ground impact, downed recovery.
- Mounted state exposes grab result, target id, phase, timing, and facing.
- Catch, throw, and resistance use distinct labels, VFX cues, impact classes, and authored SFX.
- Visible frame-atlas actors receive the same movement as fallback art; no static portrait may appear to float through the sequence.

## Acceptance

- Core tests prove successful catch, same-target throw, knockdown, immunity, no teleport on resist, and hitstop-safe timing.
- Render tests prove mounted player/target phases and distinct feedback.
- Real Chromium proves player clamp, target hold/throw, and throw-impact animations have authored durations.
- Real keyboard play presses `J` as Iron Forge Guardian against a live trash target and records catch plus throw from the same target.
- Real keyboard play presses `J` against an elite or boss and records resistance without a grabbed target.
