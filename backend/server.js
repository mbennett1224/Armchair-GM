import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import mysql from "mysql2";
import dotenv from "dotenv";
import axios from "axios";
import cron from "node-cron";
import fs from "fs";
import { exec } from "child_process";


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

// -------------------------------------------
// AUTO-UPDATE FREE AGENTS WEEKLY (ESPN SCRAPER)
// -------------------------------------------


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
        stats: {
          // Hitting
          avg: hittingStats.avg || null,
          slg: hittingStats.slg || null,
          ops: hittingStats.ops || null,
          homeRuns: hittingStats.homeRuns || null,
          rbi: hittingStats.rbi || null,
          hits: hittingStats.hits || null,
          baseOnBalls: hittingStats.baseOnBalls || null,
          strikeOuts: hittingStats.strikeOuts || null,
          // Pitching
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


app.get("/api/freeagents", (req, res) => {
  try {
    if (!fs.existsSync("free_agents.json")) {
      console.error("❌ free_agents.json not found!");
      return res.status(500).json({ error: "free_agents.json is missing" });
    }

    let data = JSON.parse(fs.readFileSync("free_agents.json", "utf8"));

    // 🔍 Ensure data is an array
    if (!Array.isArray(data)) {
      console.error("❌ free_agents.json is not an array!");
      return res.status(500).json({ error: "Invalid free_agents.json format" });
    }

    // 🧹 Remove bad or unknown entries
    data = data.filter(p =>
      p &&
      p.name &&
      p.name.trim() !== "" &&
      p.name.toLowerCase() !== "unknown player"
    );

    console.log(`📁 Serving ${data.length} free agents from file.`);

    return res.json(data);

  } catch (err) {
    console.error("❌ Error reading free_agents.json:", err);
    return res.status(500).json({ error: "Could not load free agents" });
  }
});
// -------------------------
// Update roster (future DB use)
// -------------------------
app.post("/api/roster/update", (req, res) => {
  const { teamId, position, player } = req.body;

  console.log("Roster update:", { teamId, position, player });

  // Always succeed — free agents & MLB players
  return res.json({
    success: true,
    message: "Player signed",
    teamId,
    position,
    player
  });
});

// -------------------------
app.get("/", (req, res) => {
  res.send("⚾ Armchair GM API is running!");
});
// -------------------------

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
