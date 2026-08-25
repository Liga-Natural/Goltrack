import bcrypt from "bcryptjs";
import { Users, Tournaments, Teams, Players, Matches, Referees, CheckIns, slugify } from "../lib/models";
import { generateGroupStage } from "../lib/bracket";

async function main() {
  console.log("Seeding GolTrack demo data...");

  const existing = Users.byEmail("demo@goltrack.app");
  const owner =
    existing ??
    Users.create("demo@goltrack.app", await bcrypt.hash("demo1234", 10), "Alex Rivera");

  let tournament = Tournaments.bySlug("coastal-cup");
  if (!tournament) {
    tournament = Tournaments.create({
      slug: "coastal-cup",
      name: "Coastal Cup Youth Invitational",
      sport: "Soccer",
      format: "GROUPS_KNOCKOUT",
      status: "LIVE",
      location: "Magic City Fields, Miami FL",
      startDate: new Date(Date.now() - 86400000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      feeCents: 15000,
      fieldsCount: 2,
      groupsCount: 2,
      advancePerGroup: 2,
      ownerId: owner.id,
    });

    const teamNames = [
      ["Riverside Rovers", "Coach Dana", "dana@riversiderovers.example"],
      ["Bay City FC", "Marco Ibarra", "marco@baycityfc.example"],
      ["Sunset Strikers", "Priya Nair", "priya@sunsetstrikers.example"],
      ["Ironclad United", "Jamal Reed", "jamal@ironcladutd.example"],
      ["Palmetto Pumas", "Rosa Delgado", "rosa@palmettopumas.example"],
      ["Harborview Hawks", "Tomas Kwan", "tomas@harborviewhawks.example"],
    ] as const;

    const firstNames = ["Sam", "Jordan", "Casey", "Riley", "Morgan", "Taylor", "Avery", "Quinn", "Drew", "Reese", "Sky", "Rowan"];
    const teams = teamNames.map(([name, contactName, contactEmail], i) => {
      const team = Teams.create({ tournamentId: tournament!.id, name, contactName, contactEmail, paid: true });
      Teams.setGroup(team.id, i % 2 === 0 ? "A" : "B");
      for (let j = 0; j < 8; j++) {
        Players.create({
          teamId: team.id,
          name: `${firstNames[(i * 8 + j) % firstNames.length]} ${name.split(" ")[0]}${j}`,
          jerseyNumber: String(j + 1),
        });
      }
      return team;
    });

    const ref1 = Referees.create({ tournamentId: tournament.id, name: "Chris Alvarado", contact: "chris.ref@example.com" });
    const ref2 = Referees.create({ tournamentId: tournament.id, name: "Nina Petrov", contact: "nina.ref@example.com" });

    const generated = generateGroupStage(teams, {
      groupsCount: 2,
      fieldsCount: 2,
      startTime: new Date(Date.now() - 3 * 3600000),
    });

    generated.forEach((m, i) => {
      const match = Matches.create({
        tournamentId: tournament!.id,
        stage: m.stage,
        round: m.round,
        groupName: m.groupName,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeLabel: m.homeLabel,
        awayLabel: m.awayLabel,
        homeScore: null,
        awayScore: null,
        field: m.field,
        scheduledAt: m.scheduledAt,
        status: "SCHEDULED",
        refereeId: i % 2 === 0 ? ref1.id : ref2.id,
        orderIndex: m.orderIndex,
      });
      // Give the first several matches scores so the demo shows live standings.
      if (i < 4) {
        const homeScore = (i * 2) % 4;
        const awayScore = (i * 3 + 1) % 4;
        Matches.updateScore(match.id, homeScore, awayScore, "FINAL");
      } else if (i === 4) {
        Matches.updateScore(match.id, 1, 1, "LIVE");
      }
    });

    // Check a couple of players in as an on-site demo.
    const firstTeamPlayers = Players.listByTeam(teams[0].id);
    if (firstTeamPlayers[0]) CheckIns.create(tournament.id, firstTeamPlayers[0].id);
    if (firstTeamPlayers[1]) CheckIns.create(tournament.id, firstTeamPlayers[1].id);
  }

  console.log("Done.");
  console.log("Demo organizer login: demo@goltrack.app / demo1234");
  console.log("Public tournament page: /t/coastal-cup");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
