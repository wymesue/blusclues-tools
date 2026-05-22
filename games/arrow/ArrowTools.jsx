import { useState } from "react";
import Generator from "./generator.jsx";
import Editor from "./editor.jsx";

// ── ARROW TOOLS ───────────────────────────────────────────────────────────────
// Self-contained wrapper for Snake Escape generator + editor.
// Main.jsx knows nothing about generators or editors — just this component.

export default function ArrowTools() {
  const [tab,        setTab]        = useState("generator");
  const [levels,     setLevels]     = useState(null);
  const [difficulty, setDifficulty] = useState(null);

  const handleSendToEditor = (generatedLevels, diff) => {
    setLevels(generatedLevels);
    setDifficulty(diff);
    setTab("editor");
  };

  const s = {
    nav: { display:"flex", background:"#0d1535", borderBottom:"1px solid #1a2040", padding:"0 12px", gap:4 },
    btn: (active) => ({
      background:"none", border:"none",
      borderBottom: active ? "2px solid #7bed9f" : "2px solid transparent",
      color: active ? "#7bed9f" : "#4a5580",
      padding:"10px 14px", cursor:"pointer",
      fontSize:12, fontFamily:"monospace", fontWeight: active ? 700 : 400,
    }),
  };

  return (
    <div>
      <div style={s.nav}>
        <button style={s.btn(tab==="generator")} onClick={() => setTab("generator")}>Generator</button>
        <button style={s.btn(tab==="editor")}    onClick={() => setTab("editor")}>
          Editor {levels ? `(${levels.length} levels)` : ""}
        </button>
      </div>
      {tab === "generator" && <Generator onSendToEditor={handleSendToEditor} />}
      {tab === "editor"    && <Editor levels={levels} difficulty={difficulty} />}
    </div>
  );
}
