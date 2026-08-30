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
  createdAt TEXT NOT NULL,
  decidedAt TEXT
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
