import { useState, useEffect } from "react";

function TeamRoster({ teamId = 111 }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:8080/api/team/${teamId}/players`)
      .then((res) => res.json())
      .then((data) => setPlayers(data))
      .catch((err) => console.error(err));
  }, [teamId]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Team Roster</h1>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Position</th>
            <th className="border px-2 py-1">Jersey #</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td className="border px-2 py-1">{p.name}</td>
              <td className="border px-2 py-1">{p.position}</td>
              <td className="border px-2 py-1">{p.jerseyNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TeamRoster;
