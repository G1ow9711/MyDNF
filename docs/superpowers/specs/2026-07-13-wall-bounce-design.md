# Task 211 Wall Bounce Design

## Goal

Replace static wall clamping with a visible, once-per-combo wall collision reaction for live airborne enemies.

## Rules

- A live airborne enemy whose visible model edge crosses the left or right arena boundary during authored knockback triggers wall bounce.
- Wall bounce is available once per enemy during one active combo. Later wall collisions in that combo clamp normally without another bounce.
- A new combo after expiry, or a completed downed stand, restores eligibility.
- Super-armored enemies cannot wall bounce. Broken-armor elites and bosses follow the same once-per-combo limit.
- A bounce records side, start time, end time, and count; extends airborne control briefly; and blocks enemy actions through existing airborne rules.
- Hitstop shifts wall-bounce timing so model motion and combat time remain synchronized.

## Feedback

- Hit events expose `wallBounce` and `wallBounceSide`.
- Enemy actors expose mounted wall-bounce state and count.
- The model compresses into the wall then recoils inward while a wall-crack layer flashes at contact.
- Damage feedback adds `撞墙`; contact plays an authored `wall-bounce-confirm` sound.

## Acceptance

- Core tests prove right and left collisions, once-per-combo suppression, new-combo reset, and super-armor exclusion.
- Mounted tests prove event labels, actor state, model motion, wall crack, and audio.
- Real keyboard input lures and knocks a live monster into the right wall, proving event, animation, and sound without combat-state mutation; core state proves same-combo suppression.
