// The pricing rules engine. Pure functions over plain values: what a club is
// charged, what the platform takes, and when the balance falls due are all
// decided here so the checkout summary, the generated invoice and the admin
// revenue panel cannot quote three different numbers for the same event.

export type DepositMode = "FULL" | "DEPOSIT";
export type DepositBasis = "FLAT" | "PERCENT";
export type PlatformFeeMode = "PERCENT" | "FLAT" | "TIERED";

export interface PaymentRules {
  depositMode: DepositMode;
  depositBasis: DepositBasis;
  depositCents: number;
  depositPercent: number;
  /** Days after registration that the remaining balance falls due. */
  balanceDueDays: number;

  earlyBirdUntil: string | null;
  earlyBirdDiscountCents: number;
  lateFeeAfter: string | null;
  lateFeeCents: number;

  /** Club discount applies from this many teams upward. 0 disables it. */
  multiTeamMinTeams: number;
  multiTeamPercent: number;

  acceptCheck: boolean;
  acceptCash: boolean;
  acceptZelle: boolean;
  acceptWire: boolean;
  offlineInstructions: string | null;
  /** Hold a team at unpaid until a human confirms the funds cleared. */
  manualApproval: boolean;

  reminderDaysBefore: number;
  reminderOnDueDate: boolean;
  reminderDaysAfter: number;
}

export const DEFAULT_PAYMENT_RULES: PaymentRules = {
  depositMode: "FULL",
  depositBasis: "FLAT",
  depositCents: 0,
  depositPercent: 50,
  balanceDueDays: 30,
  earlyBirdUntil: null,
  earlyBirdDiscountCents: 0,
  lateFeeAfter: null,
  lateFeeCents: 0,
  multiTeamMinTeams: 0,
  multiTeamPercent: 0,
  acceptCheck: true,
  acceptCash: true,
  acceptZelle: false,
  acceptWire: false,
  offlineInstructions: null,
  manualApproval: true,
  reminderDaysBefore: 7,
  reminderOnDueDate: true,
  reminderDaysAfter: 3,
};

export interface PlatformFeeConfig {
  mode: PlatformFeeMode;
  /** Basis points: 250 = 2.50%. Avoids float drift on a percentage. */
  percentBps: number;
  flatCents: number;
  tierName: string;
  tierMonthlyCents: number;
  /**
   * true  — the fee is added to the club's bill at checkout.
   * false — the organizer absorbs it out of what they collect.
   */
  passThrough: boolean;
}

export const DEFAULT_PLATFORM_FEE: PlatformFeeConfig = {
  mode: "PERCENT",
  percentBps: 250,
  flatCents: 99,
  tierName: "Starter",
  tierMonthlyCents: 0,
  passThrough: false,
};

export function describePlatformFee(config: PlatformFeeConfig): string {
  const pct = (config.percentBps / 100).toFixed(2).replace(/\.00$/, "");
  const flat = `$${(config.flatCents / 100).toFixed(2)}`;
  if (config.mode === "TIERED") {
    return `${config.tierName} plan — $${(config.tierMonthlyCents / 100).toFixed(2)}/month, no per-registration fee`;
  }
  if (config.mode === "FLAT") return `${flat} per team registration`;
  return `${pct}% + ${flat} per team registration`;
}

/**
 * What Jogo takes on one registration. A tiered plan charges a subscription
 * rather than a cut, so it returns zero here — the money is billed elsewhere,
 * not skimmed from this transaction, and pretending otherwise would double
 * count it in the revenue panel.
 */
export function platformFeeCents(amountCents: number, config: PlatformFeeConfig): number {
  if (amountCents <= 0) return 0;
  if (config.mode === "TIERED") return 0;
  if (config.mode === "FLAT") return config.flatCents;
  return Math.round((amountCents * config.percentBps) / 10_000) + config.flatCents;
}

export interface QuoteLine {
  label: string;
  amountCents: number;
  /** Discounts and credits render differently and must not be summed as charges. */
  kind: "charge" | "discount" | "fee";
}

