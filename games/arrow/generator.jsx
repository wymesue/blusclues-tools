import { useState, useCallback } from "react";
import { DV, DK, simulateExit, getExitRayCells, blocksExitPath, createsDependency } from "./arrow-logic.js";

// ── SHAPES ────────────────────────────────────────────────────────────────────
const SHAPES = [{"id":"cat","name":"Cat","category":"animal","viewBox":"0 0 384 448","path":"M88 300 C88 230 122 188 160 178 L138 112 L188 154 L196 154 L246 112 L224 178 C264 188 296 230 296 300 C296 362 250 394 192 394 C134 394 88 362 88 300 Z M142 268 C154 252 176 252 188 268 C176 274 154 274 142 268 Z M196 268 C208 252 230 252 242 268 C230 274 208 274 196 268 Z M174 314 L192 328 L210 314 C208 348 176 348 174 314 Z"},{"id":"dog","name":"Dog","category":"animal","viewBox":"0 0 384 448","path":"M82 286 C82 222 126 178 192 178 C258 178 302 222 302 286 C302 354 256 394 192 394 C128 394 82 354 82 286 Z M92 210 C66 154 84 112 138 156 L126 224 Z M292 210 L258 224 L246 156 C300 112 318 154 292 210 Z M146 268 C158 254 178 254 188 268 C174 276 158 276 146 268 Z M196 268 C206 254 226 254 238 268 C226 276 210 276 196 268 Z M174 316 L192 330 L210 316 C206 348 178 348 174 316 Z"},{"id":"horse","name":"Horse","category":"animal","viewBox":"0 0 384 448","path":"M90 360 L110 230 L168 150 C194 112 242 124 260 166 L300 190 L268 214 L248 196 L226 250 L278 360 L228 360 L198 292 L170 360 L124 360 L146 278 L122 300 L114 360 Z M178 166 C160 184 146 206 138 230 L204 208 C206 178 198 164 178 166 Z"},{"id":"fish","name":"Fish","category":"animal","viewBox":"0 0 384 448","path":"M42 224 L120 146 C142 126 174 112 220 116 C286 122 338 166 354 224 C338 282 286 326 220 332 C174 336 142 322 120 302 Z M42 224 L116 192 L116 256 Z M246 198 C258 198 268 208 268 220 C268 232 258 242 246 242 C234 242 224 232 224 220 C224 208 234 198 246 198 Z M156 164 C174 206 174 242 156 284"},{"id":"star","name":"Star","category":"symbol","viewBox":"0 0 384 448","path":"M192 54 L232 166 L350 170 L258 242 L292 356 L192 290 L92 356 L126 242 L34 170 L152 166 Z"},{"id":"heart","name":"Heart","category":"symbol","viewBox":"0 0 384 448","path":"M192 372 C112 304 58 254 58 182 C58 130 96 96 146 96 C174 96 190 112 192 132 C194 112 210 96 238 96 C288 96 326 130 326 182 C326 254 272 304 192 372 Z"},{"id":"moon","name":"Moon","category":"symbol","viewBox":"0 0 384 448","path":"M260 70 C206 94 170 150 170 216 C170 290 226 350 300 354 C270 382 230 398 186 398 C88 398 26 320 42 222 C58 124 154 52 260 70 Z"},{"id":"flame","name":"Flame","category":"symbol","viewBox":"0 0 384 448","path":"M192 402 C118 402 70 354 70 286 C70 232 104 184 152 142 C156 204 190 210 198 142 C206 84 246 58 250 58 C244 128 314 170 314 272 C314 350 266 402 192 402 Z M194 354 C232 354 256 326 256 288 C256 250 232 230 218 196 C202 238 150 256 150 306 C150 336 170 354 194 354 Z"},{"id":"drop","name":"Drop","category":"symbol","viewBox":"0 0 384 448","path":"M192 402 C120 402 72 350 72 284 C72 210 152 104 192 48 C232 104 312 210 312 284 C312 350 264 402 192 402 Z"},{"id":"crown","name":"Crown","category":"symbol","viewBox":"0 0 384 448","path":"M62 342 L82 150 L150 236 L192 102 L234 236 L302 150 L322 342 Z M82 342 L322 342 L310 386 L74 386 Z"},{"id":"diamond","name":"Diamond","category":"symbol","viewBox":"0 0 384 448","path":"M192 54 L340 186 L192 394 L44 186 Z M192 54 L240 186 L192 394 L144 186 Z M44 186 L340 186"},{"id":"rocket","name":"Rocket","category":"object","viewBox":"0 0 384 448","path":"M192 44 C260 88 288 168 272 260 L324 316 L290 348 L250 314 C236 344 216 376 192 404 C168 376 148 344 134 314 L94 348 L60 316 L112 260 C96 168 124 88 192 44 Z M192 122 C168 122 150 140 150 164 C150 188 168 206 192 206 C216 206 234 188 234 164 C234 140 216 122 192 122 Z"},{"id":"tree","name":"Tree","category":"nature","viewBox":"0 0 384 448","path":"M170 280 C108 278 66 242 66 190 C66 150 92 118 130 108 C146 70 182 48 222 58 C266 68 294 104 296 150 C330 166 350 198 346 236 C342 282 304 310 250 310 L224 310 L224 398 L160 398 L160 310 L134 310 Z"},{"id":"flower","name":"Flower","category":"nature","viewBox":"0 0 384 448","path":"M192 246 C168 246 150 228 150 204 C150 180 168 162 192 162 C216 162 234 180 234 204 C234 228 216 246 192 246 Z M192 162 C150 92 234 92 192 162 Z M234 204 C304 162 304 246 234 204 Z M192 246 C234 316 150 316 192 246 Z M150 204 C80 246 80 162 150 204 Z M192 246 L192 398 M192 324 C152 292 120 306 104 354 C146 360 174 348 192 324 Z"},{"id":"snowflake","name":"Snowflake","category":"nature","viewBox":"0 0 384 448","path":"M176 54 L208 54 L208 178 L314 116 L330 144 L224 206 L330 268 L314 296 L208 234 L208 394 L176 394 L176 234 L70 296 L54 268 L160 206 L54 144 L70 116 L176 178 Z M128 74 L176 122 M256 74 L208 122 M128 374 L176 326 M256 374 L208 326"},{"id":"mountain","name":"Mountain","category":"nature","viewBox":"0 0 384 448","path":"M38 372 L142 148 L198 250 L246 88 L346 372 Z M142 148 L174 206 L116 206 Z M246 88 L282 170 L218 170 Z"},{"id":"ghost","name":"Ghost","category":"symbol","viewBox":"0 0 384 448","path":"M76 398 L76 184 C76 112 126 62 192 62 C258 62 308 112 308 184 L308 398 L268 360 L232 398 L192 360 L152 398 L116 360 Z M128 204 C128 178 148 158 174 158 C188 178 188 230 174 250 C148 250 128 230 128 204 Z M210 158 C236 158 256 178 256 204 C256 230 236 250 210 250 C196 230 196 178 210 158 Z"},{"id":"pumpkin","name":"Pumpkin","category":"fantasy","viewBox":"0 0 384 448","path":"M192 384 C104 384 50 326 50 252 C50 178 104 126 192 126 C280 126 334 178 334 252 C334 326 280 384 192 384 Z M176 126 L188 74 L230 74 L214 132 Z M128 162 C108 212 108 296 128 350 M192 132 C170 200 170 310 192 384 M256 162 C276 212 276 296 256 350 M126 238 L164 214 L152 260 Z M258 238 L220 214 L232 260 Z M142 310 C174 334 210 334 242 310 C228 358 156 358 142 310 Z"},{"id":"alien","name":"Alien","category":"fantasy","viewBox":"0 0 384 448","path":"M192 66 C270 66 326 130 326 220 C326 316 260 388 192 388 C124 388 58 316 58 220 C58 130 114 66 192 66 Z M112 220 C132 184 174 184 194 220 C174 258 132 258 112 220 Z M190 220 C210 184 252 184 272 220 C252 258 210 258 190 220 Z M154 318 C174 336 210 336 230 318"},{"id":"planet","name":"Planet","category":"space","viewBox":"0 0 384 448","path":"M192 106 C264 106 322 164 322 236 C322 308 264 366 192 366 C120 366 62 308 62 236 C62 164 120 106 192 106 Z M34 280 C80 208 202 156 350 154 C308 224 186 278 34 280 Z"},{"id":"robot","name":"Robot","category":"fantasy","viewBox":"0 0 384 448","path":"M92 136 L292 136 L292 354 L92 354 Z M152 136 L152 92 L232 92 L232 136 Z M142 220 C142 196 178 196 178 220 C178 244 142 244 142 220 Z M206 220 C206 196 242 196 242 220 C242 244 206 244 206 220 Z M142 294 L242 294 L242 322 L142 322 Z M52 194 L92 194 L92 300 L52 300 Z M292 194 L332 194 L332 300 L292 300 Z"}];

