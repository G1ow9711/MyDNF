# DNF Crowd Room Design

## Problem

Normal rooms contain two monsters and elite rooms contain three. Even with pursuit, hit reactions, and scrolling, these encounters read as a sequence of isolated duels. Raising the count alone is unsafe because every enemy currently starts attacks independently and can produce unavoidable chained hurt locks.

## Contract

- Normal rooms spawn five trash monsters.
- Elite rooms spawn two elites and two trash monsters.
- Boss rooms remain one Boss; scripted Boss summons remain unchanged.
- Non-Boss actors use an authored five-point formation across three lanes and multiple depths.
- At most two non-defeated enemies may own active attack timelines at once.
- Active timelines are never canceled to enforce the cap. Arbitration applies only when a new windup would start.
- Waiting enemies continue pursuit and become eligible as soon as a slot opens.
- Normal attacks retain their single-target identity. Existing area skills retain their authored multi-target caps and become the efficient crowd answer.
- Every enemy keeps its own HP, reactions, hitstop, damage number, death choreography, and floor-space position.

## Acceptance

1. Core tests prove five normal-room enemies and four elite-room enemies with unique three-lane positions.
2. Core tests prove only two new windups can coexist while later enemies start after a slot opens.
3. Rendering proves five distinct mounted actors and no duplicated ids.
4. Real keyboard play proves all five actors render, pursue, and animate while no more than two attack windups/active timelines coexist.
5. A real area-skill key press damages at least three enemies in one authored hit phase with separate reactions and damage numbers.
6. The room remains clearable and the existing floor-loot/gate flow still works.

## Non-goals

- No health reduction to compensate for population.
- No removal of enemy skills, hitstun, or damage.
- No synthetic browser reducer calls for acceptance.
- No changes to Boss phase scripts or summon counts.
