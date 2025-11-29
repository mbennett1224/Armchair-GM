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

  // Free agents
  const [freeAgents, setFreeAgents] = useState([]);
  const [faLoading, setFaLoading] = useState(false);

  // Sign modal state
  const [showSignModal, setShowSignModal] = useState(false);
  const [faToSign, setFaToSign] = useState(null);
  const [signPosition, setSignPosition] = useState("1B");

  // ---------------------------------------------------------
  // LOAD TEAMS + FREE AGENTS
  // ---------------------------------------------------------
  useEffect(() => {
    axios
      .get("http://localhost:8080/api/teams")
      .then((res) => setTeams(res.data))
      .catch((err) => console.error("Error fetching teams:", err));

    loadFreeAgents();
  }, []);

  const loadFreeAgents = async () => {
  setFaLoading(true);
  try {
    const res = await axios.get("/free_agents.json");

    const normalized = res.data.map((fa, index) => ({
      id: `FA-${index}`,          // guaranteed unique
      name: fa.name || "Unknown",
      position: fa.position || "N/A",
      team: "Free Agent",
      age: fa.age ?? null,

      // Basic empty stats so UI does NOT break
      war: fa.war ?? 0,
      ops: fa.ops ?? null,
      era: fa.era ?? null,

      // store raw object
      raw: fa
    }));

    setFreeAgents(normalized);
  } catch (err) {
    console.error("Error loading free agents:", err);
    setFreeAgents([]);
  } finally {
    setFaLoading(false);
  }
};


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
      setPlayers(res.data || []);
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
  // DIAMOND MAPPING
  // ---------------------------------------------------------
  const positionMap = {
    P: "pitcher",
    C: "catcher",
    "1B": "first-base",
    "2B": "second-base",
    "3B": "third-base",
    SS: "shortstop",
    LF: "left-field",
    CF: "center-field",
    RF: "right-field",
  };

  const getPlayerAtPosition = (positionAbbrev) =>
    players.filter((p) => normalizePosition(p.position) === positionAbbrev);

  // ---------------------------------------------------------
  // LOAD PLAYER STATS FROM MLB API (REAL PLAYERS ONLY)
  // ---------------------------------------------------------
  const loadPlayerStats = async (player) => {
    if (!player) return;
    if (!player.id || player.id.toString().startsWith("FA-")) {
      // Free agent created by you → no stat lookup
      setPlayerStats(null);
      return;
    }

    const id = player.id;
    const isPitcher = player.position === "P";
    const group = isPitcher ? "pitching" : "hitting";

    try {
      const res = await axios.get(
        `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=season&group=${group}`
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

  // ---------------------------------------------------------
  // SIGN MODAL OPEN
  // ---------------------------------------------------------
  const openSignModal = (fa) => {
    if (!selectedTeam) {
      alert("Please choose a team before signing a free agent.");
      return;
    }

    setFaToSign(fa);

    const pos = fa.position;
    setSignPosition(pos in positionMap ? pos : "1B");

    setShowSignModal(true);
  };

  // ---------------------------------------------------------
  // CONFIRM SIGN
  // ---------------------------------------------------------
  const confirmSign = async () => {
    if (!faToSign) return;
    if (!selectedTeam) {
      alert("Select a team first.");
      setShowSignModal(false);
      return;
    }

    const newPlayer = {
      id: faToSign.id,
      name: faToSign.name,
      position: signPosition,
      jerseyNumber: "",
      stats: {}
    };

    try {
      await axios.post("http://localhost:8080/api/roster/update", {
        teamId: selectedTeam,
        position: signPosition,
        player: newPlayer,
      });

      setFreeAgents((prev) => prev.filter((f) => f.id !== faToSign.id));
      setPlayers((prev) => [newPlayer, ...prev]);
      setSelectedPlayer(newPlayer);
      loadPlayerStats(newPlayer); // will skip if FA

    } catch (err) {
      console.error("Error signing player:", err);
      alert("Failed to sign player.");
    } finally {
      setShowSignModal(false);
      setFaToSign(null);
    }
  };

  const cancelSign = () => {
    setShowSignModal(false);
    setFaToSign(null);
  };

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <div className="app-container">

      {/* LEFT SIDEBAR — FREE AGENTS */}
      <aside className="free-agents">
        <h2>Free Agents</h2>
        {faLoading ? (
          <p>Loading...</p>
        ) : freeAgents.length === 0 ? (
          <p>No free agents available</p>
        ) : (
          <div>
            {freeAgents.map((fa) => (
              <div key={fa.id} className="fa-player">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {fa.name}
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "#bbb" }}>
                      {fa.position} 
                      {fa.war != null ? ` • WAR ${fa.war}` : ""}
                    </div>
                  </div>

                  <button className="sign-btn" onClick={() => openSignModal(fa)}>
                    Sign
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* MAIN DISPLAY */}
      <main className="main-layout">
        {/* DIAMOND + SCOREBOARD */}
        <div className="diamond-container">
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

          {/* DIAMOND */}
          <div className="diamond">
            {Object.entries(positionMap).map(([posAbbrev, cssClass]) => {
              const playersAtPos = getPlayerAtPosition(posAbbrev);

              return (
                <div key={posAbbrev} className={`position ${cssClass}`}>
                  <span className="pos-label">{posAbbrev}</span>

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
                <strong>Jersey #:</strong>{" "}
                {selectedPlayer.jerseyNumber || "—"}
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
                  <p><strong>W-L:</strong> {playerStats.wins}-{playerStats.losses}</p>
                </>
              )}

              {/* FREE AGENTS (NO MLB STATS) */}
              {!playerStats && !selectedPlayer.id?.toString().startsWith("FA-") && (
                <p>No stats available.</p>
              )}
            </>
          )}
        </aside>
      </main>

      {/* SIGN MODAL */}
      {showSignModal && faToSign && (
        <div className="modal-overlay" onClick={cancelSign}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Sign {faToSign.name}</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ marginRight: 8 }}>Choose position:</label>
              <select
                value={signPosition}
                onChange={(e) => setSignPosition(e.target.value)}
              >
                <option value="P">P</option>
                <option value="C">C</option>
                <option value="1B">1B</option>
                <option value="2B">2B</option>
                <option value="3B">3B</option>
                <option value="SS">SS</option>
                <option value="LF">LF</option>
                <option value="CF">CF</option>
                <option value="RF">RF</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-cancel" onClick={cancelSign}>Cancel</button>
              <button className="btn-confirm" onClick={confirmSign}>Confirm Sign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