// ── SHAPE RASTERIZER ──────────────────────────────────────────────────────────
function rasterizeShape(svgPath, viewBox, cols, rows) {
  const active = new Set();
  try {
    const canvas = document.createElement("canvas");
    const W = cols * 4, H = rows * 4;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const [,, vW, vH] = viewBox.split(" ").map(Number);
    ctx.scale(W / vW, H / vH);
    ctx.fillStyle = "#fff";
    ctx.fill(new Path2D(svgPath));
    const img = ctx.getImageData(0, 0, W, H);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = Math.floor((col + 0.5) * 4);
        const py = Math.floor((row + 0.5) * 4);
        const idx = (py * W + px) * 4;
        if (img.data[idx] > 128) active.add(`${col},${row}`);
      }
    }
  } catch (e) {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        active.add(`${c},${r}`);
  }
  return active;
}

// ── LCG RANDOM ────────────────────────────────────────────────────────────────
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

// ── LEVEL CONFIG ──────────────────────────────────────────────────────────────
function getLevelConfig(lvlNum) {
  const pos   = ((lvlNum - 1) % 10) + 1;
  const cycle = Math.floor((lvlNum - 1) / 10);
  const seed  = lvlNum * 777991 + 112358;
  const scale = Math.floor(cycle / 2);

  if (pos === 1) {
    const cols = Math.min(18 + scale, 28), rows = Math.min(22 + scale, 34);
    return { cols, rows, minLen: 3, maxLen: Math.min(8 + scale, 14), seed, isShape: true, label: "Easy", depRate: 0.25, boxRate: 0.05 };
  } else if (pos <= 4) {
    const cols = Math.min(16 + scale * 2, 26), rows = Math.min(20 + scale * 2, 32);
    return { cols, rows, minLen: 3, maxLen: Math.min(6 + pos + scale, 14), seed, label: "Easy", depRate: 0.25, boxRate: 0.05 };
  } else if (pos === 5) {
    const cols = Math.min(20 + scale * 2, 30), rows = Math.min(24 + scale * 2, 36);
    return { cols, rows, minLen: Math.min(5 + scale, 8), maxLen: Math.min(14 + scale, 22), seed, label: "Medium", depRate: 0.55, boxRate: 0.10 };
  } else if (pos === 6) {
    const cols = Math.min(22 + scale, 32), rows = Math.min(26 + scale, 38);
    return { cols, rows, minLen: Math.min(5 + scale, 8), maxLen: Math.min(16 + scale, 24), seed, isShape: true, label: "Medium", depRate: 0.55, boxRate: 0.10 };
  } else if (pos <= 9) {
    const cols = Math.min(22 + scale * 2, 32), rows = Math.min(26 + scale * 2, 38);
    return { cols, rows, minLen: Math.min(7 + scale, 12), maxLen: Math.min(20 + scale * 2, 32), seed, label: "Hard", depRate: 0.90, boxRate: 0.20 };
  } else {
    const cols = Math.min(26 + scale * 2, 36), rows = Math.min(30 + scale * 2, 42);
    return { cols, rows, minLen: Math.min(9 + scale, 14), maxLen: Math.min(26 + scale * 2, 38), seed, label: "Expert", depRate: 1.00, boxRate: 0.30 };
  }
}

