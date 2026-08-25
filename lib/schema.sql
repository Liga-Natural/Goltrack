CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'Soccer',
  format TEXT NOT NULL DEFAULT 'GROUPS_KNOCKOUT',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  location TEXT,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  feeCents INTEGER NOT NULL DEFAULT 0,
  fieldsCount INTEGER NOT NULL DEFAULT 2,
  groupsCount INTEGER NOT NULL DEFAULT 2,
  advancePerGroup INTEGER NOT NULL DEFAULT 2,
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
  paid INTEGER NOT NULL DEFAULT 0,
  checkedIn INTEGER NOT NULL DEFAULT 0,
  inviteToken TEXT UNIQUE,
  invitedAt TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  teamId TEXT NOT NULL,
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
