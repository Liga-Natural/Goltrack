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