// ── MAKE LEVEL ────────────────────────────────────────────────────────────────
function makeLevel(cols, rows, minLen, maxLen, seed, depRate, boxRate, activeCells = null) {
  const rand = lcg(seed);
  const ri = n => Math.floor(rand() * n);
  const key = (x, y) => `${x},${y}`;
  const inBounds = (x, y) => x >= 0 && x < cols && y >= 0 && y < rows && (!activeCells || activeCells.has(key(x, y)));

  const validCells = activeCells
    ? [...activeCells].map(k => k.split(",").map(Number)).map(([x, y]) => ({ x, y }))
    : Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => ({ x: c, y: r }))).flat();

  const treeNbrs = new Map();
  for (const c of validCells) treeNbrs.set(key(c.x, c.y), []);

  const mazeVisited = new Set();
  const startCell = validCells[ri(validCells.length)];
  mazeVisited.add(key(startCell.x, startCell.y));
  const stack = [startCell];

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const unvisited = [...DK]
      .sort(() => rand() - 0.5)
      .map(d => { const { dx, dy } = DV[d]; return { x: cur.x + dx, y: cur.y + dy }; })
      .filter(n => inBounds(n.x, n.y) && !mazeVisited.has(key(n.x, n.y)));
    if (unvisited.length) {
      const next = unvisited[0];
      const nk = key(next.x, next.y), ck = key(cur.x, cur.y);
      mazeVisited.add(nk);
      treeNbrs.get(ck).push(nk);
      treeNbrs.get(nk).push(ck);
      stack.push(next);
    } else { stack.pop(); }
  }

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
    while (seg.length < maxLen) {
      const curKey = seg[seg.length - 1];
      const unassignedNbrs = treeNbrs.get(curKey).filter(n => !assigned.has(n));
      if (!unassignedNbrs.length) break;
      let nextKey = unassignedNbrs[0];
      if (seg.length >= 2) {
        const [cx, cy] = curKey.split(",").map(Number);
        const [px, py] = seg[seg.length - 2].split(",").map(Number);
        const straight = key(cx + (cx - px), cy + (cy - py));
        if (unassignedNbrs.includes(straight)) nextKey = straight;
      }
      const junctionThreshold = Math.max(minLen, Math.floor(maxLen * 0.45));
      if (seg.length >= junctionThreshold && unassignedNbrs.length > 1) break;
      seg.push(nextKey);
      assigned.add(nextKey);
    }
    segments.push(seg.map(k => { const [x, y] = k.split(",").map(Number); return { x, y }; }));
  }

  const snakes = [];
  let id = 0;

  for (const cells of segments) {
    const bodyDx = Math.abs(cells[0].x - cells[cells.length - 1].x);
    const bodyDy = Math.abs(cells[0].y - cells[cells.length - 1].y);
    const isHoriz = bodyDx >= bodyDy;
    const makeDirs = () => {
      if (rand() < 0.6) {
        const axial = (isHoriz ? ["L", "R"] : ["U", "D"]).sort(() => rand() - 0.5);
        const lateral = (isHoriz ? ["U", "D"] : ["L", "R"]).sort(() => rand() - 0.5);
        return [...axial, ...lateral];
      }
      return [...DK].sort(() => rand() - 0.5);
    };

    const isInstantExit = (orientation, dir) => {
      const h = orientation[0];
      const { dx, dy } = DV[dir];
      const nx = h.x + dx, ny = h.y + dy;
      return (nx < 0 || nx >= cols || ny < 0 || ny >= rows) || (activeCells && !activeCells.has(key(nx, ny)));
    };

    let placed = null, fallback = null;
    for (const [orientation, dl] of [[cells, makeDirs()], [[...cells].reverse(), makeDirs()]]) {
      if (placed) break;
      for (const dir of dl) {
        if (isInstantExit(orientation, dir) && rand() < 0.5) continue;
        const ownCells = new Set(orientation.map(c => key(c.x, c.y)));
        const ray = getExitRayCells({ cells: orientation, dir }, cols, rows, activeCells);
        if (ray.some(c => ownCells.has(`${c.x},${c.y}`))) continue;
        const candidate = { id, dir, cells: orientation };
        if (!simulateExit(candidate, snakes, cols, rows, activeCells)) continue;
        const hasDep = createsDependency(candidate, snakes, cols, rows, activeCells);
        const requireDep = snakes.length > 0 && rand() < depRate;
        if (!requireDep || hasDep) { placed = candidate; break; }
        else if (!fallback) fallback = candidate;
      }
    }

    let final = placed || fallback;
    if (!final) {
      for (const dir of [...DK].sort(() => rand() - 0.5)) {
        const ownCells = new Set(cells.map(c => key(c.x, c.y)));
        const ray = getExitRayCells({ cells, dir }, cols, rows, activeCells);
        if (!ray.some(c => ownCells.has(`${c.x},${c.y}`))) { final = { id, dir, cells }; break; }
      }
    }
    if (final) { snakes.push(final); id++; }
  }

  return { cols, rows, snakes };
}

