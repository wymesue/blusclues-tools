import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import Generator from "./games/arrow/generator.jsx";

function Root() {
  const [tool, setTool] = useState("arrow-generator");

  const s = {
    nav: { display:"flex", background:"#090d1f", borderBottom:"1px solid #1a2040", padding:"0 16px", gap:4 },
    btn: (active) => ({
      background:"none", border:"none",
      borderBottom: active ? "2px solid #4a9eff" : "2px solid transparent",
      color: active ? "#4a9eff" : "#4a5580",
      padding:"12px 16px", cursor:"pointer",
      fontSize:13, fontFamily:"monospace", fontWeight: active ? 700 : 400,
    }),
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0d1020" }}>
      <div style={s.nav}>
        <span style={{ color:"#4a5580", fontFamily:"monospace", fontSize:13, padding:"12px 8px" }}>🔵 Tools</span>
        <button style={s.btn(tool==="arrow-generator")} onClick={() => setTool("arrow-generator")}>Snake Escape — Generator</button>
        <button style={s.btn(tool==="arrow-editor")} disabled>Snake Escape — Editor</button>
      </div>
      {tool === "arrow-generator" && <Generator />}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode><Root /></StrictMode>
);
