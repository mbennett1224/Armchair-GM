import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Diamond.css";

function App() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [selectedTeamLogo, setSelectedTeamLogo] = useState("");

  // ✅ Fetch all MLB teams
  useEffect(() => {
    axios
      .get("http://localhost:8080/api/teams")
      .then((res) => setTeams(res.data))
      .catch((err) => console.error("Error fetching teams:", err));
  }, []);

  // ✅ Fetch players when a team is chosen
  const handleTeamChange = async (e) => {
    const teamId = e.target.value;
    setSelectedTeam(teamId);
    setPlayers([]);

    if (!teamId) return;
    const selected = teams.find((t) => t.id.toString() === teamId);
    setSelectedTeamName(selected?.name || "");
    setSelectedTeamLogo(`https://www.mlbstatic.com/team-logos/${teamId}.svg`);

    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8080/api/teams/${teamId}/players`);
      setPlayers(res.data);
    } catch (err) {
      console.error("Error fetching players:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const getPlayerAtPosition = (pos) =>
    players.filter((p) => p.position.toUpperCase().includes(pos));

  const freeAgents = [
    { name: "Shohei Ohtani", position: "DH", team: "FA" },
    { name: "Blake Snell", position: "P", team: "FA" },
    { name: "Cody Bellinger", position: "OF", team: "FA" },
  ];

  return (
    <div className="app-container">
      {/* Sidebar for free agents */}
      <aside className="sidebar">
        <h3>Free Agents</h3>
        <input
          type="text"
          placeholder="Search free agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ul>
          {freeAgents
            .filter((fa) =>
              fa.name.toLowerCase().includes(search.toLowerCase())
            )
            .map((fa, idx) => (
              <li key={idx}>
                <strong>{fa.name}</strong> ({fa.position})
              </li>
            ))}
        </ul>
      </aside>

      {/* Main diamond view */}
      <main className="diamond-container">
        {/* Scoreboard header */}
        <div className="scoreboard">
          {selectedTeamLogo && (
            <img
              src={selectedTeamLogo}
              alt={selectedTeamName}
              className="scoreboard-logo"
            />
          )}
          <h1 className="scoreboard-title">
            {selectedTeamName ? selectedTeamName : "Armchair GM"}
          </h1>
        </div>

        {/* Team dropdown */}
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

        {/* Diamond field */}
        <div className="diamond">
          {Object.entries(positionMap).map(([abbr, cssClass]) => {
            const positionPlayers = getPlayerAtPosition(abbr);

            return (
              <div key={abbr} className={`position ${cssClass}`}>
                <span className="pos-label">{abbr}</span>

                {positionPlayers.length > 0 ? (
                  <select className="player-select">
                    {positionPlayers.map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name} ({p.avg ? `AVG: ${p.avg}` : p.era ? `ERA: ${p.era}` : "–"})
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
      </main>
    </div>
  );
}

export default App;
