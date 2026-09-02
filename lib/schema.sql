-- role distinguishes the four account types the product supports:
-- ADMIN (platform-wide), ORGANIZER (runs their own tournaments, the
-- original/default account type), TEAM_MANAGER (linked to one team via
-- teams.userId), PLAYER (linked to one player via players.userId).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ORGANIZER',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'Soccer',
  teamFormat TEXT NOT NULL DEFAULT '11v11',
  format TEXT NOT NULL DEFAULT 'GROUPS_KNOCKOUT',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  location TEXT,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  feeCents INTEGER NOT NULL DEFAULT 0,
  fieldsCount INTEGER NOT NULL DEFAULT 2,
  groupsCount INTEGER NOT NULL DEFAULT 2,
  advancePerGroup INTEGER NOT NULL DEFAULT 2,
  supervisorName TEXT NOT NULL DEFAULT '',
  supervisorEmail TEXT NOT NULL DEFAULT '',
  supervisorPhone TEXT,
  ownerId TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  name TEXT NOT NULL,
  contactName TEXT NOT NULL,
  contactEmail TEXT NOT NULL,
  groupName TEXT,
  logoUrl TEXT,
  crestBlob BYTEA,
  crestMimeType TEXT,
  crestUpdatedAt TEXT,
  logoToken TEXT UNIQUE,
  paid INTEGER NOT NULL DEFAULT 0,
  checkedIn INTEGER NOT NULL DEFAULT 0,
  inviteToken TEXT UNIQUE,
  invitedAt TEXT,
  userId TEXT, -- the team manager account, if the team registered with a password
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  teamId TEXT NOT NULL,
  userId TEXT, -- the player/parent account, if the passport has been claimed
  name TEXT NOT NULL,
  jerseyNumber TEXT,
  birthdate TEXT,
  passportId TEXT UNIQUE NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'GROUP',
  round TEXT NOT NULL,
  groupName TEXT,
  homeTeamId TEXT,
  awayTeamId TEXT,
  homeLabel TEXT,
  awayLabel TEXT,
  homeScore INTEGER,
  awayScore INTEGER,
  field TEXT,
  scheduledAt TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  refereeId TEXT,
  motmPlayerId TEXT,
  orderIndex INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS referees (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  name TEXT NOT NULL,
  contact TEXT
);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  playerId TEXT NOT NULL,
  checkedInAt TEXT NOT NULL,
  UNIQUE(tournamentId, playerId)
);

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  tournamentType TEXT,
  message TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

-- Single-row site-wide settings (the brand accent color and light/dark
-- theme, both chosen from /dashboard/settings). This table already exists
-- on any database that has the crest/branding features live, so the
-- "theme" column below is added the same way as any other column on an
-- existing table — see runMigrations() in lib/db.ts — not by editing this
-- CREATE TABLE, which only affects brand-new databases.
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY,
  accentColor TEXT NOT NULL DEFAULT '#FF4D4D',
  theme TEXT NOT NULL DEFAULT 'dark',
  updatedAt TEXT NOT NULL
);

-- Team applications to a tournament. Deliberately separate from `teams`:
-- a team row is a confirmed entrant that appears in standings and gets
-- fixtures generated for it, while an application is a request that may be
-- waitlisted or declined and must never leak into either. Accepting an
-- application is what creates the teams row, and applications.teamId is
-- the link back to it.
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  teamName TEXT NOT NULL,
  clubName TEXT,
  division TEXT,
  managerName TEXT NOT NULL,
  managerEmail TEXT NOT NULL,
  managerPhone TEXT,
  rosterCount INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  paymentStatus TEXT NOT NULL DEFAULT 'UNPAID',
  teamId TEXT,
  crestBlob BYTEA,
  crestMimeType TEXT,
  createdAt TEXT NOT NULL,
  decidedAt TEXT
);

-- Live event status, shown to spectators. This is the rainout switch: an
-- organizer flips it and every public page says so at once. Deliberately not
-- weather data — Jogo has no weather provider — but the thing a parent in a
-- car park actually needs to know, which is whether play is on.
-- Added to `tournaments` via runMigrations(), not here.

