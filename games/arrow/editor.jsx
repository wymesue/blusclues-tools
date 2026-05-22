import { useState, useCallback } from "react";
import { supabase } from "../../lib/supabase.js";
import { DV, DK, simulateExit, getExitRayCells } from "./arrow-logic.js";

// ── SOLVER ────────────────────────────────────────────────────────────────────
function solve(snakes, cols, rows) {
  // Returns ordered solution array or null if unsolvable
  const tryOrder = (remaining, cleared, order) => {
    if (remaining.length === 0) return order;
    for (const snake of remaining) {
      if (simulateExit(snake, remaining, cols, rows)) {
        const next = remaining.filter(s => s.id !== snake.id);
        const result = tryOrder(next, [...cleared, snake.id], [...order, snake.id]);
        if (result) return result;
      }
    }
    return null;
  };
  return tryOrder(snakes, [], []);
}

function estimateTime(snakes, solutionOrder) {
  if (!solutionOrder) return null;
  // Base time per snake tap (seconds)
  const basePerSnake = 4;
  // Penalty for dependency depth
  const depthPenalty = solutionOrder.length * 1.5;
  // Penalty for total snakes
  const countPenalty = snakes.length * 0.8;
  const total = Math.round(basePerSnake * snakes.length + depthPenalty + countPenalty);
  const low  = Math.max(5, Math.round(total * 0.6));
  const high = Math.round(total * 1.8);
  return { low, high, total };
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const DIRS     = ["R", "L", "U", "D"];
const DIR_LABEL = { R:"→", L:"←", U:"↑", D:"↓" };
const COLORS   = ["#ff6b6b","#4ecdc4","#ffd93d","#ff8cc8","#a8e6cf","#c3a6ff","#7bed9f","#ffb347","#45b7d1","#fd79a8","#a29bfe","#55efc4"];
const DIFF_COLOR = { easy:"#7bed9f", medium:"#ffd93d", hard:"#ff6b6b", expert:"#a29bfe" };

// ── MINI GRID ─────────────────────────────────────────────────────────────────
function MiniGrid({ level, selectedId, onSelectSnake, highlightOrder, step }) {
  if (!level) return null;
  const { cols, rows, snakes } = level;
  const CELL = Math.min(Math.floor(520 / cols), Math.floor(600 / rows), 44);

  const cellMap = new Map();
  snakes.forEach(s => s.cells.forEach(c => cellMap.set(`${c.x},${c.y}`, s.id)));

  const solvedIds = step != null && highlightOrder
    ? new Set(highlightOrder.slice(0, step))
    : new Set();

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <svg width={cols * CELL} height={rows * CELL} style={{ display:"block", cursor:"pointer" }}>
        {/* Grid dots */}
        {Array.from({ length:rows }, (_, r) =>
          Array.from({ length:cols }, (_, c) => (
            <circle key={`d${c}-${r}`}
              cx={c * CELL + CELL/2} cy={r * CELL + CELL/2} r={1.5} fill="#2a3050"/>
          ))
        )}

        {/* Snakes */}
        {snakes.map(sn => {
          const isSel   = selectedId === sn.id;
          const isSolved = solvedIds.has(sn.id);
          const color   = isSolved ? "#2a3050" : COLORS[sn.id % COLORS.length];
          const stroke  = isSel ? "#fff" : color;
          const sw      = isSel ? 4 : 3;
          const pts     = sn.cells.map(c => `${c.x * CELL + CELL/2},${c.y * CELL + CELL/2}`);
          const d       = pts.length > 1 ? `M${pts[0]} ${pts.slice(1).map(p=>`L${p}`).join(" ")}` : "";
          const hx      = sn.cells[0].x * CELL + CELL/2;
          const hy      = sn.cells[0].y * CELL + CELL/2;
          const half    = CELL * 0.45;
          const wing    = CELL * 0.18;
          const arr = {
            R:{ tx:hx+half, ty:hy,      w1x:hx+half-wing*1.2, w1y:hy-wing, w2x:hx+half-wing*1.2, w2y:hy+wing },
            L:{ tx:hx-half, ty:hy,      w1x:hx-half+wing*1.2, w1y:hy-wing, w2x:hx-half+wing*1.2, w2y:hy+wing },
            D:{ tx:hx,      ty:hy+half, w1x:hx-wing, w1y:hy+half-wing*1.2, w2x:hx+wing, w2y:hy+half-wing*1.2 },
            U:{ tx:hx,      ty:hy-half, w1x:hx-wing, w1y:hy-half+wing*1.2, w2x:hx+wing, w2y:hy-half+wing*1.2 },
          }[sn.dir];

          return (
            <g key={sn.id} onClick={() => onSelectSnake(sn.id)} style={{ cursor:"pointer" }}>
              {isSel && <rect x={sn.cells.reduce((m,c)=>Math.min(m,c.x),99)*CELL}
                y={sn.cells.reduce((m,c)=>Math.min(m,c.y),99)*CELL}
                width={(sn.cells.reduce((m,c)=>Math.max(m,c.x),-1)-sn.cells.reduce((m,c)=>Math.min(m,c.x),99)+1)*CELL}
                height={(sn.cells.reduce((m,c)=>Math.max(m,c.y),-1)-sn.cells.reduce((m,c)=>Math.min(m,c.y),99)+1)*CELL}
                fill="#ffffff08" rx={4}/>}
              {d && <path d={d} fill="none" stroke={stroke} strokeWidth={sw}
                strokeLinecap="round" strokeLinejoin="round" opacity={isSolved?0.2:1}/>}
              <line x1={hx} y1={hy} x2={arr.tx} y2={arr.ty} stroke={stroke} strokeWidth={sw} strokeLinecap="round" opacity={isSolved?0.2:1}/>
              <line x1={arr.w1x} y1={arr.w1y} x2={arr.tx} y2={arr.ty} stroke={stroke} strokeWidth={sw} strokeLinecap="round" opacity={isSolved?0.2:1}/>
              <line x1={arr.w2x} y1={arr.w2y} x2={arr.tx} y2={arr.ty} stroke={stroke} strokeWidth={sw} strokeLinecap="round" opacity={isSolved?0.2:1}/>
            </g>
          );
        })}
      </svg>
      <div style={{ color:"#4a5070", fontSize:11 }}>{cols}×{rows} · {snakes.length} snakes</div>
    </div>
  );
}

