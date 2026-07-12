# Task 210 Airborne Protection And OTG Design

## Goal

Make airborne and downed combat follow the existing DNF-inspired combat contract: repeated air hits decay instead of extending forever, and only slam skills can hit a downed target.

## Rules

- Each non-armored hit that launches or keeps a live target airborne increments `juggleCount`.
- Hits one through three use normal airborne extension. Hit four and later set `juggleProtected` and use a short extension, so the target must fall.
- Juggle count survives the fall and resets only when the target finishes its downed recovery and stands.
- A downed target is excluded from every player hitbox unless the hitbox has the `slam` action tag.
- A slam against a downed target is an `otgHit`, deals normal damage, preserves downed state, and refreshes a short downed window.
- Boss super armor keeps its existing immunity and does not build artificial juggle count.

## Feedback

- Hit events expose `juggleCount`, `juggleProtected`, and `otgHit`.
- Enemy actors expose mounted juggle count/protection state.
- Protected air hits show `浮空保护`; downed slam hits show `扫地`.
- Both states receive distinct authored confirmation sounds and impact classes.

## Acceptance

- Core tests prove the fourth air hit has shorter extension and eventually falls.
- Core tests prove normal attacks miss downed targets while Anvil Crash lands and keeps them downed.
- Real keyboard input launches a live monster, reaches protection through follow-up hits, waits for knockdown, then lands Anvil Crash as a mounted OTG event.
- Existing sword dance, normal combo, crowd, Boss, and natural enemy routes remain valid.