export interface Quote {
  lines: QuoteLine[];
  entryCents: number;
  discountCents: number;
  lateFeeCents: number;
  platformFeeCents: number;
  totalCents: number;
  /** What must be paid now — the full total, or the deposit. */
  dueNowCents: number;
  balanceCents: number;
  balanceDueAt: string | null;
  earlyBirdApplied: boolean;
  lateFeeApplied: boolean;
  multiTeamApplied: boolean;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Prices one club's registration.
 *
 * `teamCount` is how many teams that club is entering, which is what the
 * multi-team discount keys off — the discount belongs to the club, not to the
 * event, so it cannot be derived from the tournament's own entrant count.
 */
export function quoteRegistration({
  feeCents,
  teamCount = 1,
  rules,
  platform,
  at = new Date(),
}: {
  feeCents: number;
  teamCount?: number;
  rules: PaymentRules;
  platform: PlatformFeeConfig;
  at?: Date;
}): Quote {
  const teams = Math.max(1, Math.floor(teamCount));
  const entryCents = feeCents * teams;
  const lines: QuoteLine[] = [
    {
      label: teams > 1 ? `Entry fee × ${teams} teams` : "Tournament entry fee",
      amountCents: entryCents,
      kind: "charge",
    },
  ];

  // Dates are compared at day granularity: an early-bird deadline of "1 Oct"
  // means the whole of 1 October, not up to midnight as it begins.
  const today = startOfDay(at);

  let discountCents = 0;
  let earlyBirdApplied = false;
  if (rules.earlyBirdUntil && rules.earlyBirdDiscountCents > 0) {
    const until = startOfDay(new Date(rules.earlyBirdUntil));
    if (!Number.isNaN(until.getTime()) && today.getTime() <= until.getTime()) {
      earlyBirdApplied = true;
      // Per team registration, like the fee it discounts — a club entering
      // three teams early saves three times, not once.
      const amount = rules.earlyBirdDiscountCents * teams;
      discountCents += amount;
      lines.push({ label: "Early bird discount", amountCents: amount, kind: "discount" });
    }
  }

  let multiTeamApplied = false;
  if (rules.multiTeamMinTeams > 0 && rules.multiTeamPercent > 0 && teams >= rules.multiTeamMinTeams) {
    multiTeamApplied = true;
    const amount = Math.round((entryCents * rules.multiTeamPercent) / 100);
    discountCents += amount;
    lines.push({
      label: `Club discount — ${rules.multiTeamPercent}% for ${rules.multiTeamMinTeams}+ teams`,
      amountCents: amount,
      kind: "discount",
    });
  }

  let lateFee = 0;
  let lateFeeApplied = false;
  if (rules.lateFeeAfter && rules.lateFeeCents > 0) {
    const after = startOfDay(new Date(rules.lateFeeAfter));
    if (!Number.isNaN(after.getTime()) && today.getTime() > after.getTime()) {
      lateFeeApplied = true;
      lateFee = rules.lateFeeCents * teams; // per registration, same as the fee
      lines.push({ label: "Late registration fee", amountCents: lateFee, kind: "charge" });
    }
  }

  // Discounts cannot take the bill below zero, and the platform fee is
  // computed on what is actually charged rather than on the list price.
  const netCents = Math.max(0, entryCents - discountCents + lateFee);

  let passedThroughFee = 0;
  if (platform.passThrough) {
    passedThroughFee = platformFeeCents(netCents, platform);
    if (passedThroughFee > 0) {
      lines.push({ label: "Processing fee", amountCents: passedThroughFee, kind: "fee" });
    }
  }

  const totalCents = netCents + passedThroughFee;

  let dueNowCents = totalCents;
  if (rules.depositMode === "DEPOSIT") {
    const raw =
      rules.depositBasis === "PERCENT"
        ? Math.round((totalCents * rules.depositPercent) / 100)
        : rules.depositCents;
    // A deposit larger than the bill is a configuration slip, not a licence to
    // overcharge; a zero deposit would make "deposit mode" mean nothing.
    dueNowCents = Math.min(totalCents, Math.max(0, raw));
    if (dueNowCents === 0) dueNowCents = totalCents;
  }

  const balanceCents = totalCents - dueNowCents;
  let balanceDueAt: string | null = null;
  if (balanceCents > 0) {
    const due = new Date(at);
    due.setDate(due.getDate() + Math.max(0, rules.balanceDueDays));
    balanceDueAt = due.toISOString();
  }

  return {
    lines,
    entryCents,
    discountCents,
    lateFeeCents: lateFee,
    platformFeeCents: passedThroughFee,
    totalCents,
    dueNowCents,
    balanceCents,
    balanceDueAt,
    earlyBirdApplied,
    lateFeeApplied,
    multiTeamApplied,
  };
}

export function acceptedOfflineMethods(rules: PaymentRules): string[] {
  const out: string[] = [];
  if (rules.acceptCheck) out.push("Check");
  if (rules.acceptCash) out.push("Cash");
  if (rules.acceptZelle) out.push("Zelle");
  if (rules.acceptWire) out.push("Bank wire");
  return out;
}

/**
 * Which reminders an invoice is due right now, given the organizer's schedule.
 * Returns a stable key per reminder so a caller can avoid sending the same one
 * twice — nothing here sends anything or decides that it already has.
 */
export function dueReminders(
  dueAt: string,
  rules: PaymentRules,
  at = new Date()
): { key: string; label: string }[] {
  const due = startOfDay(new Date(dueAt));
  if (Number.isNaN(due.getTime())) return [];
  const today = startOfDay(at);
  const dayDiff = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  const out: { key: string; label: string }[] = [];
  if (rules.reminderDaysBefore > 0 && dayDiff === rules.reminderDaysBefore) {
    out.push({ key: `before-${rules.reminderDaysBefore}`, label: `${rules.reminderDaysBefore} days before due` });
  }
  if (rules.reminderOnDueDate && dayDiff === 0) out.push({ key: "on-due", label: "on the due date" });
  if (rules.reminderDaysAfter > 0 && dayDiff === -rules.reminderDaysAfter) {
    out.push({ key: `after-${rules.reminderDaysAfter}`, label: `${rules.reminderDaysAfter} days overdue` });
  }
  return out;
}
