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
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster`
    );
    const data = await response.json();

    if (!data.roster) {
      return res.status(404).json({ error: "No roster data found." });
    }

    // Map roster players and fetch stats for each one
    const players = await Promise.all(
      data.roster.map(async (player) => {
        const playerId = player.person.id;

        // Fetch individual player stats
        const statsResponse = await fetch(
          `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=season`
        );
        const statsData = await statsResponse.json();

        let avg = "N/A";
        let era = "N/A";
        let war = "N/A";

        if (statsData.stats && statsData.stats[0]?.splits?.length > 0) {
          const split = statsData.stats[0].splits[0].stat;
          if (split.avg) avg = split.avg;
          if (split.era) era = split.era;
          if (split.war) war = split.war;
        }

        return {
          id: playerId,
          name: player.person.fullName,
          position: player.position.name,
          jerseyNumber: player.jerseyNumber,
          avg,
          war,
          era,
        };
      })
    );

    res.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Failed to fetch player data" });
  }
});

// ✅ Root test route
app.get("/", (req, res) => {
  res.send("⚾ Armchair GM API is running!");
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
