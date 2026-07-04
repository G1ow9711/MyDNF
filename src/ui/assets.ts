import type { ClassId } from "../game/types";

const heroAssetByClass = {
  "ember-warden": "/assets/hero-ember-warden.png",
  "liuli-blademage": "/assets/hero-liuli-blademage.png",
  "ink-shadow-ranger": "/assets/hero-ink-shadow-ranger.png",
  "iron-forge-guardian": "/assets/hero-iron-forge-guardian.png"
} satisfies Record<ClassId, string>;

export function heroAssetForClass(classId: ClassId): string {
  return heroAssetByClass[classId];
}
