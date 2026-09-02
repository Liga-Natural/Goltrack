// Formation geometry lives in code, not in the database. A saved lineup stores
// only which player is in which slot id, so nudging a shape a few percent is a
// code change rather than a migration over every lineup ever saved.
//
// Coordinates are percentages of the pitch, origin at the top-left, with the
// team attacking upward: y=90 is the goalkeeper's own goal, y=8 is the
// opposition's. Percentages rather than pixels so the same numbers place the
// nodes correctly on a phone and on a projector.

export interface FormationSlot {
  id: string;
  /** The line a slot belongs to, used for labels and for colouring. */
  role: "GK" | "DEF" | "MID" | "FWD";
  label: string;
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  name: string;
  detail: string;
  slots: FormationSlot[];
}

const GK: FormationSlot = { id: "gk", role: "GK", label: "GK", x: 50, y: 90 };

function line(role: FormationSlot["role"], label: string, y: number, xs: number[], prefix: string): FormationSlot[] {
  return xs.map((x, i) => ({ id: `${prefix}${i + 1}`, role, label, x, y }));
}

export const FORMATIONS: Formation[] = [
  {
    id: "4-3-3",
    name: "4-3-3",
    detail: "Width from the wingers, three central midfielders.",
    slots: [
      GK,
      ...line("DEF", "DF", 72, [16, 38, 62, 84], "d"),
      ...line("MID", "MF", 48, [28, 50, 72], "m"),
      ...line("FWD", "FW", 22, [18, 50, 82], "f"),
    ],
  },
  {
    id: "4-2-3-1",
    name: "4-2-3-1",
    detail: "Double pivot behind a band of three, one striker.",
    slots: [
      GK,
      ...line("DEF", "DF", 72, [16, 38, 62, 84], "d"),
      ...line("MID", "DM", 56, [38, 62], "m"),
      ...line("MID", "AM", 34, [20, 50, 80], "a"),
      ...line("FWD", "ST", 16, [50], "f"),
    ],
  },
  {
    id: "3-5-2",
    name: "3-5-2",
    detail: "Back three, wing-backs pushed on, two up top.",
    slots: [
      GK,
      ...line("DEF", "DF", 74, [28, 50, 72], "d"),
      ...line("MID", "WB", 52, [10, 90], "w"),
      ...line("MID", "MF", 48, [32, 50, 68], "m"),
      ...line("FWD", "ST", 20, [38, 62], "f"),
    ],
  },
];

export function formationById(id: string): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];
}

export const ROLE_TINT: Record<FormationSlot["role"], string> = {
  GK: "rgb(245 158 11)",
  DEF: "rgb(14 165 233)",
  MID: "rgb(16 185 129)",
  FWD: "rgb(244 63 94)",
};

/**
 * Reads a stored slots map, dropping anything that no longer applies: a
 * player who has since left the squad, or a slot that does not exist in the
 * formation now selected. Without this a lineup saved as 4-3-3 would place
 * ghosts when reopened as 3-5-2.
 */
export function parseSlots(raw: string | null | undefined, formation: Formation, validPlayerIds: Set<string>): Record<string, string> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const slotIds = new Set(formation.slots.map((s) => s.id));
  const out: Record<string, string> = {};
  for (const [slotId, playerId] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof playerId !== "string") continue;
    if (!slotIds.has(slotId) || !validPlayerIds.has(playerId)) continue;
    out[slotId] = playerId;
  }
  return out;
}

/** A player may hold only one slot; the last assignment wins. */
export function assignSlot(
  slots: Record<string, string>,
  slotId: string,
  playerId: string | null
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(slots)) {
    if (k === slotId) continue;
    if (playerId && v === playerId) continue; // pull them out of wherever they were
    next[k] = v;
  }
  if (playerId) next[slotId] = playerId;
  return next;
}
