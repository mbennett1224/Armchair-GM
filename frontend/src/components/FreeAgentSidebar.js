import React, { useEffect, useState } from "react";
import axios from "axios";

export default function FreeAgentSidebar({ open, onClose, onAddToPosition, targetPosition }) {
  const [freeAgents, setFreeAgents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    axios.get("http://localhost:8080/api/freeagents")
      .then(res => setFreeAgents(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div style={{
      width: 360,
      background: "#fff",
      padding: 12,
      borderRadius: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)"
    }}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h3>Free Agents</h3>
        <button onClick={onClose}>Close</button>
      </div>
      <p style={{marginTop:0}}>Position: <strong>{targetPosition}</strong></p>
      {loading && <p>Loading...</p>}
      <div>
        {freeAgents.map(fa => (
          <div key={fa.PlayerID} className="free-agent">
            <div>
              <div style={{fontWeight:600}}>{fa.Name}</div>
              <div className="meet">{fa.Position} • WAR: {fa.WAR ?? "—"}</div>
            </div>
            <div>
              <button className="btn-add" onClick={() => onAddToPosition(fa)}>Add</button>
            </div>
          </div>
        ))}
        {freeAgents.length === 0 && !loading && <div>No free agents listed.</div>}
      </div>
    </div>
  );
}