// ── EDITOR ────────────────────────────────────────────────────────────────────
export default function Editor({ levels: initialLevels, difficulty }) {
  const [levels,     setLevels]     = useState(initialLevels || []);
  const [selLevel,   setSelLevel]   = useState(0);
  const [selSnake,   setSelSnake]   = useState(null);
  const [solutions,  setSolutions]  = useState({});   // levelIdx → order array or null
  const [solveStep,  setSolveStep]  = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState({});   // levelIdx → true

  const level = levels[selLevel];
  const sol   = solutions[selLevel];
  const snake = level?.snakes.find(s => s.id === selSnake);

  // ── SOLVE ──
  const runSolve = () => {
    if (!level) return;
    const order = solve(level.snakes, level.cols, level.rows);
    setSolutions(prev => ({ ...prev, [selLevel]: order }));
    setSolveStep(0);
  };

  const stepForward  = () => setSolveStep(s => Math.min(s + 1, sol?.length ?? 0));
  const stepBackward = () => setSolveStep(s => Math.max(s - 1, 0));
  const resetSteps   = () => setSolveStep(0);

  // ── EDIT ──
  const changeDir = (dir) => {
    if (!snake) return;
    setLevels(prev => prev.map((l, i) => i !== selLevel ? l : {
      ...l,
      snakes: l.snakes.map(s => s.id === selSnake ? { ...s, dir } : s)
    }));
    setSolutions(prev => ({ ...prev, [selLevel]: undefined }));
    setSolveStep(null);
  };

  const deleteSnake = () => {
    if (selSnake == null) return;
    setLevels(prev => prev.map((l, i) => i !== selLevel ? l : {
      ...l,
      snakes: l.snakes.filter(s => s.id !== selSnake)
    }));
    setSelSnake(null);
    setSolutions(prev => ({ ...prev, [selLevel]: undefined }));
    setSolveStep(null);
  };

  // ── SAVE TO DB ──
  const saveLevel = async () => {
    if (!level || !sol) return;
    setSaving(true);
    const diff = level.difficulty || difficulty || "easy";

    // Get next position for this game + difficulty
    const { data: existing } = await supabase
      .from("levels")
      .select("position")
      .eq("game", "snake_escape")
      .eq("difficulty", diff)
      .order("position", { ascending: false })
      .limit(1);

    const nextPos = existing?.[0]?.position ? existing[0].position + 1 : 1;

    const { error } = await supabase.from("levels").insert({
      game:       "snake_escape",
      difficulty: diff,
      position:   nextPos,
      data:       { cols: level.cols, rows: level.rows, snakes: level.snakes },
      active:     true,
    });

    if (!error) setSaved(prev => ({ ...prev, [selLevel]: true }));
    setSaving(false);
  };

  const timeEst = sol ? estimateTime(level.snakes, sol) : null;

  const s = {
    page:    { minHeight:"100vh", background:"#0d1020", color:"#fff", fontFamily:"monospace", display:"flex" },
    sidebar: { width:280, background:"#090d1f", borderRight:"1px solid #1a2040", display:"flex", flexDirection:"column", flexShrink:0 },
    main:    { flex:1, padding:24, display:"flex", gap:24 },
    panel:   { background:"#141828", border:"1px solid #1e2438", borderRadius:12, padding:20 },
    btn:     (color, disabled) => ({
      background: disabled ? "#1a2040" : color,
      border:"none", borderRadius:8, color: disabled ? "#2a3060" : "#0d1020",
      padding:"10px 20px", fontSize:15, cursor: disabled ? "default" : "pointer", fontWeight:700,
    }),
    btnSm:   (active) => ({
      background: active ? "#4a9eff" : "#1e2438",
      border:"1px solid #2a3050", borderRadius:6,
      color: active ? "#fff" : "#c8cfe0",
      padding:"7px 14px", fontSize:14, cursor:"pointer",
    }),
    tag: (color) => ({
      fontSize:13, padding:"3px 10px", borderRadius:4,
      background:`${color}22`, color, border:`1px solid ${color}44`,
    }),
  };

  const statusIcon = (idx) => {
    const s = solutions[idx];
    if (s === undefined) return "•";
    if (s === null) return "❌";
    return "✅";
  };

  return (
    <div style={s.page}>
      <style>{`
        ::-webkit-scrollbar { width:6px } 
        ::-webkit-scrollbar-track { background:#090d1f }
        ::-webkit-scrollbar-thumb { background:#1e2438; border-radius:3px }
      `}</style>

      {/* Sidebar — level list */}
      <div style={s.sidebar}>
        <div style={{ padding:"16px 14px", borderBottom:"1px solid #1a2040",
          fontSize:16, fontWeight:700, color:"#4a9eff" }}>
          🐍 Levels ({levels.length})
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {levels.map((l, i) => (
            <div key={i} onClick={() => { setSelLevel(i); setSelSnake(null); setSolveStep(null); }}
              style={{ padding:"14px 16px", borderBottom:"1px solid #0d1020",
                background: i === selLevel ? "#1a2040" : "transparent",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:15, color:"#c8cfe0" }}>Level {i + 1}</div>
                <div style={{ fontSize:13, color:"#4a5070" }}>{l.cols}×{l.rows} · {l.snakes.length} snakes</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                <span style={{ fontSize:18 }}>{statusIcon(i)}</span>
                {saved[i] && <span style={{ fontSize:11, color:"#7bed9f" }}>saved</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div style={s.main}>
        {!level ? (
          <div style={{ color:"#4a5070", fontSize:14, margin:"auto" }}>
            No levels loaded. Generate levels first and send them here.
          </div>
        ) : (
          <>
            {/* Grid panel */}
            <div style={{ ...s.panel, flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
              <div style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ fontSize:13, color:"#c8cfe0", fontWeight:700 }}>Level {selLevel + 1}</div>
                <span style={s.tag(DIFF_COLOR[level.difficulty || difficulty || "easy"])}>
                  {(level.difficulty || difficulty || "easy").toUpperCase()}
                </span>
              </div>

              <MiniGrid
                level={level}
                selectedId={selSnake}
                onSelectSnake={id => setSelSnake(id === selSnake ? null : id)}
                highlightOrder={sol}
                step={solveStep}
              />

              {/* Solve controls */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
                <button style={s.btn("#4a9eff", false)} onClick={runSolve}>🔍 Solve</button>
                {sol !== undefined && (
                  sol === null
                    ? <span style={{ color:"#ff6b6b", fontSize:13, alignSelf:"center" }}>❌ Unsolvable</span>
                    : <span style={{ color:"#7bed9f", fontSize:13, alignSelf:"center" }}>✅ Solvable — {sol.length} moves</span>
                )}
              </div>

              {/* Step through solution */}
              {sol && solveStep !== null && (
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <button style={s.btnSm(false)} onClick={resetSteps}>⏮</button>
                  <button style={s.btnSm(false)} onClick={stepBackward} disabled={solveStep === 0}>◀</button>
                  <span style={{ color:"#c8cfe0", fontSize:12, minWidth:80, textAlign:"center" }}>
                    Step {solveStep} / {sol.length}
                  </span>
                  <button style={s.btnSm(false)} onClick={stepForward} disabled={solveStep === sol.length}>▶</button>
                  <button style={s.btnSm(false)} onClick={() => setSolveStep(sol.length)}>⏭</button>
                </div>
              )}

              {/* Time estimate */}
              {timeEst && (
                <div style={{ background:"#0d1020", borderRadius:8, padding:"10px 16px",
                  fontSize:12, color:"#c8cfe0", textAlign:"center" }}>
                  ⏱ Estimated solve time: <strong style={{ color:"#ffd93d" }}>{timeEst.low}–{timeEst.high}s</strong>
                </div>
              )}
            </div>

            {/* Edit panel */}
            <div style={{ ...s.panel, width:280, display:"flex", flexDirection:"column", gap:20 }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#4a9eff" }}>Edit Tools</div>

              {!snake ? (
                <div style={{ color:"#4a5070", fontSize:14 }}>Tap a snake on the grid to select it.</div>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize:13, color:"#4a5070", marginBottom:10 }}>
                      Snake {snake.id} · {snake.cells.length} cells
                    </div>

                    {/* Direction */}
                    <div style={{ fontSize:13, color:"#c8cfe0", marginBottom:8 }}>Direction</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {DIRS.map(d => (
                        <button key={d} style={s.btnSm(snake.dir === d)} onClick={() => changeDir(d)}>
                          {DIR_LABEL[d]} {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop:"1px solid #1e2438", paddingTop:14 }}>
                    <button onClick={deleteSnake} style={{ ...s.btn("#ff6b6b", false), width:"100%" }}>
                      🗑 Delete Snake
                    </button>
                  </div>
                </>
              )}

              {/* Save to DB */}
              <div style={{ marginTop:"auto", borderTop:"1px solid #1e2438", paddingTop:16 }}>
                {saved[selLevel] ? (
                  <div style={{ color:"#7bed9f", fontSize:14, textAlign:"center" }}>✅ Saved to DB</div>
                ) : (
                  <button
                    style={s.btn("#7bed9f", !sol || saving)}
                    onClick={saveLevel}
                    disabled={!sol || saving}
                  >
                    {saving ? "Saving…" : "💾 Approve & Save"}
                  </button>
                )}
                {!sol && <div style={{ color:"#4a5070", fontSize:12, marginTop:8 }}>Solve first to enable saving.</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
