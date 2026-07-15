# Four-Class Dedicated Player Frame Atlas Design

## Goal

Replace Ink Shadow Ranger and Iron Forge Guardian whole-portrait combat motion with the same frame-driven runtime used by Ember Warden and Liuli Blademage. The combat model, baked weapon, hit reaction, and skill pose must change from one authoritative timeline.

## Asset Contract

- Every player class owns one square RGBA 4x4 atlas at `/assets/sprites/<class-id>-atlas.png`.
- Frames 0-3 are idle, 4-7 are locomotion, 8-11 are class action poses, and 12-15 are received-hit/death poses.
- Ink's mechanism crossbow and Iron's shield are baked into their atlas silhouettes. The legacy portrait and separate weapon layer remain as loading fallback only.
- All sixteen cells must contain non-empty, visually distinct silhouettes. Chroma backgrounds are removed before assets enter `public`.

## Runtime Priority

Frame resolution uses this order: special multi-atlas skill, defeat, received-hit lifecycle, grab, class skill, normal/air attack, jump/landing/dodge, run, idle. Numeric facing `-1` and textual facing `left` both mirror the sprite.

Ink action frames distinguish aimed shots, recoil/projectile release, evasive shots, and mechanism-net deployment. Iron action frames distinguish shield drive, impact, guard/counter, and ground slam. Existing CSS VFX remain separate from the baked model.

## Loading And Fallback

The frame stage becomes ready only after all four player atlases and all active monster atlases load. Before that point the old portrait remains visible. At ready, the matching player sprite is visible and the old portrait, weapon, and portrait trail are hidden for every supported class.

## Acceptance

- Static and fake-DOM tests cover exact asset registration, class atlas mapping, numeric facing, action frames, and fallback isolation.
- Real Edge input records idle, run, and attack frame changes for both new classes.
- Computed style proves the visible background uses the matching class atlas while fallback portrait and weapon are hidden.
- Desktop and narrow screenshots must show transparent silhouettes integrated into the Chinese ruin scene without rectangular backgrounds, duplicate weapons, or HUD occlusion.
