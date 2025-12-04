import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Diamond.css";
import { supabase } from "./supabaseClient";
import AuthForm from "./AuthForm";

function App() {
  const [session, setSession] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [selectedTeamLogo, setSelectedTeamLogo] = useState("");

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedByPosition, setSelectedByPosition] = useState({});
  const [playerStats, setPlayerStats] = useState(null);

  // Free agents
  const [freeAgents, setFreeAgents] = useState([]);
  const [faLoading, setFaLoading] = useState(false);
  const [faSearch, setFaSearch] = useState("");
  const [faPosition, setFaPosition] = useState("all");
  const [faSort, setFaSort] = useState("war_desc");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Sign modal state
  const [showSignModal, setShowSignModal] = useState(false);
  const [faToSign, setFaToSign] = useState(null);
  const [signPosition, setSignPosition] = useState("1B");

  // ---------------------------------------------------------
  // LOAD TEAMS + FREE AGENTS
  // ---------------------------------------------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    axios
      .get("http://localhost:8080/api/teams")
      .then((res) => setTeams(res.data))
      .catch((err) => console.error("Error fetching teams:", err));

    loadFreeAgents();
  }, [session]);

  // Restore selection after teams load
  useEffect(() => {
    if (!session || !teams.length) return;
    const storedTeam = localStorage.getItem("selectedTeam");
    if (storedTeam) {
      const existing = teams.find((t) => t.id.toString() === storedTeam);
      setSelectedTeam(storedTeam);
      setSelectedTeamName(existing?.name || "");
      setSelectedTeamLogo(existing ? `https://www.mlbstatic.com/team-logos/${existing.id}.svg` : "");
      fetchTeamRoster(storedTeam, existing);
    }
  }, [teams]);

  // Restore position selections once players are loaded for the selected team
  useEffect(() => {
    if (!session || !selectedTeam || !players.length) return;
    const saved = localStorage.getItem(`teamSelections:${selectedTeam}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const positions = parsed.positions || {};
        setSelectedByPosition(positions);
        // set a default selectedPlayer for the sidebar if available
        const firstId = positions && Object.values(positions)[0];
        if (firstId) {
          const found = players.find((p) => p.id?.toString() === firstId.toString());
          if (found) {
            setSelectedPlayer(found);
            loadPlayerStats(found);
          }
        }
      } catch (e) {
        console.warn("Failed to restore selections", e);
      }
    }
  }, [players, selectedTeam]);

  const loadFreeAgents = async () => {
    setFaLoading(true);
    try {
      const res = await axios.get("http://localhost:8080/api/freeagents");

      const normalized = res.data.map((fa, index) => ({
        id: fa.id ?? `FA-${index}`,
        name: fa.name || "Unknown",
        position: fa.position || "N/A",
        team: fa.team || "Free Agent",

        // Basic empty stats so UI does NOT break
        war: fa.war ?? 0,
        ops: fa.ops ?? null,
        era: fa.era ?? null,
        avg: fa.avg ?? null,
        obp: fa.obp ?? null,
        slg: fa.slg ?? null,
        hr: fa.hr ?? null,
        rbi: fa.rbi ?? null,
        hits: fa.hits ?? null,
        bb: fa.bb ?? null,
        jersey: fa.jersey ?? "",

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

  const resetFreeAgents = async () => {
    try {
      await axios.post("http://localhost:8080/api/freeagents/reset");
      await loadFreeAgents();
      // refresh current team roster to remove signed FAs from the field
      if (selectedTeam) {
        fetchTeamRoster(selectedTeam);
      }
    } catch (err) {
      console.error("Error resetting free agents:", err);
      alert("Failed to reset free agents.");
    }
  };


  // ---------------------------------------------------------
  // TEAM ROSTER FETCHER (shared between init and dropdown)
  // ---------------------------------------------------------
  const fetchTeamRoster = async (teamId, existingTeam) => {
    setPlayers([]);
    setSelectedPlayer(null);
    setPlayerStats(null);

    if (!teamId) return;
    const selected = existingTeam || teams.find((t) => t.id.toString() === teamId);
    setSelectedTeamName(selected?.name || "");
    setSelectedTeamLogo(selected ? `https://www.mlbstatic.com/team-logos/${selected.id}.svg` : "");

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
  // HANDLE TEAM SELECTION
  // ---------------------------------------------------------
  const handleTeamChange = async (e) => {
    const teamId = e.target.value;
    setSelectedTeam(teamId);
    localStorage.setItem("selectedTeam", teamId || "");
    await fetchTeamRoster(teamId);
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

  const persistSelections = (teamId, positions) => {
    if (!teamId) return;
    localStorage.setItem(
      `teamSelections:${teamId}`,
      JSON.stringify({ positions })
    );
  };

  // ---------------------------------------------------------
  // Save/restore position selections per team
  // ---------------------------------------------------------
  useEffect(() => {
    if (!session || !selectedTeam || !players.length) return;
    // load saved selection IDs for this team and mark selectedPlayer if possible
    const saved = localStorage.getItem(`teamSelections:${selectedTeam}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const firstSelected = players.find((p) => p.id === parsed.lastSelectedId);
        if (firstSelected) {
          setSelectedPlayer(firstSelected);
          // seed stats for FA
          loadPlayerStats(firstSelected);
        }
      } catch (e) {
        console.warn("Failed to restore selections", e);
      }
    }
  }, [players, selectedTeam, session]);

  const saveSelection = (player) => {
    if (!selectedTeam || !player) return;
    const payload = {
      lastSelectedId: player.id
    };
    localStorage.setItem(`teamSelections:${selectedTeam}`, JSON.stringify(payload));
  };

  const selectPlayerForPosition = (posAbbrev, playerId) => {
    if (!playerId) return;
    const found = players.find((p) => p.id?.toString() === playerId);
    if (!found) return;
    setSelectedPlayer(found);
    const updated = {
      ...selectedByPosition,
      [posAbbrev]: playerId
    };
    setSelectedByPosition(updated);
    persistSelections(selectedTeam, updated);
    loadPlayerStats(found);
  };

  // ---------------------------------------------------------
  // LOAD PLAYER STATS FROM MLB API (REAL PLAYERS ONLY)
  // ---------------------------------------------------------
  const loadPlayerStats = async (player) => {
    if (!player) return;
    if (!player.id || player.id.toString().startsWith("FA-")) {
      // Free agent: use stored WAR/OPS/ERA if present
      const war = player.stats?.war ?? player.war ?? null;
      const ops = player.stats?.ops ?? player.ops ?? null;
      const era = player.stats?.era ?? player.era ?? null;
      const avg = player.stats?.avg ?? player.avg ?? null;
      const obp = player.stats?.obp ?? player.obp ?? null;
      const slg = player.stats?.slg ?? player.slg ?? null;
      const hr = player.stats?.hr ?? player.hr ?? null;
      const rbi = player.stats?.rbi ?? player.rbi ?? null;
      const hits = player.stats?.hits ?? player.hits ?? null;
      const bb = player.stats?.bb ?? player.bb ?? null;
      if (war != null || ops != null || era != null) {
        setPlayerStats({
          type: player.position === "P" ? "pitcher" : "hitter",
          war,
          ops,
          era,
          avg,
          obp,
          slg,
          hr,
          rbi,
          hits,
          bb
        });
      } else {
        setPlayerStats(null);
      }
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
      war: faToSign.war ?? null,
      ops: faToSign.ops ?? null,
      era: faToSign.era ?? null,
      stats: {
        war: faToSign.war ?? null,
        ops: faToSign.ops ?? null,
        era: faToSign.era ?? null,
        avg: faToSign.avg ?? null,
        obp: faToSign.obp ?? null,
        slg: faToSign.slg ?? null,
        hr: faToSign.hr ?? null,
        rbi: faToSign.rbi ?? null,
        hits: faToSign.hits ?? null,
        bb: faToSign.bb ?? null
      },
      avg: faToSign.avg ?? null,
      obp: faToSign.obp ?? null,
      slg: faToSign.slg ?? null,
      hr: faToSign.hr ?? null,
      rbi: faToSign.rbi ?? null,
      hits: faToSign.hits ?? null,
      bb: faToSign.bb ?? null,
      raw: faToSign
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
      // persist selection for this position
      const updated = {
        ...selectedByPosition,
        [signPosition]: newPlayer.id?.toString() || ""
      };
      setSelectedByPosition(updated);
      persistSelections(selectedTeam, updated);
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

  const viewFreeAgentStats = (fa) => {
    setSelectedPlayer(fa);
    loadPlayerStats(fa);
  };

  const userEmail = session?.user?.email || "";
  const userInitial = userEmail ? userEmail[0].toUpperCase() : "U";

  const handleLogout = async () => {
    setShowUserMenu(false);
    await supabase.auth.signOut();
  };

  // Derived free agent list with search/filter/sort
  const displayedFreeAgents = freeAgents
    .filter((fa) => {
      const matchesSearch =
        fa.name.toLowerCase().includes(faSearch.toLowerCase()) ||
        (fa.position || "").toLowerCase().includes(faSearch.toLowerCase());
      const matchesPos =
        faPosition === "all" ||
        normalizePosition(fa.position).toLowerCase() === faPosition.toLowerCase();
      return matchesSearch && matchesPos;
    })
    .sort((a, b) => {
      switch (faSort) {
        case "war_desc":
          return (b.war ?? -Infinity) - (a.war ?? -Infinity);
        case "war_asc":
          return (a.war ?? Infinity) - (b.war ?? Infinity);
        case "ops_desc":
          return (b.ops ?? -Infinity) - (a.ops ?? -Infinity);
        case "ops_asc":
          return (a.ops ?? Infinity) - (b.ops ?? Infinity);
        default:
          return 0;
      }
    });

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  if (!session) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#000" }}>
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="top-bar">
        <div className="brand">
          <div className="brand-mark">AG</div>
          <div className="brand-text">
            <div className="brand-title">ARMCHAIR-GM</div>
            <div className="brand-sub">Roster Lab</div>
          </div>
        </div>
        <div className="user-area">
          <span className="user-email">{userEmail || "Logged in"}</span>
          <button
            className="user-chip"
            onClick={() => setShowUserMenu((v) => !v)}
          >
            <span className="user-initial">{userInitial}</span>
            <span className="user-caret">▾</span>
          </button>
          {showUserMenu && (
            <div className="user-menu">
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </header>

      <div className="app-container">

      {/* LEFT SIDEBAR – FREE AGENTS */}
      <aside className="free-agents">
        <div className="fa-header">
          <h2>Free Agents</h2>
          <button className="sign-btn" onClick={resetFreeAgents}>
            Reset
          </button>
        </div>
        <div className="fa-controls">
          <input
            type="text"
            placeholder="Search name or position"
            value={faSearch}
            onChange={(e) => setFaSearch(e.target.value)}
          />
          <div className="fa-filters">
            <select value={faPosition} onChange={(e) => setFaPosition(e.target.value)}>
              <option value="all">All positions</option>
              <option value="p">P</option>
              <option value="c">C</option>
              <option value="1b">1B</option>
              <option value="2b">2B</option>
              <option value="3b">3B</option>
              <option value="ss">SS</option>
              <option value="lf">LF</option>
              <option value="cf">CF</option>
              <option value="rf">RF</option>
            </select>
            <select value={faSort} onChange={(e) => setFaSort(e.target.value)}>
              <option value="war_desc">WAR ↓</option>
              <option value="war_asc">WAR ↑</option>
              <option value="ops_desc">OPS ↓</option>
              <option value="ops_asc">OPS ↑</option>
            </select>
          </div>
        </div>
        {faLoading ? (
          <p>Loading...</p>
        ) : freeAgents.length === 0 ? (
          <p>No free agents available</p>
        ) : (
          <div>
            {displayedFreeAgents.map((fa) => (
              <div key={fa.id} className="fa-player">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {fa.name}
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "#bbb" }}>
                      {fa.position} 
                      {fa.war != null ? ` • war ${fa.war}` : ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="sign-btn" onClick={() => viewFreeAgentStats(fa)}>
                      Stats
                    </button>
                    <button className="sign-btn" onClick={() => openSignModal(fa)}>
                      Sign
                    </button>
                  </div>
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
            <div className="field-markings" aria-hidden="true"></div>
            {Object.entries(positionMap).map(([posAbbrev, cssClass]) => {
              const playersAtPos = getPlayerAtPosition(posAbbrev);

              return (
                <div key={posAbbrev} className={`position ${cssClass}`}>
                  <span className="pos-label">{posAbbrev}</span>

                  {playersAtPos.length > 0 ? (
                    <select
                      className="player-select"
                      value={selectedByPosition[posAbbrev] || ""}
                      onChange={(e) => selectPlayerForPosition(posAbbrev, e.target.value)}
                      onClick={(e) => {
                        // Allow re-selecting the same player to refresh stats
                        if (e.target.value) {
                          selectPlayerForPosition(posAbbrev, e.target.value);
                        }
                      }}
                    >
                      <option value="">Select</option>
                      {playersAtPos.map((p) => (
                        <option key={p.id} value={p.id}>
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
                {selectedPlayer.jerseyNumber || "--"}
              </p>

              {/* Free agent quick stats */}
              {selectedPlayer.id?.toString().startsWith("FA-") && (
                <>
                  <h4>Free Agent Stats</h4>
                  <p><strong>WAR:</strong> {playerStats?.war ?? selectedPlayer.war ?? "N/A"}</p>
                  <p><strong>OPS:</strong> {playerStats?.ops ?? selectedPlayer.ops ?? "N/A"}</p>
                  <p><strong>AVG:</strong> {playerStats?.avg ?? selectedPlayer.avg ?? "N/A"}</p>
                  <p><strong>OBP:</strong> {playerStats?.obp ?? selectedPlayer.obp ?? "N/A"}</p>
                  <p><strong>SLG:</strong> {playerStats?.slg ?? selectedPlayer.slg ?? "N/A"}</p>
                  <p><strong>HR:</strong> {playerStats?.hr ?? selectedPlayer.hr ?? "N/A"}</p>
                  <p><strong>RBI:</strong> {playerStats?.rbi ?? selectedPlayer.rbi ?? "N/A"}</p>
                  <p><strong>Hits:</strong> {playerStats?.hits ?? selectedPlayer.hits ?? "N/A"}</p>
                  <p><strong>BB:</strong> {playerStats?.bb ?? selectedPlayer.bb ?? "N/A"}</p>
                  {normalizePosition(selectedPlayer.position) === "P" && (
                    <p><strong>ERA:</strong> {playerStats?.era ?? selectedPlayer.era ?? "N/A"}</p>
                  )}
                </>
              )}


              {/* HITTER STATS (only for non-free-agent MLB players) */}
              {playerStats?.type === "hitter" && !selectedPlayer.id?.toString().startsWith("FA-") && (
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

              {/* PITCHER STATS (only for non-free-agent MLB players) */}
              {playerStats?.type === "pitcher" && !selectedPlayer.id?.toString().startsWith("FA-") && (
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
    </div>
  );
}

export default App;