-- What happened in a match, one row per incident. This is the table the
-- referee scorepad's own comment said was missing: without it a yellow card
-- had nowhere to go, so the pad could only ever be a wireframe. Every player
-- statistic in the app is derived from these rows rather than stored as a
-- running total on the player, so a mistyped card can be deleted and the
-- totals simply stop counting it.
CREATE TABLE IF NOT EXISTS match_events (
  id TEXT PRIMARY KEY,
  matchId TEXT NOT NULL,
  tournamentId TEXT NOT NULL,
  teamId TEXT,
  playerId TEXT,
  type TEXT NOT NULL,          -- GOAL | ASSIST | YELLOW | RED
  minute INTEGER,
  note TEXT,
  -- Only meaningful on a RED: the moment an organizer confirmed the
  -- suspension was served. Null means the player is still sitting out.
  clearedAt TEXT,
  recordedByName TEXT,
  createdAt TEXT NOT NULL
);

-- Combine testing, entered by hand. Every figure is an integer in hundredths
-- of its display unit (a 5.12s sprint is 512) so no measurement is ever a
-- float that drifts. There is no wearable or timing-gate integration here —
-- a coach types what the stopwatch said.
CREATE TABLE IF NOT EXISTS player_metrics (
  id TEXT PRIMARY KEY,
  playerId TEXT NOT NULL,
  sprint40Hundredths INTEGER,      -- seconds x100, lower is better
  verticalJumpHundredths INTEGER,  -- inches x100
  topSpeedHundredths INTEGER,      -- mph x100
  distanceHundredths INTEGER,      -- miles x100
  yoyoHundredths INTEGER,          -- Yo-Yo level x100
  recordedByName TEXT,
  recordedAt TEXT NOT NULL
);

-- Matchday availability, one row per player per match.
CREATE TABLE IF NOT EXISTS player_availability (
  id TEXT PRIMARY KEY,
  matchId TEXT NOT NULL,
  playerId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NO_REPLY',  -- ATTENDING | INJURED | ABSENT | NO_REPLY
  note TEXT,
  respondedAt TEXT,
  UNIQUE(matchId, playerId)
);

-- A saved starting XI. `slots` is a JSON map of formation slot id to player
-- id; the formation's geometry lives in lib/lineup.ts rather than the
-- database, so moving a shape by a few percent is a code change and not a
-- migration of every saved lineup.
CREATE TABLE IF NOT EXISTS lineups (
  id TEXT PRIMARY KEY,
  matchId TEXT NOT NULL,
  teamId TEXT NOT NULL,
  formation TEXT NOT NULL,
  slots TEXT NOT NULL,
  arrows TEXT,
  notes TEXT,
  updatedAt TEXT NOT NULL,
  UNIQUE(matchId, teamId)
);

-- The signed result. Signatures are captured as PNG data URLs drawn on a
-- canvas: a picture of a signature, which is what a paper match card also is
-- — not a cryptographic e-signature, and the UI says so.
CREATE TABLE IF NOT EXISTS match_reports (
  id TEXT PRIMARY KEY,
  matchId TEXT NOT NULL UNIQUE,
  homeScore INTEGER NOT NULL,
  awayScore INTEGER NOT NULL,
  notes TEXT,
  refereeName TEXT,
  refereeSignature TEXT,
  marshalName TEXT,
  marshalSignature TEXT,
  submittedAt TEXT NOT NULL
);

-- What an official is owed for a match. Recorded, not paid: like every other
-- payment in Jogo, the money moves outside the app.
CREATE TABLE IF NOT EXISTS referee_fees (
  id TEXT PRIMARY KEY,
  matchId TEXT NOT NULL,
  refereeId TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CENTER',   -- CENTER | AR1 | AR2 | FOURTH
  feeCents INTEGER NOT NULL DEFAULT 0,
  paidAt TEXT,
  recordedAt TEXT NOT NULL
);

