import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Diamond.css";

function App() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [selectedTeamLogo, setSelectedTeamLogo] = useState("");

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);

  // ---------------------------------------------------------
  // LOAD TEAMS
  // ---------------------------------------------------------
  useEffect(() => {
    axios
      .get("http://localhost:8080/api/teams")
      .then((res) => setTeams(res.data))
      .catch((err) => console.error("Error fetching teams:", err));
  }, []);

  // ---------------------------------------------------------
  // HANDLE TEAM SELECTION
  // ---------------------------------------------------------
  const handleTeamChange = async (e) => {
    const teamId = e.target.value;
    setSelectedTeam(teamId);
    setPlayers([]);
    setSelectedPlayer(null);
    setPlayerStats(null);

    if (!teamId) return;

    const selected = teams.find((t) => t.id.toString() === teamId);
    setSelectedTeamName(selected?.name || "");
    setSelectedTeamLogo(`https://www.mlbstatic.com/team-logos/${teamId}.svg`);

    setLoading(true);

    try {
      const res = await axios.get(
        `http://localhost:8080/api/teams/${teamId}/players`
      );
      setPlayers(res.data);
    } catch (err) {
      console.error("Player fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // POSITION NORMALIZER
  // ---------------------------------------------------------
  const normalizePosition = (pos) => {
    if (!pos) return "";
    const map = {
      P: "P",
      C: "C",
      "1B": "1B",
      "2B": "2B",
      "3B": "3B",
      SS: "SS",
      LF: "LF",
      CF: "CF",
      RF: "RF",
    };
    return map[pos] || pos;
  };

  // ---------------------------------------------------------
  // DIAMOND MAPPING (MATCHES CSS)
  // ---------------------------------------------------------
  const positionMap = {
    "P": "pitcher",
    "C": "catcher",
    "1B": "first-base",
    "2B": "second-base",
    "3B": "third-base",
    "SS": "shortstop",
    "LF": "left-field",
    "CF": "center-field",
    "RF": "right-field",
  };

  const getPlayerAtPosition = (positionName) => {
    return players.filter(
      (p) => normalizePosition(p.position) === positionName
    );
  };

  // ---------------------------------------------------------
  // LOAD PLAYER STATS FROM MLB API
  // ---------------------------------------------------------
  const loadPlayerStats = async (player) => {
    if (!player) return;

    const isPitcher = player.position === "P";
    const group = isPitcher ? "pitching" : "hitting";

    try {
      const res = await axios.get(
        `https://statsapi.mlb.com/api/v1/people/${player.id}/stats?stats=season&group=${group}`
      );

      const statObj = res.data.stats?.[0]?.splits?.[0]?.stat || null;

      setPlayerStats({
        type: isPitcher ? "pitcher" : "hitter",
        ...statObj,
      });
    } catch (err) {
      console.error("Stats load error:", err);
      setPlayerStats(null);
    }
  };

  return (
    <div className="app-container">

      {/* LEFT SIDEBAR — FREE AGENTS (TEMP PLACEHOLDER) */}
      <aside className="free-agents">
        <h2>Free Agents</h2>
        {players.length === 0 ? (
          <p>No team selected</p>
        ) : (
          players.map((p) => (
            <div key={p.id} className="fa-player">
              {p.name}
            </div>
          ))
        )}
      </aside>

      {/* MAIN LAYOUT */}
      <main className="main-layout">

        {/* DIAMOND AND SCOREBOARD */}
        <div className="diamond-container">

          {/* SCOREBOARD */}
          <div className="scoreboard">
            {selectedTeamLogo && (
              <img
                src={selectedTeamLogo}
                alt={selectedTeamName}
                className="scoreboard-logo"
              />
            )}
            <h1 className="scoreboard-title">
              {selectedTeamName || "Armchair GM"}
            </h1>
          </div>

          {/* TEAM DROPDOWN */}
          <div className="controls">
            <select value={selectedTeam} onChange={handleTeamChange}>
              <option value="">Choose a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* BASEBALL DIAMOND */}
          {/* WRAPPER TO ROTATE DIAMOND */}
            <div className="diamond">
              {Object.entries(positionMap).map(([fullName, cssClass]) => {
                const playersAtPos = getPlayerAtPosition(fullName);

                return (
                  <div key={fullName} className={`position ${cssClass}`}>
                    <span className="pos-label">
                      {fullName.replace("Fielder", "F")}
                    </span>

                    {playersAtPos.length > 0 ? (
                      <select
                        className="player-select"
                        onChange={(e) => {
                          const found = players.find(
                            (p) => p.name === e.target.value
                          );
                          setSelectedPlayer(found);
                          loadPlayerStats(found);
                        }}
                      >
                        <option>Select</option>
                        {playersAtPos.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p>–</p>
                    )}
                  </div>
                );
              })}
            </div>

          {loading && <p>Loading roster...</p>}
        </div>

        {/* RIGHT SIDEBAR — PLAYER STATS */}
        <aside className="stats-sidebar">
          {!selectedPlayer && <p>Select a player</p>}

          {selectedPlayer && (
            <>
              <h3>{selectedPlayer.name}</h3>
              <p>
                <strong>Position:</strong>{" "}
                {normalizePosition(selectedPlayer.position)}
              </p>
              <p>
                <strong>Jersey #:</strong> {selectedPlayer.jerseyNumber}
              </p>

              {/* HITTER STATS */}
              {playerStats?.type === "hitter" && (
                <>
                  <h4>Hitting Stats</h4>
                  <p><strong>AVG:</strong> {playerStats.avg}</p>
                  <p><strong>OBP:</strong> {playerStats.obp}</p>
                  <p><strong>SLG:</strong> {playerStats.slg}</p>
                  <p><strong>OPS:</strong> {playerStats.ops}</p>
                  <p><strong>HR:</strong> {playerStats.homeRuns}</p>
                  <p><strong>RBI:</strong> {playerStats.rbi}</p>
                  <p><strong>Hits:</strong> {playerStats.hits}</p>
                  <p><strong>BB:</strong> {playerStats.baseOnBalls}</p>
                </>
              )}

              {/* PITCHER STATS */}
              {playerStats?.type === "pitcher" && (
                <>
                  <h4>Pitching Stats</h4>
                  <p><strong>ERA:</strong> {playerStats.era}</p>
                  <p><strong>WHIP:</strong> {playerStats.whip}</p>
                  <p><strong>K/9:</strong> {playerStats.strikeoutsPer9Inn}</p>
                  <p><strong>BB/9:</strong> {playerStats.walksPer9Inn}</p>
                  <p><strong>HR/9:</strong> {playerStats.homeRunsPer9Inn}</p>
                  <p><strong>K%:</strong> {playerStats.strikePercentage}</p>
                  <p><strong>IP:</strong> {playerStats.inningsPitched}</p>
                  <p>
                    <strong>W-L:</strong> {playerStats.wins}-
                    {playerStats.losses}
                  </p>
                </>
              )}
            </>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
