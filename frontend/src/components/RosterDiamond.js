import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/diamond.css";

/* map from position abbreviations to CSS class names */
const POS_TO_CLASS = {
  P: "p",
  C: "c",
  "1B": "base1",
  "2B": "base2",
  SS: "ss",
  "3B": "base3",
  LF: "lf",
  CF: "cf",
  RF: "rf",
  DH: "dh",
};

const POSITIONS = [
  { key: "P", label: "Pitcher" },
  { key: "C", label: "Catcher" },
  { key: "1B", label: "1B" },
  { key: "2B", label: "2B" },
  { key: "SS", label: "SS" },
  { key: "3B", label: "3B" },
  { key: "LF", label: "LF" },
  { key: "CF", label: "CF" },
  { key: "RF", label: "RF" },
  { key: "DH", label: "DH" },
];

export default function RosterDiamond({ teamId, onSelectPosition }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!teamId) return;
    (async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/teams/${teamId}/players`);
        // res.data is array of players with fields: name, position, avg, war, era, etc.
        setPlayers(res.data || []);
      } catch (err) {
        console.error("Failed to load team players", err);
      }
    })();
  }, [teamId]);

  const findPlayerFor = (posKey) =>
    players.find((p) => {
      // match by MLB position abbreviation or name
      const pos = (p.position || "").toUpperCase();
      // some API return "Right Field", "RF", etc.
      return pos.includes(posKey) || (p.primaryPosition && p.primaryPosition === posKey);
    });

  return (
    <div className="diamond-layout">
      <div className="diamond-container" role="region" aria-label="Roster Diamond">
        {POSITIONS.map((pos) => {
          const cssClass = POS_TO_CLASS[pos.key] || "position";
          const player = findPlayerFor(pos.key);
          return (
            <div
              key={pos.key}
              className={`position ${cssClass}`}
              onClick={() => onSelectPosition && onSelectPosition(pos.key, player)}
              title={player ? `${player.name} — ${player.position}` : `${pos.label} (empty)`}
            >
              <strong>{pos.key}</strong>
              <div style={{fontSize: "0.85rem", marginTop: 6}}>
                {player ? (
                  <>
                    <div>{player.name}</div>
                    <div style={{fontSize: "0.8rem", color:"#666"}}>
                      {player.avg ? `AVG: ${player.avg}` : ""} {player.war ? `WAR: ${player.war}` : ""}
                    </div>
                  </>
                ) : (
                  <em style={{color:"#777"}}>Empty</em>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
