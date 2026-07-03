export interface CombatInput {
  moveX?: number;
  moveY?: number;
  light?: boolean;
  heavy?: boolean;
  dash?: boolean;
  skillId?: string;
}

function axis(positive: boolean, negative: boolean): number {
  if (positive === negative) {
    return 0;
  }

  return positive ? 1 : -1;
}

export function mapKeyboardToCombatInput(keys: ReadonlySet<string>): CombatInput {
  const input: CombatInput = {
    moveX: axis(keys.has("KeyD"), keys.has("KeyA")),
    moveY: axis(keys.has("KeyS"), keys.has("KeyW"))
  };

  if (keys.has("KeyJ")) {
    input.light = true;
  }

  if (keys.has("KeyK")) {
    input.heavy = true;
  }

  if (keys.has("ShiftLeft") || keys.has("ShiftRight")) {
    input.dash = true;
  }

  const skillKeys: Array<[string, string]> = [
    ["KeyU", "anvil-crash"],
    ["KeyI", "heat-bloom"],
    ["KeyO", "meteor-knuckle"],
    ["KeyL", "furnace-step"],
    ["Space", "spark-combo"]
  ];
  const matchedSkill = skillKeys.find(([code]) => keys.has(code));

  if (matchedSkill) {
    input.skillId = matchedSkill[1];
  }

  return input;
}