-- How one tournament takes money. One row per event, created on first save;
-- an absent row means lib/pricing.ts's documented defaults, so an organizer
-- who never opens the settings screen still has coherent, stated rules rather
-- than nulls that each call site guesses at differently.
CREATE TABLE IF NOT EXISTS tournament_payment_settings (
  tournamentId TEXT PRIMARY KEY,
  depositMode TEXT NOT NULL DEFAULT 'FULL',
  depositBasis TEXT NOT NULL DEFAULT 'FLAT',
  depositCents INTEGER NOT NULL DEFAULT 0,
  depositPercent INTEGER NOT NULL DEFAULT 50,
  balanceDueDays INTEGER NOT NULL DEFAULT 30,
  earlyBirdUntil TEXT,
  earlyBirdDiscountCents INTEGER NOT NULL DEFAULT 0,
  lateFeeAfter TEXT,
  lateFeeCents INTEGER NOT NULL DEFAULT 0,
  multiTeamMinTeams INTEGER NOT NULL DEFAULT 0,
  multiTeamPercent INTEGER NOT NULL DEFAULT 0,
  acceptCheck INTEGER NOT NULL DEFAULT 1,
  acceptCash INTEGER NOT NULL DEFAULT 1,
  acceptZelle INTEGER NOT NULL DEFAULT 0,
  acceptWire INTEGER NOT NULL DEFAULT 0,
  offlineInstructions TEXT,
  manualApproval INTEGER NOT NULL DEFAULT 1,
  reminderDaysBefore INTEGER NOT NULL DEFAULT 7,
  reminderOnDueDate INTEGER NOT NULL DEFAULT 1,
  reminderDaysAfter INTEGER NOT NULL DEFAULT 3,
  updatedAt TEXT NOT NULL
);

-- Platform monetization, site-wide. Single row, same "singleton" id pattern
-- as site_settings.
CREATE TABLE IF NOT EXISTS platform_fee_settings (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'PERCENT',
  percentBps INTEGER NOT NULL DEFAULT 250,
  flatCents INTEGER NOT NULL DEFAULT 99,
  tierName TEXT NOT NULL DEFAULT 'Starter',
  tierMonthlyCents INTEGER NOT NULL DEFAULT 0,
  passThrough INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL
);

-- Payouts to organizers, recorded by hand. Jogo has no payout rail and never
-- holds anyone's money — organizers collect directly — so this is a register
-- of transfers made elsewhere, exactly like invoice_payments. It is not an
-- instruction to move funds and nothing here can move any.
CREATE TABLE IF NOT EXISTS platform_payouts (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  amountCents INTEGER NOT NULL,
  reference TEXT,
  note TEXT,
  recordedByName TEXT,
  recordedAt TEXT NOT NULL
);

-- A pending staff invitation. Deliberately not a users row with a blank
-- password: an invitation is a claim on an email address that may never be
-- taken up, and a half-made account would be able to sign in the moment
-- anyone guessed a password reset. The users row is created on acceptance.
CREATE TABLE IF NOT EXISTS user_invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  role TEXT NOT NULL,
  permissions TEXT,
  token TEXT NOT NULL,
  invitedByUserId TEXT NOT NULL,
  invitedByName TEXT,
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  acceptedAt TEXT,
  revokedAt TEXT
);

-- Staff assigned onto a tournament they do not own. This is what lets an
-- invited director actually work an event: without it, the ownership check in
-- lib/actions.ts would refuse them everything.
CREATE TABLE IF NOT EXISTS tournament_staff (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(tournamentId, userId)
);

-- An invoice raised against one entrant. The billed party is snapshotted
-- onto the row at issue time rather than joined from teams/applications on
-- every read: an invoice is an accounting record, and it must still say who
-- was billed and at what address after the club renames itself or the
-- manager's email changes. Money that can be derived is never stored --
-- there is no total column here, because a stored total can disagree with
-- its own line items (see lib/invoices.ts).
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  tournamentId TEXT NOT NULL,
  teamId TEXT,
  applicationId TEXT,
  billToClub TEXT NOT NULL,
  billToContact TEXT NOT NULL,
  billToEmail TEXT NOT NULL,
  billToPhone TEXT,
  division TEXT,
  teamCount INTEGER NOT NULL DEFAULT 1,
  issuedAt TEXT NOT NULL,
  dueAt TEXT NOT NULL,
  discountCode TEXT,
  discountCents INTEGER NOT NULL DEFAULT 0,
  processingFeeCents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoiceId TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unitPriceCents INTEGER NOT NULL DEFAULT 0,
  discountCents INTEGER NOT NULL DEFAULT 0,
  orderIndex INTEGER NOT NULL DEFAULT 0
);

