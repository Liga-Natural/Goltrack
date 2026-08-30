import type { Format } from "./models";

// One place for the human-readable name of a competition format. This was a
// pair of inline ternaries that each assumed only two formats existed, so
// adding SINGLE_ELIM would silently have labelled it "Groups + knockout" in
// both the dashboard list and the tournament header.
const LABELS: Record<Format, string> = {
  GROUPS_KNOCKOUT: "Groups + knockout",
  SINGLE_ELIM: "Single elimination",
  ROUND_ROBIN: "League table",
};

export function formatLabel(format: string): string {
  return LABELS[format as Format] ?? LABELS.GROUPS_KNOCKOUT;
}
