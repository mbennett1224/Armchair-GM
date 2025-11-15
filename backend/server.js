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

// ✅ MySQL connection
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

// ✅ Route 1 — Get all 30 MLB teams
app.get("/api/teams", async (req, res) => {
  try {
    const response = await fetch("https://statsapi.mlb.com/api/v1/teams?sportId=1");
    const data = await response.json();

    if (!data.teams) {
      return res.status(404).json({ error: "No teams found." });
    }

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

// ✅ Route 2 — Get all players for a specific team (with stats)
app.get("/api/teams/:id/players", async (req, res) => {
  const teamId = req.params.id;

  try {
    // Use "rosterFull" to ensure data always comes through
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster/rosterFull`
    );
    const data = await response.json();

    if (!data.roster || data.roster.length === 0) {
      return res.status(404).json({ error: "No roster data found." });
    }

    // Map players
    const players = data.roster.map((player) => ({
      id: player.person.id,
      name: player.person.fullName,
      position: player.position.abbreviation,
      positionName: player.position.name,
      jerseyNumber: player.jerseyNumber || "—",
      batSide: player.person.batSide?.code || "—",
      pitchHand: player.person.pitchHand?.code || "—",
    }));

    res.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Failed to fetch player data" });
  }
});

app.get("/api/freeagents", (req, res) => {
  // For demo, static list. Replace with DB select from free_agents table.
  const freeAgents = [
    { PlayerID: 9001, Name: "Free Agent A", Position: "1B", WAR: 1.8, Salary: null },
    { PlayerID: 9002, Name: "Reliever B", Position: "P", WAR: 0.9, Salary: null },
    { PlayerID: 9003, Name: "Utility C", Position: "SS", WAR: 2.1, Salary: null },
  ];
  res.json(freeAgents);
});

// accept POST to add player to roster: body { teamId, position, player }
app.post("/api/roster/update", express.json(), async (req, res) => {
  const { teamId, position, player } = req.body;
  // TODO: persist swap to DB; for now just echo
  console.log("Roster update:", { teamId, position, player });
  // Ideally: update Players table or create Roster table record
  res.json({ ok: true, teamId, position, player });
});

// ✅ Root test route
app.get("/", (req, res) => {
  res.send("⚾ Armchair GM API is running!");
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
