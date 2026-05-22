import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import ArrowTools from "./games/arrow/ArrowTools.jsx";

// ── ROOT ──────────────────────────────────────────────────────────────────────
// Add new game tool imports here as they get built:
// import SudokuTools from "./games/sudoku/SudokuTools.jsx";

const GAMES = [
  { id: "arrow", label: "Snake Escape", component: ArrowTools },
  // { id: "sudoku", label: "Sudoku", component: SudokuTools },
];

function Root() {
  const [activeGame, setActiveGame] = useState("arrow");

  const s = {
    nav: { display:"flex", background:"#090d1f", borderBottom:"1px solid #1a2040", padding:"0 16px", gap:4, alignItems:"center" },
    btn: (active) => ({
      background:"none", border:"none",
      borderBottom: active ? "2px solid #4a9eff" : "2px solid transparent",
      color: active ? "#4a9eff" : "#4a5580",
      padding:"12px 16px", cursor:"pointer",
      fontSize:13, fontFamily:"monospace", fontWeight: active ? 700 : 400,
    }),
  };

  const ActiveTools = GAMES.find(g => g.id === activeGame)?.component;

  return (
    <div style={{ minHeight:"100vh", background:"#0d1020" }}>
      <div style={s.nav}>
        <span style={{ color:"#4a5580", fontFamily:"monospace", fontSize:13, padding:"12px 8px" }}>🔵 Blu's Clues Tools</span>
        {GAMES.map(g => (
          <button key={g.id} style={s.btn(activeGame === g.id)} onClick={() => setActiveGame(g.id)}>
            {g.label}
          </button>
        ))}
      </div>
      {ActiveTools && <ActiveTools />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode><Root /></StrictMode>
);