-- The audit trail. Refunds and write-off adjustments are stored as negative
-- amounts in this same table rather than as their own kind of record, so the
-- balance is always one sum over one list and a refund can never be silently
-- left out of it.
CREATE TABLE IF NOT EXISTS invoice_payments (
  id TEXT PRIMARY KEY,
  invoiceId TEXT NOT NULL,
  amountCents INTEGER NOT NULL,
  method TEXT NOT NULL,
  reference TEXT,
  note TEXT,
  recordedByName TEXT,
  recordedAt TEXT NOT NULL
);

-- A split-payment schedule. These are amounts due on dates, recorded so an
-- organizer can chase them; nothing here debits anybody, because Jogo has no
-- payment gateway connected (see the finance UI, which says so plainly
-- rather than implying a card is on file).
CREATE TABLE IF NOT EXISTS invoice_installments (
  id TEXT PRIMARY KEY,
  invoiceId TEXT NOT NULL,
  label TEXT NOT NULL,
  amountCents INTEGER NOT NULL,
  dueAt TEXT NOT NULL,
  paidAt TEXT,
  orderIndex INTEGER NOT NULL DEFAULT 0
);

-- Outbound messages to applicants. Persisted even though nothing sends
-- them yet: the record of what an organizer intended to send, to whom, and
-- when is the part that has to survive: wiring a provider in later only
-- needs to drain rows whose status is still QUEUED.
CREATE TABLE IF NOT EXISTS application_messages (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  template TEXT,
  audience TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipients TEXT NOT NULL,
  recipientCount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  createdAt TEXT NOT NULL
);

-- ── Organizer-controlled modules ────────────────────────────────────────
-- One row per tournament holding the switches for the optional modules.
-- Kept as its own table rather than more columns on `tournaments` because
-- these are settings an organizer edits together on one screen, and because
-- a missing row is a meaningful state: it means "never configured", which
-- the defaults in lib/modules.ts answer for.
CREATE TABLE IF NOT EXISTS tournament_modules (
  tournamentId TEXT PRIMARY KEY,
  -- Live match centre
  matchCenterEnabled INTEGER NOT NULL DEFAULT 0,
  venuePins TEXT,                       -- JSON array of {kind,label,x,y}
  venueAddress TEXT,
  -- Sponsors
  sponsorsEnabled INTEGER NOT NULL DEFAULT 0,
  -- Fair play
  fairPlayPublic INTEGER NOT NULL DEFAULT 0,
  fairPlayYellowPoints INTEGER NOT NULL DEFAULT 1,
  fairPlayRedPoints INTEGER NOT NULL DEFAULT 3,
  fairPlayAlertThreshold INTEGER NOT NULL DEFAULT 6,
  -- Media hub
  mediaEnabled INTEGER NOT NULL DEFAULT 0,
  mediaUploadPolicy TEXT NOT NULL DEFAULT 'STAFF',   -- STAFF | OPEN
  updatedAt TEXT
);

-- Local sponsors an organizer sells space to. The logo is a blob for the
-- same reason team crests are: the app has no object store, and a URL to
-- someone else's server is a dead image the day they redesign their site.
CREATE TABLE IF NOT EXISTS sponsors (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  url TEXT,
  promoCode TEXT,
  promoDetail TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  logoBlob BYTEA,
  logoMimeType TEXT,
  createdAt TEXT NOT NULL
);

-- Photos people upload. Every row starts PENDING: nothing reaches a public
-- page until an organizer has looked at it, which is the whole point of a
-- gallery that parents can post to.
CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY,
  tournamentId TEXT NOT NULL,
  teamId TEXT,
  division TEXT,
  caption TEXT,
  credit TEXT,
  uploadedByName TEXT,
  uploadedByUserId TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',   -- PENDING | APPROVED | REJECTED
  featured INTEGER NOT NULL DEFAULT 0,
  reviewedByName TEXT,
  reviewedAt TEXT,
  imageBlob BYTEA,
  imageMimeType TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsors_tournament ON sponsors(tournamentId);
CREATE INDEX IF NOT EXISTS idx_media_tournament ON media_items(tournamentId);
