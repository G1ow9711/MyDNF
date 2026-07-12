# DNF Crowd Room Implementation Plan

1. Add RED combat tests for room counts, formation uniqueness, and two-slot attack arbitration.
2. Add RED render and browser-state coverage for five live actors and concurrent attack count.
3. Introduce authored non-Boss formation coordinates and expanded room profile matrices.
4. Add deterministic attack-slot arbitration inside `advanceEnemyAttacks()` without canceling active attacks.
5. Add a real-keyboard crowd route that casts an existing area skill and records multi-target HP/reaction/damage evidence.
6. Run focused core/app/browser checks, full non-browser regression, production build, and visual inspection.
7. Update records, create a Chinese commit, and push `feature/vertical-slice`.
