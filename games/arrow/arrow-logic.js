// ── ARROW PUZZLE: CORE LOGIC ──────────────────────────────────────────────────
// Shared by: game, generator, editor
// Never import anything from React here — pure JS only.

export const DV = { R:{dx:1,dy:0}, L:{dx:-1,dy:0}, D:{dx:0,dy:1}, U:{dx:0,dy:-1} };
export const DK = ["R","L","D","U"];

// Can this snake slide off the board given the current state of all other snakes?
export function simulateExit(snake, all, cols, rows, activeCells=null) {
  const {dx,dy} = DV[snake.dir];
  const occ = new Set();
  for (const s of all) {
    if (s.id === snake.id) continue;
    for (const c of s.cells) occ.add(`${c.x},${c.y}`);
  }
  let cells = snake.cells.map(c => ({...c}));
  for (let step = 0; step < (cols+rows+cells.length)*2; step++) {
    const nx = cells[0].x+dx, ny = cells[0].y+dy;
    const offBoard = nx<0||nx>=cols||ny<0||ny>=rows;
    const offShape = activeCells && !activeCells.has(`${nx},${ny}`);
    if (offBoard || offShape) return true;
    if (occ.has(`${nx},${ny}`)) return false;
    const self = new Set(cells.map(c=>`${c.x},${c.y}`));
    if (self.has(`${nx},${ny}`)) return false;
    cells = [{x:nx,y:ny}, ...cells.slice(0,-1)];
  }
  return false;
}

// Returns the path cells a snake would travel before exiting, or null if blocked.
export function getPreview(snake, all, cols, rows, activeCells=null) {
  if (!simulateExit(snake, all, cols, rows, activeCells)) return null;
  const {dx,dy} = DV[snake.dir];
  const path = [];
  let x = snake.cells[0].x+dx, y = snake.cells[0].y+dy;
  while (x>=0&&x<cols&&y>=0&&y<rows) {
    if (activeCells && !activeCells.has(`${x},${y}`)) break;
    path.push({x,y}); x+=dx; y+=dy;
  }
  return path;
}

// Returns all cells along a snake's exit ray (the path it would travel).
export function getExitRayCells(snake, cols, rows, activeCells=null) {
  const {dx,dy} = DV[snake.dir];
  const ray = [];
  let x = snake.cells[0].x+dx, y = snake.cells[0].y+dy;
  while (x>=0&&x<cols&&y>=0&&y<rows) {
    if (activeCells && !activeCells.has(`${x},${y}`)) break;
    ray.push({x,y});
    x+=dx; y+=dy;
  }
  return ray;
}

// Does the blocker snake sit in the target snake's exit ray?
export function blocksExitPath(blocker, target, cols, rows, activeCells=null) {
  const ray = getExitRayCells(target, cols, rows, activeCells);
  const blockerCells = new Set(blocker.cells.map(c=>`${c.x},${c.y}`));
  return ray.some(c => blockerCells.has(`${c.x},${c.y}`));
}

// Does placing newSnake block any existing snake's exit?
export function createsDependency(newSnake, existing, cols, rows, activeCells=null) {
  return existing.some(s => blocksExitPath(newSnake, s, cols, rows, activeCells));
}

// Animation helpers
export function nextBody(body, dir) {
  const {dx,dy} = DV[dir];
  const newHead = [body[0][0]+dx, body[0][1]+dy];
  return [newHead, ...body.slice(0,-1)];
}

export function isOffBoard([x,y], cols, rows) {
  return x<0||x>=cols||y<0||y>=rows;
}

export function visibleCells(body, cols, rows) {
  return body.filter(c => !isOffBoard(c, cols, rows));
}