// ── MINI PREVIEW ──────────────────────────────────────────────────────────────
const DIR_ARROW = { R: "→", L: "←", D: "↓", U: "↑" };
const COLORS = ["#ff6b6b","#4ecdc4","#ffd93d","#ff8cc8","#a8e6cf","#c3a6ff","#7bed9f","#ffb347","#45b7d1","#fd79a8","#a29bfe","#55efc4"];

function MiniPreview({ level, shapeId }) {
  if (!level) return null;
  const { cols, rows, snakes } = level;
  const size = Math.min(Math.floor(280 / cols), Math.floor(320 / rows), 12);

  const cellMap = new Map();
  snakes.forEach(s => s.cells.forEach(c => cellMap.set(`${c.x},${c.y}`, s.id)));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {shapeId && <div style={{ color: "#4a9eff", fontSize: 12 }}>Shape: {shapeId}</div>}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gridTemplateRows: `repeat(${rows}, ${size}px)`,
        gap: 1, background: "#1e2438", padding: 4, borderRadius: 6
      }}>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const sid = cellMap.get(`${c},${r}`);
            const snake = sid != null ? snakes.find(s => s.id === sid) : null;
            const isHead = snake && snake.cells[0].x === c && snake.cells[0].y === r;
            return (
              <div key={`${c},${r}`} style={{
                width: size, height: size,
                background: sid != null ? COLORS[sid % COLORS.length] : "#0d1020",
                borderRadius: 2,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: size * 0.7, lineHeight: 1,
              }}>
                {isHead && size >= 8 ? DIR_ARROW[snake.dir] : ""}
              </div>
            );
          })
        )}
      </div>
      <div style={{ color: "#4a5070", fontSize: 11 }}>{cols}×{rows} · {snakes.length} pieces</div>
    </div>
  );
}

