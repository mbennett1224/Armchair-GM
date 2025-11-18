import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// -------------------------
// MySQL connection
// -------------------------
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL!");
  }
});

// -------------------------
// GET all MLB teams
// -------------------------
app.get("/api/teams", async (req, res) => {
  try {
    const response = await fetch("https://statsapi.mlb.com/api/v1/teams?sportId=1");
    const data = await response.json();

    if (!data.teams) return res.status(404).json({ error: "No teams found." });

    const teams = data.teams.map((team) => ({
      id: team.id,
      name: team.name,
      location: team.locationName,
      abbreviation: team.abbreviation,
    }));

    res.json(teams);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// -------------------------
// GET players + live stats for selected team
// -------------------------
app.get("/api/teams/:id/players", async (req, res) => {
  const teamId = req.params.id;

  try {
    // Best hydrate chain for LIVE stats
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster/rosterFull` +
      `?hydrate=person(stats(group=[hitting,pitching],type=[season]))`
    );

    const data = await response.json();

    if (!data.roster || data.roster.length === 0) {
      return res.status(404).json({ error: "No roster data found." });
    }

    const players = data.roster.map((player) => {
      const p = player.person;

      // --- Extract stats safely ---
      const hittingStats = p.stats?.find((s) => s.group?.displayName === "hitting")?.splits?.[0]?.stat || {};
      const pitchingStats = p.stats?.find((s) => s.group?.displayName === "pitching")?.splits?.[0]?.stat || {};

      return {
        id: p.id,
        name: p.fullName,
        position: player.position?.abbreviation || "",
        positionName: player.position?.name || "",
        jerseyNumber: player.jerseyNumber || "",
        batSide: p.batSide?.code || "—",
        pitchHand: p.pitchHand?.code || "—",

        // -------------------------
        // Hitting stats (App.js expects these)
        // -------------------------
        stats: {
          avg: hittingStats.avg || null,
          slg: hittingStats.slg || null,
          ops: hittingStats.ops || null,
          homeRuns: hittingStats.homeRuns || null,
          rbi: hittingStats.rbi || null,
          hits: hittingStats.hits || null,
          baseOnBalls: hittingStats.baseOnBalls || null,
          strikeOuts: hittingStats.strikeOuts || null,

          // -------------------------
          // Pitching stats
          // -------------------------
          era: pitchingStats.era || null,
          whip: pitchingStats.whip || null,
          inningsPitched: pitchingStats.inningsPitched || null,
          strikeOutsPitching: pitchingStats.strikeOuts || null,
          baseOnBallsPitching: pitchingStats.baseOnBalls || null,
          hitsAllowed: pitchingStats.hits || null,

          gamesStarted: pitchingStats.gamesStarted || null
        }
      };
    });

    res.json(players);
  } catch (error) {
    console.error("Error fetching players/stats:", error);
    res.status(500).json({ error: "Failed to fetch player stats" });
  }
});

// -------------------------
// FREE AGENTS (placeholder)
// -------------------------
app.get("/api/freeagents", (req, res) => {
  const freeAgents = [
    { PlayerID: 9001, Name: "Free Agent A", Position: "1B", WAR: 1.8 },
    { PlayerID: 9002, Name: "Reliever B", Position: "P", WAR: 0.9 },
    { PlayerID: 9003, Name: "Utility C", Position: "SS", WAR: 2.1 },
  ];
  res.json(freeAgents);
});

// -------------------------
// Update roster (future DB use)
// -------------------------
app.post("/api/roster/update", express.json(), (req, res) => {
  const { teamId, position, player } = req.body;

  console.log("Roster update request:", { teamId, position, player });

  res.json({ ok: true, teamId, position, player });
});

// -------------------------
app.get("/", (req, res) => {
  res.send("⚾ Armchair GM API is running!");
});
// -------------------------

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
