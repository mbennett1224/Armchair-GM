import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import supabase from "./db/connection.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// -------------------------
// GET all MLB teams
// -------------------------
app.get("/api/teams", async (_req, res) => {
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
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster/rosterFull` +
      `?hydrate=person(stats(group=[hitting,pitching],type=[season]))`
    );

    const data = await response.json();

    if (!data.roster || data.roster.length === 0) {
      return res.status(404).json({ error: "No roster data found." });
    }

    const mlbPlayers = data.roster.map((player) => {
      const p = player.person;

      const hittingStats = p.stats?.find((s) => s.group?.displayName === "hitting")?.splits?.[0]?.stat || {};
      const pitchingStats = p.stats?.find((s) => s.group?.displayName === "pitching")?.splits?.[0]?.stat || {};

      return {
        id: p.id,
        name: p.fullName,
        position: player.position?.abbreviation || "",
        positionName: player.position?.name || "",
        jerseyNumber: player.jerseyNumber || "",
        batSide: p.batSide?.code || "",
        pitchHand: p.pitchHand?.code || "",
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

    // Pull any signed players stored in Supabase for this teamId
    let storedPlayers = [];
    if (supabase) {
      try {
        const { data: stored, error: storedErr } = await supabase
          .from("players")
          .select("playerid, name, position, team, war, ops, era, age")
          .eq("team", String(teamId));

        if (storedErr) {
          console.warn("Supabase roster load error:", storedErr);
        } else if (stored && stored.length) {
          storedPlayers = stored.map((sp, idx) => {
            const key = sp.playerid ?? idx;
            return {
              id: `FA-${key}`,
              name: sp.name || "Unknown",
              position: sp.position || "",
              positionName: sp.position || "",
              jerseyNumber: "",
              batSide: "",
              pitchHand: "",
              stats: {
                war: sp.war ?? null,
                ops: sp.ops ?? null,
                era: sp.era ?? null
              },
              raw: sp
            };
          });
        }
      } catch (e) {
        console.warn("Supabase roster merge failed:", e);
      }
    }

    res.json([...mlbPlayers, ...storedPlayers]);
  } catch (error) {
    console.error("Error fetching players/stats:", error);
    res.status(500).json({ error: "Failed to fetch player stats" });
  }
});

// -------------------------
// GET free agents from Supabase
// -------------------------
app.get("/api/freeagents", async (_req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on server" });
  }

  try {
    const { data, error } = await supabase
      .from("players")
      .select("playerid, name, position, team, war, ops, era, salary, age")
      .or('team.is.null,team.eq."Free Agent"');

    if (error) {
      console.error("Supabase error loading free agents:", error);
      return res.status(500).json({ error: "Could not load free agents" });
    }

    const normalized = (data || []).map((p, index) => {
      const key = p.playerid ?? index;
      return {
        id: `FA-${key}`,
        name: p.name || "Unknown",
        position: p.position || "N/A",
        team: p.team || "Free Agent",
        age: p.age ?? null,
        war: p.war ?? null,
        ops: p.ops ?? null,
        era: p.era ?? null,
        salary: p.salary ?? null,
        raw: p
      };
    });

    return res.json(normalized);
  } catch (err) {
    console.error("Error reading Supabase free agents:", err);
    return res.status(500).json({ error: "Could not load free agents" });
  }
});

// -------------------------
// Update roster (persist to Supabase)
// -------------------------
app.post("/api/roster/update", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured on server" });
  }

  const { teamId, position, player } = req.body;

  try {
    const playerIdNumber = Number(
      typeof player?.id === "string" ? player.id.replace(/^FA-/, "") : player?.id ?? player?.raw?.playerid
    );
    const payload = {
      name: player?.name || "Unknown",
      position: position || player?.position || null,
      team: teamId ? String(teamId) : null,
      // prefer stats object, then top-level, then raw payload
      war: player?.stats?.war ?? player?.war ?? player?.raw?.war ?? null,
      ops: player?.stats?.ops ?? player?.ops ?? player?.raw?.ops ?? null,
      era: player?.stats?.era ?? player?.era ?? player?.raw?.era ?? null,
      age: player?.age ?? player?.raw?.age ?? null
    };

    if (!Number.isNaN(playerIdNumber)) {
      payload.playerid = playerIdNumber;
    }

    const { data, error } = await supabase
      .from("players")
      .upsert(payload, { onConflict: "playerid" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase roster update error:", error);
      return res.status(500).json({ error: "Failed to persist roster change" });
    }

    return res.json({
      success: true,
      message: "Player signed",
      teamId,
      position,
      player: data
    });
  } catch (err) {
    console.error("Roster update error:", err);
    return res.status(500).json({ error: "Failed to persist roster change" });
  }
});

// -------------------------
app.get("/", (_req, res) => {
  res.send("Armchair GM API is running!");
});
// -------------------------

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