// ── GENERATOR UI ──────────────────────────────────────────────────────────────
export default function Generator() {
  const [count, setCount]       = useState(50);
  const [startAt, setStartAt]   = useState(1);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [levels, setLevels]     = useState(null);
  const [preview, setPreview]   = useState(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  const generate = useCallback(async () => {
    setGenerating(true);
    setProgress(0);
    setLevels(null);
    setPreview(null);

    const result = [];

    for (let i = 0; i < count; i++) {
      const lvlNum = startAt + i;
      const cfg = getLevelConfig(lvlNum);
      let activeCells = null;
      let shapeId = null;

      if (cfg.isShape) {
        const shapeIdx = Math.floor((lvlNum - 1) / 5) % SHAPES.length;
        const shape = SHAPES[shapeIdx];
        shapeId = shape.id;
        activeCells = rasterizeShape(shape.path, shape.viewBox, cfg.cols, cfg.rows);
      }

      const { cols, rows, snakes } = makeLevel(
        cfg.cols, cfg.rows, cfg.minLen, cfg.maxLen,
        cfg.seed, cfg.depRate, cfg.boxRate, activeCells
      );

      result.push({
        id: lvlNum,
        label: cfg.label,
        cols,
        rows,
        isShape: !!cfg.isShape,
        shapeId,
        snakes,
      });

      setProgress(Math.round(((i + 1) / count) * 100));

      // Yield to browser every 5 levels so UI stays responsive
      if (i % 5 === 4) await new Promise(r => setTimeout(r, 0));
    }

    setLevels(result);
    setPreview(result[0]);
    setPreviewIdx(0);
    setGenerating(false);
  }, [count, startAt]);

  const download = () => {
    const blob = new Blob([JSON.stringify(levels, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "levels.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const showLevel = (idx) => {
    setPreviewIdx(idx);
    setPreview(levels[idx]);
  };

  const s = {
    page:    { minHeight: "100vh", background: "#0d1020", color: "#fff", fontFamily: "monospace", padding: 24 },
    title:   { fontSize: 22, fontWeight: "bold", marginBottom: 4, color: "#4a9eff" },
    sub:     { fontSize: 13, color: "#4a5070", marginBottom: 32 },
    row:     { display: "flex", alignItems: "center", gap: 16, marginBottom: 16 },
    label:   { fontSize: 13, color: "#c8cfe0", width: 120 },
    input:   { background: "#141828", border: "1px solid #1e2438", borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: 14, width: 80 },
    btn:     { background: "#4a9eff", border: "none", borderRadius: 10, color: "#fff", padding: "12px 28px", fontSize: 15, cursor: "pointer", fontWeight: "bold" },
    btnDl:   { background: "#7bed9f", border: "none", borderRadius: 10, color: "#0d1020", padding: "12px 28px", fontSize: 15, cursor: "pointer", fontWeight: "bold" },
    btnSm:   { background: "#1e2438", border: "1px solid #2a3050", borderRadius: 6, color: "#c8cfe0", padding: "4px 10px", fontSize: 12, cursor: "pointer" },
    bar:     { height: 8, background: "#1e2438", borderRadius: 4, overflow: "hidden", marginBottom: 16 },
    fill:    { height: "100%", background: "#4a9eff", borderRadius: 4, transition: "width 0.2s" },
    card:    { background: "#141828", border: "1px solid #1e2438", borderRadius: 12, padding: 20, marginTop: 24 },
    grid:    { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, maxHeight: 120, overflowY: "auto" },
  };

  return (
    <div style={s.page}>
      <div style={s.title}>🔵 Arrow Puzzle — Level Generator</div>
      <div style={s.sub}>Generates levels and exports levels.json for the game.</div>

      <div style={s.row}>
        <span style={s.label}>Number of levels</span>
        <input style={s.input} type="number" min={1} max={500} value={count}
          onChange={e => setCount(Math.max(1, Math.min(500, +e.target.value)))} />
      </div>
      <div style={s.row}>
        <span style={s.label}>Start at level</span>
        <input style={s.input} type="number" min={1} value={startAt}
          onChange={e => setStartAt(Math.max(1, +e.target.value))} />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button style={s.btn} onClick={generate} disabled={generating}>
          {generating ? `Generating… ${progress}%` : "⚡ Generate"}
        </button>
        {levels && (
          <button style={s.btnDl} onClick={download}>
            ⬇ Download levels.json ({levels.length} levels)
          </button>
        )}
      </div>

      {generating && (
        <div style={s.bar}>
          <div style={{ ...s.fill, width: `${progress}%` }} />
        </div>
      )}

      {levels && (
        <div style={s.card}>
          <div style={{ fontSize: 14, color: "#c8cfe0", marginBottom: 8 }}>
            Preview — Level {preview?.id} ({preview?.label}{preview?.isShape ? `, shape: ${preview?.shapeId}` : ""})
          </div>
          <MiniPreview level={preview} shapeId={preview?.isShape ? preview?.shapeId : null} />
          <div style={s.grid}>
            {levels.map((l, i) => (
              <button key={l.id} style={{
                ...s.btnSm,
                background: i === previewIdx ? "#4a9eff" : "#1e2438",
                color: i === previewIdx ? "#fff" : "#c8cfe0",
              }} onClick={() => showLevel(i)}>
                {l.id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
