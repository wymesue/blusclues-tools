import { useState, useCallback } from "react";

// ── DIFFICULTY CONFIGS ────────────────────────────────────────────────────────
const DIFFICULTIES = {
  easy:   { label: "Easy",   cols: 8,  rows: 10, minLen: 2, maxLen: 6,  depRate: 0.10, color: "#7bed9f" },
  medium: { label: "Medium", cols: 10, rows: 13, minLen: 2, maxLen: 8,  depRate: 0.20, color: "#ffd93d" },
  hard:   { label: "Hard",   cols: 12, rows: 16, minLen: 3, maxLen: 10, depRate: 0.30, color: "#ff6b6b" },
  expert: { label: "Expert", cols: 14, rows: 18, minLen: 3, maxLen: 12, depRate: 0.40, color: "#a29bfe" },
};

// ── LCG RANDOM ────────────────────────────────────────────────────────────────
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

// ── MAKE LEVEL (REVERSE GENERATION) ──────────────────────────────────────────
// Snakes are placed backwards onto the board, guaranteeing 100% solvability.
// Last snake placed = first snake the player removes.
function makeLevel(cols, rows, minLen, maxLen, seed, depRate) {
  const rand = lcg(seed);
  const ri = n => Math.floor(rand() * n);
  const rc = arr => arr[Math.floor(rand() * arr.length)];
  const key = (x, y) => `${x},${y}`;
  const inBounds = (x, y) => x >= 0 && x < cols && y >= 0 && y < rows;

  const DIRS = ["U", "D", "L", "R"];
  const DVlocal = {
    U: { dx: 0, dy: -1, opp: "D" },
    D: { dx: 0, dy: 1,  opp: "U" },
    L: { dx: -1, dy: 0, opp: "R" },
    R: { dx: 1,  dy: 0, opp: "L" },
  };

  const occupied = new Set();
  const snakes = [];
  let currentId = 0;

  const getWindingTurns = (cx, cy, currentDir) => {
    const perps = ["U", "D"].includes(currentDir) ? ["L", "R"] : ["U", "D"];
    return perps.filter(d => {
      const step = DVlocal[DVlocal[d].opp];
      const nx = cx + step.dx, ny = cy + step.dy;
      return inBounds(nx, ny) && !occupied.has(key(nx, ny));
    });
  };

  let consecutiveFailures = 0;
  const maxFailures = 500;

  while (consecutiveFailures < maxFailures) {
    const startX = ri(cols);
    const startY = ri(rows);

    if (occupied.has(key(startX, startY))) { consecutiveFailures++; continue; }

    const targetLength = Math.floor(rand() * (maxLen - minLen + 1)) + minLen;
    const escapeDir = rc(DIRS);

    const snakeCells = [{ x: startX, y: startY }];
    let cx = startX, cy = startY, currentDir = escapeDir;

    while (snakeCells.length < targetLength) {
      const turns = getWindingTurns(cx, cy, currentDir);
      const backStep = DVlocal[DVlocal[currentDir].opp];
      const sx = cx + backStep.dx, sy = cy + backStep.dy;
      const straightValid = inBounds(sx, sy) && !occupied.has(key(sx, sy));

      if (turns.length > 0 && (!straightValid || rand() < 0.55)) {
        currentDir = rc(turns);
      }

      const finalStep = DVlocal[DVlocal[currentDir].opp];
      cx += finalStep.dx; cy += finalStep.dy;

      if (inBounds(cx, cy) && !occupied.has(key(cx, cy))) {
        snakeCells.push({ x: cx, y: cy });
      } else {
        break;
      }
    }

    if (snakeCells.length >= minLen) {
      snakeCells.forEach(c => occupied.add(key(c.x, c.y)));
      snakes.push({ id: currentId++, dir: escapeDir, cells: snakeCells });
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
    }
  }

  // Reverse: last placed = first to exit = guaranteed solvable
  snakes.reverse();
  snakes.forEach((s, idx) => s.id = idx);

  return { cols, rows, snakes };
}


// ── MINI PREVIEW ──────────────────────────────────────────────────────────────
const DIR_ARROW = { R:"→", L:"←", D:"↓", U:"↑" };
const COLORS = ["#ff6b6b","#4ecdc4","#ffd93d","#ff8cc8","#a8e6cf","#c3a6ff","#7bed9f","#ffb347","#45b7d1","#fd79a8","#a29bfe","#55efc4"];

function MiniPreview({ level }) {
  if (!level) return null;
  const { cols, rows, snakes } = level;
  const size = Math.min(Math.floor(300 / cols), Math.floor(340 / rows), 14);
  const cellMap = new Map();
  snakes.forEach(s => s.cells.forEach(c => cellMap.set(`${c.x},${c.y}`, s.id)));

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ display:"grid",
        gridTemplateColumns:`repeat(${cols}, ${size}px)`,
        gridTemplateRows:`repeat(${rows}, ${size}px)`,
        gap:1, background:"#1e2438", padding:4, borderRadius:6 }}>
        {Array.from({ length:rows }, (_, r) =>
          Array.from({ length:cols }, (_, c) => {
            const sid = cellMap.get(`${c},${r}`);
            const snake = sid != null ? snakes.find(s => s.id === sid) : null;
            const isHead = snake && snake.cells[0].x === c && snake.cells[0].y === r;
            return (
              <div key={`${c},${r}`} style={{ width:size, height:size,
                background: sid != null ? COLORS[sid % COLORS.length] : "#0d1020",
                borderRadius:2, display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:size * 0.7, lineHeight:1 }}>
                {isHead && size >= 8 ? DIR_ARROW[snake.dir] : ""}
              </div>
            );
          })
        )}
      </div>
      <div style={{ color:"#4a5070", fontSize:11 }}>{cols}×{rows} · {snakes.length} snakes</div>
    </div>
  );
}

