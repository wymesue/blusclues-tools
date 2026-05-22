import { useState, useCallback } from "react";
import { DV, DK, simulateExit } from "./arrow-logic.js";

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

// ── MAKE LEVEL ────────────────────────────────────────────────────────────────
// Maze fills the grid beautifully with turn bias.
// Directions assigned in reverse order so each snake can exit when it's its turn.
function makeLevel(cols, rows, minLen, maxLen, seed, depRate) {
  const rand = lcg(seed);
  const ri = n => Math.floor(rand() * n);
  const key = (x, y) => `${x},${y}`;
  const inBounds = (x, y) => x >= 0 && x < cols && y >= 0 && y < rows;

  const validCells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ x: c, y: r }))).flat();

  const treeNbrs = new Map();
  for (const c of validCells) treeNbrs.set(key(c.x, c.y), []);

  // ── Maze carving with turn bias ──
  const mazeVisited = new Set();
  const startCell = validCells[ri(validCells.length)];
  mazeVisited.add(key(startCell.x, startCell.y));
  const stack = [startCell];
  let lastDir = null;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const neighbors = [...DK]
      .sort(() => rand() - 0.5)
      .map(d => ({ d, ...(() => { const {dx,dy} = DV[d]; return {x:cur.x+dx, y:cur.y+dy}; })() }))
      .filter(n => inBounds(n.x, n.y) && !mazeVisited.has(key(n.x, n.y)));

    if (neighbors.length) {
      // Prefer turning 65% of the time
      const turns = lastDir ? neighbors.filter(n => n.d !== lastDir) : [];
      const next = turns.length > 0 && rand() < 0.65 
        ? turns[Math.floor(rand() * turns.length)]
        : neighbors[0];
      
      lastDir = next.d;
      const nk = key(next.x, next.y), ck = key(cur.x, cur.y);
      mazeVisited.add(nk);
      treeNbrs.get(ck).push(nk);
      treeNbrs.get(nk).push(ck);
      stack.push({ x: next.x, y: next.y });
    } else {
      stack.pop();
      lastDir = null;
    }
  }

  // ── Segment carving ──
  const assigned = new Set();
  const segments = [];

  const pickStart = () => {
    let best = null, bestDeg = Infinity;
    for (const [k] of treeNbrs) {
      if (assigned.has(k)) continue;
      const ud = treeNbrs.get(k).filter(n => !assigned.has(n)).length;
      if (ud < bestDeg) { bestDeg = ud; best = k; }
    }
    return best;
  };

  while (assigned.size < mazeVisited.size) {
    const startKey = pickStart();
    if (!startKey) break;
    const seg = [startKey];
    assigned.add(startKey);

    // Weighted length per segment: 40% short, 40% medium, 20% long
    const roll = rand();
    const shortMax = Math.max(minLen, Math.floor(maxLen * 0.33));
    const medMax   = Math.max(shortMax + 1, Math.floor(maxLen * 0.66));
    const segMaxLen = roll < 0.40
      ? Math.floor(rand() * (shortMax - minLen + 1)) + minLen
      : roll < 0.80
      ? Math.floor(rand() * (medMax - shortMax)) + shortMax + 1
      : Math.floor(rand() * (maxLen - medMax)) + medMax + 1;

    while (seg.length < segMaxLen) {
      const curKey = seg[seg.length - 1];
      const unassignedNbrs = treeNbrs.get(curKey).filter(n => !assigned.has(n));
      if (!unassignedNbrs.length) break;
      let nextKey = unassignedNbrs[0];
      if (seg.length >= 2) {
        const [cx, cy] = curKey.split(",").map(Number);
        const [px, py] = seg[seg.length - 2].split(",").map(Number);
        const straight = key(cx + (cx - px), cy + (cy - py));
        const turns = unassignedNbrs.filter(n => n !== straight);
        if (turns.length > 0 && rand() < 0.65) {
          nextKey = turns[Math.floor(rand() * turns.length)];
        } else if (unassignedNbrs.includes(straight)) {
          nextKey = straight;
        } else {
          nextKey = unassignedNbrs[Math.floor(rand() * unassignedNbrs.length)];
        }
      }
      if (unassignedNbrs.length > 1) break;
      seg.push(nextKey);
      assigned.add(nextKey);
    }
    segments.push(seg.map(k => { const [x, y] = k.split(",").map(Number); return { x, y }; }));
  }

  // ── Smart reverse direction assignment ──
  // Process segments in reverse. Each snake gets the first direction that
  // allows it to exit given snakes already assigned (which come after it in play order).
  const snakes = [];
  let id = segments.length - 1;

  for (let i = segments.length - 1; i >= 0; i--) {
    const cells = segments[i];
    let placed = false;

    for (const orientation of [cells, [...cells].reverse()]) {
      if (placed) break;
      const shuffledDirs = [...DK].sort(() => rand() - 0.5);
      for (const dir of shuffledDirs) {
        const ownCells = new Set(orientation.map(c => key(c.x, c.y)));
        // Check snake doesn't point back into itself
        const { dx, dy } = DV[dir];
        const headX = orientation[0].x + dx;
        const headY = orientation[0].y + dy;
        if (ownCells.has(key(headX, headY))) continue;
        
        const candidate = { id, dir, cells: orientation };
        // Can this snake exit given the snakes already placed?
        if (simulateExit(candidate, snakes, cols, rows)) {
          snakes.push(candidate);
          placed = true;
          id--;
          break;
        }
      }
    }

    // If no valid direction found, place with best guess
    if (!placed) {
      for (const dir of DK) {
        const ownCells = new Set(cells.map(c => key(c.x, c.y)));
        const { dx, dy } = DV[dir];
        const headX = cells[0].x + dx, headY = cells[0].y + dy;
        if (!ownCells.has(key(headX, headY))) {
          snakes.push({ id, dir, cells });
          id--;
          break;
        }
      }
    }
  }

  // Reverse so player order is correct (first to exit = index 0)
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
