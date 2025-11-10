import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [selectedTeamLogo, setSelectedTeamLogo] = useState("");

  // ✅ Fetch all MLB teams
  useEffect(() => {
    axios
      .get("http://localhost:8080/api/teams")
      .then((res) => setTeams(res.data))
      .catch((err) => console.error("Error fetching teams:", err));
  }, []);

  // ✅ Fetch players when team changes
  const handleTeamChange = async (e) => {
    const teamId = e.target.value;
    setSelectedTeam(teamId);
    setPlayers([]);
    setSelectedTeamLogo("");
    setSelectedTeamName("");

    if (!teamId) return;
    const selected = teams.find((t) => t.id.toString() === teamId);

    setSelectedTeamName(selected?.name || "");
    setSelectedTeamLogo(
      `https://www.mlbstatic.com/team-logos/${teamId}.svg`
    );

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

  // ✅ Search filter
  const filteredPlayers = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.position.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Sorting handler
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredPlayers].sort((a, b) => {
      if (a[key] === null || a[key] === undefined) return 1;
      if (b[key] === null || b[key] === undefined) return -1;
      if (typeof a[key] === "string") {
        return direction === "asc"
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      }
      return direction === "asc" ? a[key] - b[key] : b[key] - a[key];
    });
    setPlayers(sorted);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>⚾ Armchair GM</h1>

      {/* ✅ Team dropdown */}
      <div style={{ marginBottom: "1rem" }}>
        <select
          value={selectedTeam}
          onChange={handleTeamChange}
          style={{
            padding: "10px",
            fontSize: "16px",
            borderRadius: "5px",
            marginRight: "10px",
          }}
        >
          <option value="">Choose a team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        {/* ✅ Search bar */}
        <input
          type="text"
          placeholder="Search player or position"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px",
            fontSize: "16px",
            borderRadius: "5px",
            width: "250px",
          }}
        />
      </div>

      {/* ✅ Team logo and name */}
      {selectedTeamLogo && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
          <img
            src={selectedTeamLogo}
            alt={selectedTeamName}
            style={{ width: "80px", height: "80px", marginRight: "15px" }}
          />
          <h2>{selectedTeamName}</h2>
        </div>
      )}

      {/* ✅ Loading or empty state */}
      {loading && <p>Loading roster...</p>}
      {!loading && selectedTeam && players.length === 0 && (
        <p>No players found for this team.</p>
      )}

      {/* ✅ Player table */}
      {!loading && filteredPlayers.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={thStyle} onClick={() => handleSort("name")}>Name ⬍</th>
              <th style={thStyle} onClick={() => handleSort("position")}>Position ⬍</th>
              <th style={thStyle} onClick={() => handleSort("avg")}>Batting AVG ⬍</th>
              <th style={thStyle} onClick={() => handleSort("war")}>WAR ⬍</th>
              <th style={thStyle} onClick={() => handleSort("era")}>ERA ⬍</th>
              <th style={thStyle} onClick={() => handleSort("oavg")}>Opp. AVG ⬍</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #ccc" }}>
                <td style={tdStyle}>{p.name}</td>
                <td style={tdStyle}>{p.position}</td>
                <td style={{ ...tdStyle, color: colorByAvg(p.avg) }}>
                  {p.avg || "–"}
                </td>
                <td style={{ ...tdStyle, color: colorByWar(p.war) }}>
                  {p.war || "–"}
                </td>
                <td style={{ ...tdStyle, color: colorByEra(p.era) }}>
                  {p.era || "–"}
                </td>
                <td style={tdStyle}>{p.oavg || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ✅ Color-coding functions
const colorByWar = (war) => {
  if (war == null) return "#000";
  if (war >= 5) return "green";
  if (war >= 2) return "blue";
  return "gray";
};

const colorByEra = (era) => {
  if (era == null) return "#000";
  if (era < 3) return "green";
  if (era < 4.5) return "orange";
  return "red";
};

const colorByAvg = (avg) => {
  if (avg == null) return "#000";
  if (avg >= 0.300) return "green";
  if (avg >= 0.250) return "blue";
  return "gray";
};

// ✅ Styles
const thStyle = {
  padding: "10px",
  border: "1px solid #ddd",
  cursor: "pointer",
  textAlign: "left",
};

const tdStyle = {
  padding: "8px",
  border: "1px solid #ddd",
};

export default App;