// ── GENERATOR UI ──────────────────────────────────────────────────────────────
export default function Generator({ onSendToEditor }) {
  const [difficulty, setDifficulty] = useState("easy");
  const [count,      setCount]      = useState(20);
  const [generating, setGenerating] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [levels,     setLevels]     = useState(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  const cfg = DIFFICULTIES[difficulty];

  const generate = useCallback(async () => {
    setGenerating(true);
    setProgress(0);
    setLevels(null);
    const result = [];

    for (let i = 0; i < count; i++) {
      const seed = Math.floor(Math.random() * 999999) + i * 1000;
      const { cols, rows, snakes } = makeLevel(cfg.cols, cfg.rows, cfg.minLen, cfg.maxLen, seed, cfg.depRate);
      result.push({ difficulty, cols, rows, snakes, seed });
      setProgress(Math.round(((i + 1) / count) * 100));
      if (i % 5 === 4) await new Promise(r => setTimeout(r, 0));
    }

    setLevels(result);
    setPreviewIdx(0);
    setGenerating(false);
  }, [difficulty, count, cfg]);

  const s = {
    page:  { minHeight:"100vh", background:"#0d1020", color:"#fff", fontFamily:"monospace", padding:24 },
    title: { fontSize:20, fontWeight:"bold", marginBottom:4, color:"#4a9eff" },
    sub:   { fontSize:12, color:"#4a5070", marginBottom:28 },
    row:   { display:"flex", alignItems:"center", gap:12, marginBottom:14 },
    label: { fontSize:13, color:"#c8cfe0", width:130 },
    input: { background:"#141828", border:"1px solid #1e2438", borderRadius:8, color:"#fff", padding:"8px 12px", fontSize:14, width:80 },
    btn:   (color) => ({ background:color, border:"none", borderRadius:10, color:"#0d1020", padding:"11px 24px", fontSize:14, cursor:"pointer", fontWeight:"bold" }),
    btnSm: (active) => ({ background:active?"#4a9eff":"#1e2438", border:"1px solid #2a3050", borderRadius:6, color:active?"#fff":"#c8cfe0", padding:"4px 10px", fontSize:12, cursor:"pointer" }),
    bar:   { height:8, background:"#1e2438", borderRadius:4, overflow:"hidden", marginBottom:16 },
    fill:  (w, color) => ({ height:"100%", background:color, borderRadius:4, width:`${w}%`, transition:"width 0.2s" }),
    card:  { background:"#141828", border:"1px solid #1e2438", borderRadius:12, padding:20, marginTop:20 },
    grid:  { display:"flex", flexWrap:"wrap", gap:6, marginTop:12, maxHeight:100, overflowY:"auto" },
  };

  return (
    <div style={s.page}>
      <div style={s.title}>🐍 Snake Escape — Level Generator</div>
      <div style={s.sub}>Generate levels by difficulty and send them to the editor.</div>

      {/* Difficulty picker */}
      <div style={s.row}>
        <span style={s.label}>Difficulty</span>
        <div style={{ display:"flex", gap:8 }}>
          {Object.entries(DIFFICULTIES).map(([key, d]) => (
            <button key={key} onClick={() => setDifficulty(key)} style={{
              background: difficulty === key ? d.color : "#1e2438",
              border: `1px solid ${difficulty === key ? d.color : "#2a3050"}`,
              borderRadius:8, padding:"6px 14px", color: difficulty === key ? "#0d1020" : "#c8cfe0",
              fontSize:13, cursor:"pointer", fontWeight: difficulty === key ? 700 : 400,
            }}>{d.label}</button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div style={s.row}>
        <span style={s.label}>Number of levels</span>
        <input style={s.input} type="number" min={1} max={200} value={count}
          onChange={e => setCount(Math.max(1, Math.min(200, +e.target.value)))} />
      </div>

      {/* Grid size info */}
      <div style={{ ...s.row, marginBottom:20 }}>
        <span style={s.label}>Grid size</span>
        <span style={{ color:"#4a5070", fontSize:13 }}>{cfg.cols}×{cfg.rows} · dep rate {Math.round(cfg.depRate * 100)}%</span>
      </div>

      {/* Buttons */}
      <div style={{ display:"flex", gap:12, marginBottom:20 }}>
        <button style={s.btn("#4a9eff")} onClick={generate} disabled={generating}>
          {generating ? `Generating… ${progress}%` : "⚡ Generate"}
        </button>
        {levels && (
          <button style={s.btn(cfg.color)} onClick={() => onSendToEditor?.(levels, difficulty)}>
            → Send to Editor ({levels.length} levels)
          </button>
        )}
      </div>

      {/* Progress bar */}
      {generating && (
        <div style={s.bar}>
          <div style={s.fill(progress, cfg.color)} />
        </div>
      )}

      {/* Preview */}
      {levels && (
        <div style={s.card}>
          <div style={{ fontSize:13, color:"#c8cfe0", marginBottom:12 }}>
            Preview — {cfg.label} level {previewIdx + 1} of {levels.length}
          </div>
          <MiniPreview level={levels[previewIdx]} />
          <div style={s.grid}>
            {levels.map((_, i) => (
              <button key={i} style={s.btnSm(i === previewIdx)} onClick={() => setPreviewIdx(i)}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
