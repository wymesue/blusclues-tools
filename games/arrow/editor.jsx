import { useState, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase.js";
import { DV, DK, simulateExit } from "./arrow-logic.js";

// ── BEEP ──────────────────────────────────────────────────────────────────────
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

// ── SOLVER ────────────────────────────────────────────────────────────────────
function solve(snakes, cols, rows) {
  let attempts = 0;
  const MAX = 50000;
  let bestPartial = [];

  const tryOrder = (remaining, order) => {
    if (attempts > MAX) return null;
    if (remaining.length === 0) return order;
    const canMove = remaining.filter(s => simulateExit(s, remaining, cols, rows));
    if (canMove.length === 0) {
      if (order.length > bestPartial.length) bestPartial = [...order];
      return null;
    }
    for (const snake of canMove) {
      attempts++;
      const next = remaining.filter(s => s.id !== snake.id);
      const result = tryOrder(next, [...order, snake.id]);
      if (result) return result;
    }
    if (order.length > bestPartial.length) bestPartial = [...order];
    return null;
  };

  const order = tryOrder(snakes, []);
  if (order) return { order, partial: order, stuck: [] };

  const clearedIds = new Set(bestPartial);
  const remaining = snakes.filter(s => !clearedIds.has(s.id));
  const stuck = remaining.filter(s => !simulateExit(s, remaining, cols, rows)).map(s => s.id);
  return { order: null, partial: bestPartial, stuck };
}

function estimateTime(snakes, order) {
  if (!order) return null;
  const total = Math.round(4 * snakes.length + order.length * 1.5 + snakes.length * 0.8);
  return { low: Math.max(5, Math.round(total * 0.6)), high: Math.round(total * 1.8) };
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const DIRS      = ["R", "L", "U", "D"];
const DIR_LABEL = { R:"→", L:"←", U:"↑", D:"↓" };
const COLORS    = ["#ff6b6b","#4ecdc4","#ffd93d","#ff8cc8","#a8e6cf","#c3a6ff","#7bed9f","#ffb347","#45b7d1","#fd79a8","#a29bfe","#55efc4"];
const DIFF_COLOR = { easy:"#7bed9f", medium:"#ffd93d", hard:"#ff6b6b", expert:"#a29bfe" };

// ── GRID ──────────────────────────────────────────────────────────────────────
function Grid({ level, selectedId, onSelectSnake, highlightOrder, step,
                drawing, drawCells, onCellMouseDown, onCellMouseEnter, onCellMouseUp }) {
  if (!level) return null;
  const { cols, rows, snakes } = level;
  const CELL = Math.min(Math.floor(520 / cols), Math.floor(600 / rows), 44);

  const cellMap = new Map();
  snakes.forEach(s => s.cells.forEach(c => cellMap.set(`${c.x},${c.y}`, s.id)));

  const solvedIds = step != null && highlightOrder
    ? new Set(highlightOrder.slice(0, step)) : new Set();

  const drawSet = new Set((drawCells || []).map(c => `${c.x},${c.y}`));

  const renderSnakeShape = (sn, color, sw) => {
    const pts = sn.cells.map(c => `${c.x * CELL + CELL/2},${c.y * CELL + CELL/2}`);
    const d   = pts.length > 1 ? `M${pts[0]} ${pts.slice(1).map(p=>`L${p}`).join(" ")}` : "";
    const hx  = sn.cells[0].x * CELL + CELL/2;
    const hy  = sn.cells[0].y * CELL + CELL/2;
    const half = CELL * 0.45, wing = CELL * 0.18;
    const arr = {
      R:{ tx:hx+half, ty:hy,      w1x:hx+half-wing*1.2, w1y:hy-wing,  w2x:hx+half-wing*1.2, w2y:hy+wing  },
      L:{ tx:hx-half, ty:hy,      w1x:hx-half+wing*1.2, w1y:hy-wing,  w2x:hx-half+wing*1.2, w2y:hy+wing  },
      D:{ tx:hx,      ty:hy+half, w1x:hx-wing, w1y:hy+half-wing*1.2,  w2x:hx+wing, w2y:hy+half-wing*1.2  },
      U:{ tx:hx,      ty:hy-half, w1x:hx-wing, w1y:hy-half+wing*1.2,  w2x:hx+wing, w2y:hy-half+wing*1.2  },
    }[sn.dir];
    return (
      <>
        {d && <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>}
        <line x1={hx} y1={hy} x2={arr.tx} y2={arr.ty} stroke={color} strokeWidth={sw} strokeLinecap="round"/>
        <line x1={arr.w1x} y1={arr.w1y} x2={arr.tx} y2={arr.ty} stroke={color} strokeWidth={sw} strokeLinecap="round"/>
        <line x1={arr.w2x} y1={arr.w2y} x2={arr.tx} y2={arr.ty} stroke={color} strokeWidth={sw} strokeLinecap="round"/>
      </>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <svg width={cols * CELL} height={rows * CELL}
        style={{ display:"block", cursor: drawing ? "crosshair" : "pointer", userSelect:"none" }}
        onMouseLeave={onCellMouseUp}>
        {/* Background cells — clickable for drawing */}
        {Array.from({ length:rows }, (_, r) =>
          Array.from({ length:cols }, (_, c) => (
            <rect key={`bg${c}-${r}`}
              x={c*CELL} y={r*CELL} width={CELL} height={CELL}
              fill="transparent"
              onMouseDown={() => onCellMouseDown?.(c, r)}
              onMouseEnter={() => onCellMouseEnter?.(c, r)}
              onMouseUp={onCellMouseUp}
            />
          ))
        )}

        {/* Grid dots */}
        {Array.from({ length:rows }, (_, r) =>
          Array.from({ length:cols }, (_, c) => (
            <circle key={`d${c}-${r}`}
              cx={c*CELL+CELL/2} cy={r*CELL+CELL/2} r={1.5} fill="#2a3050"
              style={{ pointerEvents:"none" }}/>
          ))
        )}

        {/* Drawing preview */}
        {drawing && drawCells && drawCells.length > 0 && (() => {
          const pts = drawCells.map(c => `${c.x*CELL+CELL/2},${c.y*CELL+CELL/2}`);
          const d = pts.length > 1 ? `M${pts[0]} ${pts.slice(1).map(p=>`L${p}`).join(" ")}` : "";
          return (
            <>
              {drawCells.map((c,i) => (
                <rect key={`dc${i}`} x={c.x*CELL+2} y={c.y*CELL+2}
                  width={CELL-4} height={CELL-4} rx={4}
                  fill="#ffffff18" style={{ pointerEvents:"none" }}/>
              ))}
              {d && <path d={d} fill="none" stroke="#fff" strokeWidth={3}
                strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3"
                style={{ pointerEvents:"none" }}/>}
            </>
          );
        })()}

        {/* Snakes */}
        {snakes.map(sn => {
          const isSel    = selectedId === sn.id;
          const isSolved = solvedIds.has(sn.id);
          const color    = isSolved ? "#2a3050" : COLORS[sn.id % COLORS.length];
          const stroke   = isSel ? "#fff" : color;
          const sw       = isSel ? 4 : 3;
          return (
            <g key={sn.id} onClick={() => !drawing && onSelectSnake(sn.id)}
              style={{ cursor: drawing ? "crosshair" : "pointer", opacity: isSolved ? 0.2 : 1 }}>
              {isSel && <rect
                x={sn.cells.reduce((m,c)=>Math.min(m,c.x),99)*CELL}
                y={sn.cells.reduce((m,c)=>Math.min(m,c.y),99)*CELL}
                width={(sn.cells.reduce((m,c)=>Math.max(m,c.x),-1)-sn.cells.reduce((m,c)=>Math.min(m,c.x),99)+1)*CELL}
                height={(sn.cells.reduce((m,c)=>Math.max(m,c.y),-1)-sn.cells.reduce((m,c)=>Math.min(m,c.y),99)+1)*CELL}
                fill="#ffffff08" rx={4}/>}
              {renderSnakeShape(sn, stroke, sw)}
            </g>
          );
        })}
      </svg>
      <div style={{ color:"#8a9bc0", fontSize:13 }}>{cols}×{rows} · {snakes.length} snakes</div>
    </div>
  );
}

// ── EDITOR ────────────────────────────────────────────────────────────────────
export default function Editor({ levels: initialLevels, difficulty }) {
  const [levels,    setLevels]    = useState(initialLevels || []);
  const [selLevel,  setSelLevel]  = useState(0);
  const [selSnake,  setSelSnake]  = useState(null);
  const [solutions, setSolutions] = useState({});
  const [solveStep, setSolveStep] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState({});

  // Drawing state
  const [drawing,   setDrawing]   = useState(false);
  const [drawCells, setDrawCells] = useState([]);
  const isMouseDown = useRef(false);

  const level = levels[selLevel];
  const sol   = solutions[selLevel];
  const snake = level?.snakes.find(s => s.id === selSnake);

  // ── SOLVE ──
  const runSolve = async () => {
    if (!level) return;
    await new Promise(r => setTimeout(r, 0));
    const result = solve(level.snakes, level.cols, level.rows);
    setSolutions(prev => ({ ...prev, [selLevel]: result }));
    setSolveStep(0);
  };

  const stepForward  = () => setSolveStep(s => Math.min(s + 1, sol?.partial?.length ?? 0));
  const stepBackward = () => setSolveStep(s => Math.max(s - 1, 0));
  const resetSteps   = () => setSolveStep(0);

  // ── DRAW ──
  const occupiedCells = (lvl) => {
    const set = new Set();
    lvl.snakes.forEach(s => s.cells.forEach(c => set.add(`${c.x},${c.y}`)));
    return set;
  };

  const onCellMouseDown = (x, y) => {
    if (!drawing) return;
    isMouseDown.current = true;
    setDrawCells([{ x, y }]);
  };

  const onCellMouseEnter = (x, y) => {
    if (!drawing || !isMouseDown.current) return;
    setDrawCells(prev => {
      if (prev.length === 0) return [{ x, y }];
      const last = prev[prev.length - 1];

      // Check if already in draw path
      if (prev.some(c => c.x === x && c.y === y)) return prev;

      // Check adjacency
      const dx = Math.abs(x - last.x), dy = Math.abs(y - last.y);
      if (dx + dy !== 1) { beep(); return prev; }

      // Check if occupied by existing snake
      const occ = occupiedCells(level);
      if (occ.has(`${x},${y}`)) { beep(); return prev; }

      return [...prev, { x, y }];
    });
  };

  const onCellMouseUp = () => {
    if (!drawing || !isMouseDown.current) return;
    isMouseDown.current = false;

    if (drawCells.length < 1) { setDrawCells([]); return; }

    // Commit the drawn snake
    const nextId = level.snakes.length > 0 ? Math.max(...level.snakes.map(s => s.id)) + 1 : 0;
    const newSnake = { id: nextId, dir: "R", cells: drawCells };

    setLevels(prev => prev.map((l, i) => i !== selLevel ? l : {
      ...l, snakes: [...l.snakes, newSnake]
    }));
    setSelSnake(nextId);
    setDrawCells([]);
    setSolutions(prev => ({ ...prev, [selLevel]: undefined }));
    setSolveStep(null);
  };

  // ── EDIT ──
  const changeDir = (dir) => {
    if (!snake) return;
    setLevels(prev => prev.map((l, i) => i !== selLevel ? l : {
      ...l, snakes: l.snakes.map(s => s.id === selSnake ? { ...s, dir } : s)
    }));
    setSolutions(prev => ({ ...prev, [selLevel]: undefined }));
    setSolveStep(null);
  };

  const flipSnake = () => {
    if (!snake) return;
    setLevels(prev => prev.map((l, i) => i !== selLevel ? l : {
      ...l, snakes: l.snakes.map(s => s.id === selSnake ? { ...s, cells: [...s.cells].reverse() } : s)
    }));
    setSolutions(prev => ({ ...prev, [selLevel]: undefined }));
    setSolveStep(null);
  };

  const deleteSnake = () => {
    if (selSnake == null) return;
    setLevels(prev => prev.map((l, i) => i !== selLevel ? l : {
      ...l, snakes: l.snakes.filter(s => s.id !== selSnake)
    }));
    setSelSnake(null);
    setSolutions(prev => ({ ...prev, [selLevel]: undefined }));
    setSolveStep(null);
  };

  // ── SAVE ──
  const saveLevel = async () => {
    if (!level || !sol?.order) return;
    setSaving(true);
    const diff = level.difficulty || difficulty || "easy";

    const { data: existing } = await supabase
      .from("levels").select("position")
      .eq("game", "snake_escape").eq("difficulty", diff)
      .order("position", { ascending: false }).limit(1);

    const nextPos = existing?.[0]?.position ? existing[0].position + 1 : 1;

    const { error } = await supabase.from("levels").insert({
      game: "snake_escape", difficulty: diff, position: nextPos,
      data: { cols: level.cols, rows: level.rows, snakes: level.snakes },
      active: true,
    });

    if (!error) setSaved(prev => ({ ...prev, [selLevel]: true }));
    setSaving(false);
  };

  const timeEst = sol?.order ? estimateTime(level?.snakes, sol.order) : null;

  const s = {
    page:    { minHeight:"100vh", background:"#0d1020", color:"#fff", fontFamily:"monospace", display:"flex" },
    sidebar: { width:280, background:"#090d1f", borderRight:"1px solid #1a2040", display:"flex", flexDirection:"column", flexShrink:0 },
    main:    { flex:1, padding:24, display:"flex", gap:24 },
    panel:   { background:"#141828", border:"1px solid #1e2438", borderRadius:12, padding:20 },
    btn:     (color, disabled) => ({
      background: disabled ? "#1a2040" : color, border:"none", borderRadius:8,
      color: disabled ? "#2a3060" : "#0d1020",
      padding:"10px 20px", fontSize:15, cursor: disabled ? "default" : "pointer", fontWeight:700,
    }),
    btnSm:   (active, color) => ({
      background: active ? (color || "#4a9eff") : "#1e2438",
      border:`1px solid ${active ? (color || "#4a9eff") : "#2a3050"}`,
      borderRadius:6, color: active ? "#fff" : "#c8cfe0",
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
    return s.order ? "✅" : "❌";
  };

  return (
    <div style={s.page} onMouseUp={onCellMouseUp}>
      <style>{`
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#090d1f}
        ::-webkit-scrollbar-thumb{background:#1e2438;border-radius:3px}
      `}</style>

      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={{ padding:"16px 14px", borderBottom:"1px solid #1a2040", fontSize:16, fontWeight:700, color:"#4a9eff" }}>
          🐍 Levels ({levels.length})
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {levels.map((l, i) => (
            <div key={i} onClick={() => { setSelLevel(i); setSelSnake(null); setSolveStep(null); setDrawing(false); setDrawCells([]); }}
              style={{ padding:"14px 16px", borderBottom:"1px solid #0d1020",
                background: i === selLevel ? "#1a2040" : "transparent",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:15, color:"#c8cfe0" }}>Level {i + 1}</div>
                <div style={{ fontSize:13, color:"#8a9bc0" }}>{l.cols}×{l.rows} · {l.snakes.length} snakes</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                <span style={{ fontSize:18 }}>{statusIcon(i)}</span>
                {saved[i] && <span style={{ fontSize:11, color:"#7bed9f" }}>saved</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>
        {!level ? (
          <div style={{ color:"#4a5070", fontSize:14, margin:"auto" }}>
            No levels loaded. Generate levels and send them here.
          </div>
        ) : (
          <>
            {/* Grid panel */}
            <div style={{ ...s.panel, flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
              <div style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ fontSize:13, color:"#c8cfe0", fontWeight:700 }}>Level {selLevel + 1}</div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {drawing && <span style={{ fontSize:12, color:"#ffd93d" }}>✏️ Drawing mode</span>}
                  <span style={s.tag(DIFF_COLOR[level.difficulty || difficulty || "easy"])}>
                    {(level.difficulty || difficulty || "easy").toUpperCase()}
                  </span>
                </div>
              </div>

              <Grid
                level={level}
                selectedId={selSnake}
                onSelectSnake={id => { if (!drawing) setSelSnake(id === selSnake ? null : id); }}
                highlightOrder={sol?.partial}
                step={solveStep}
                drawing={drawing}
                drawCells={drawCells}
                onCellMouseDown={onCellMouseDown}
                onCellMouseEnter={onCellMouseEnter}
                onCellMouseUp={onCellMouseUp}
              />

              {/* Solve controls */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
                <button style={s.btn("#4a9eff", false)} onClick={runSolve}>🔍 Solve</button>
                {sol !== undefined && (
                  sol.order
                    ? <span style={{ color:"#7bed9f", fontSize:13, alignSelf:"center" }}>✅ Solvable — {sol.order.length} moves</span>
                    : <span style={{ color:"#ff6b6b", fontSize:13, alignSelf:"center" }}>❌ Stuck after {sol.partial.length} moves</span>
                )}
              </div>

              {/* Step through */}
              {sol?.partial?.length > 0 && solveStep !== null && (
                <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"center" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <button style={s.btnSm(false)} onClick={resetSteps}>⏮</button>
                    <button style={s.btnSm(false)} onClick={stepBackward} disabled={solveStep===0}>◀</button>
                    <span style={{ color:"#c8cfe0", fontSize:13, minWidth:100, textAlign:"center" }}>
                      Step {solveStep} / {sol.partial.length}
                    </span>
                    <button style={s.btnSm(false)} onClick={stepForward} disabled={solveStep===sol.partial.length}>▶</button>
                    <button style={s.btnSm(false)} onClick={() => setSolveStep(sol.partial.length)}>⏭</button>
                  </div>
                  {!sol.order && solveStep === sol.partial.length && sol.stuck.length > 0 && (
                    <div style={{ background:"#1a0a0a", border:"1px solid #ff6b6b44", borderRadius:8,
                      padding:"8px 14px", fontSize:13, color:"#ff8a80", textAlign:"center" }}>
                      🔒 Deadlock — snakes {sol.stuck.join(", ")} are blocking each other
                    </div>
                  )}
                </div>
              )}

              {/* Time estimate */}
              {timeEst && (
                <div style={{ background:"#0d1020", borderRadius:8, padding:"10px 16px",
                  fontSize:13, color:"#c8cfe0", textAlign:"center" }}>
                  ⏱ Estimated solve time: <strong style={{ color:"#ffd93d" }}>{timeEst.low}–{timeEst.high}s</strong>
                </div>
              )}
            </div>

            {/* Edit panel */}
            <div style={{ ...s.panel, width:280, display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#4a9eff" }}>Edit Tools</div>

              {/* Draw toggle */}
              <div>
                <button style={{ ...s.btnSm(drawing, "#ffd93d"), width:"100%", marginBottom:6 }}
                  onClick={() => { setDrawing(d => !d); setSelSnake(null); setDrawCells([]); }}>
                  ✏️ {drawing ? "Stop Drawing" : "Draw New Snake"}
                </button>
                {drawing && <div style={{ fontSize:12, color:"#8a9bc0" }}>
                  Click and drag on the grid to draw. Beeps on invalid moves.
                </div>}
              </div>

              <div style={{ borderTop:"1px solid #1e2438", paddingTop:14 }}>
                {!snake ? (
                  <div style={{ color:"#8a9bc0", fontSize:13 }}>
                    {drawing ? "Drawing mode active." : "Tap a snake to select it."}
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:13, color:"#8a9bc0", marginBottom:12 }}>
                      Snake {snake.id} · {snake.cells.length} cells
                    </div>

                    <div style={{ fontSize:13, color:"#c8cfe0", marginBottom:8 }}>Direction</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                      {DIRS.map(d => (
                        <button key={d} style={s.btnSm(snake.dir === d)} onClick={() => changeDir(d)}>
                          {DIR_LABEL[d]} {d}
                        </button>
                      ))}
                    </div>

                    <button onClick={flipSnake} style={{ ...s.btnSm(false), width:"100%", marginBottom:8 }}>
                      🔄 Flip Head/Tail
                    </button>

                    <button onClick={deleteSnake} style={{ ...s.btn("#ff6b6b", false), width:"100%" }}>
                      🗑 Delete Snake
                    </button>
                  </>
                )}
              </div>

              {/* Save */}
              <div style={{ marginTop:"auto", borderTop:"1px solid #1e2438", paddingTop:16 }}>
                {saved[selLevel] ? (
                  <div style={{ color:"#7bed9f", fontSize:14, textAlign:"center" }}>✅ Saved to DB</div>
                ) : (
                  <button style={s.btn("#7bed9f", !sol?.order || saving)}
                    onClick={saveLevel} disabled={!sol?.order || saving}>
                    {saving ? "Saving…" : "💾 Approve & Save"}
                  </button>
                )}
                {!sol?.order && <div style={{ color:"#8a9bc0", fontSize:12, marginTop:8 }}>Solve first to enable saving.</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
