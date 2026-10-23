const G = { 'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟', 'L': 'L' }; 
const ROWS = 10;
const LV = [[100, 'BRO IS DUMB'], [220, 'Below normal'], [600, 'Normal'], [1200, 'Pro'], [1600, 'Extreme Pro'], [1750, 'Almost Grandmaster'], [1900, 'Grandmaster']];
let board, turn, sel, moves, over, hist, botOn = false, botLv = 1200, rating = 1000, room = null, myColor = null;

function init() {
  const back = 'RNBQKBNR'.split(''); board = [];
  for (let r = 0; r < ROWS; r++) {
    board.push([]); for (let c = 0; c < 8; c++) {
      let p = null;
      if (r == 0) p = { t: back[c], c: 'b' }; if (r == 1) p = { t: 'P', c: 'b' }; if (r == 2) p = { t: 'L', c: 'b' };
      if (r == ROWS - 3) p = { t: 'L', c: 'w' }; if (r == ROWS - 2) p = { t: 'P', c: 'w' }; if (r == ROWS - 1) p = { t: back[c], c: 'w' };
      board[r].push(p);
    }
  }
  turn = 'w'; sel = null; moves = []; over = null; hist = []; render();
}

function gen(bd, r, c) {
  const p = bd[r][c], out = []; if (!p) return out;
  const add = (R, C) => { if (R < 0 || R >= ROWS || C < 0 || C > 7) return false; const q = bd[R][C]; if (q && q.c == p.c) return false; out.push([R, C]); return !q; };
  const slide = ds => ds.forEach(([a, b]) => { let R = r + a, C = c + b; while (add(R, C)) { R += a; C += b; } });
  const D = [[1, 1], [1, -1], [-1, 1], [-1, -1]], O = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  if (p.t == 'R') slide(O); else if (p.t == 'B') slide(D); else if (p.t == 'Q') slide(O.concat(D));
  else if (p.t == 'K') O.concat(D).forEach(([a, b]) => add(r + a, c + b));
  else if (p.t == 'N') [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([a, b]) => add(r + a, c + b));
  else if (p.t == 'P') {
    const f = p.c == 'w' ? -1 : 1, s = p.c == 'w' ? ROWS - 2 : 1;
    const e = (R, C) => R >= 0 && R < ROWS && C >= 0 && C < 8;
    if (e(r + f, c) && !bd[r + f][c]) { out.push([r + f, c]); if (r == s && e(r + 2 * f, c) && !bd[r + 2 * f][c]) out.push([r + 2 * f, c]); }
    [-1, 1].forEach(d => { if (e(r + f, c + d) && bd[r + f][c + d] && bd[r + f][c + d].c != p.c) out.push([r + f, c + d]); });
  }
  else { const f = p.c == 'w' ? -1 : 1, rt = p.c == 'w' ? 1 : -1; add(r + f, c); add(r, c + rt); }
  return out;
}

const name = (r, c) => 'abcdefgh'[c] + (ROWS - r);

function apply(r, c, R, C) {
  const cap = board[R][C], p = board[r][c];
  board[R][C] = p; board[r][c] = null; if (p.t == 'P' && (R == 0 || R == ROWS - 1)) p.t = 'Q';
  hist.push(`${p.c == 'w' ? 'White' : 'Black'} ${p.t == 'L' ? 'L' : p.t} ${name(r, c)}${cap ? 'x' : '→'}${name(R, C)}`);
  if (cap && cap.t == 'K') over = p.c; else turn = turn == 'w' ? 'b' : 'w';
  sel = null; moves = []; render();
  if (!over && botOn && !room && turn == 'b') setTimeout(botMove, 350);
}

function render() {
  const bd = document.getElementById('board'); if (!bd) return;
  bd.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < 8; c++) {
      const d = document.createElement('div'), p = board[r][c];
      const m = moves.find(x => x[0] == r && x[1] == c);
      d.className = 'sq ' + ((r + c) % 2 ? 'd' : 'l') + (sel && sel[0] == r && sel[1] == c ? ' sel' : '') + (m ? ' mv' + (p ? ' cap' : '') : '');
      if (p) { d.innerHTML = `<span class="${p.c}">${G[p.t]}</span>`; }
      d.onclick = () => click(r, c); bd.appendChild(d);
    }
  }
  if (document.getElementById('status')) document.getElementById('status').textContent = over ? `🏆 ${over == 'w' ? 'White' : 'Black'} wins by capturing the king!` : `${turn == 'w' ? 'White' : 'Black'} to move`;
  if (document.getElementById('hist')) document.getElementById('hist').innerHTML = hist.map(h => `<li>${h}</li>`).join('');
  if (document.getElementById('noMoves')) document.getElementById('noMoves').style.display = hist.length ? 'none' : 'block';
  if (document.getElementById('hist')) document.getElementById('hist').scrollTop = 1e6;
  if (over && botOn && !room && !over._done) { settle(); }
}

let settled = false;
function settle() {
  if (settled) return; settled = true;
  const lvl = botLv; rating = Math.max(0, Math.round(rating + (over == 'w' ? 1 : -1) * Math.max(10, (lvl - rating) / 10 + 20)));
  showMine();
}

function click(r, c) {
  if (over) return;
  if (botOn && !room && turn == 'b') return;
  if (room && turn != myColor) return;
  const p = board[r][c];
  if (sel && moves.some(x => x[0] == r && x[1] == c)) { apply(sel[0], sel[1], r, c); return; }
  if (p && p.c == turn) { sel = [r, c]; moves = gen(board, r, c); } else { sel = null; moves = []; }
  render();
}

/* Bot Code */
const V = { K: 1000, Q: 9, R: 5, B: 3, N: 3, P: 1, L: 2 };
function evalB(bd) {
  let s = 0; for (let r = 0; r < ROWS; r++) for (let c = 0; c < 8; c++) {
    const p = bd[r][c]; if (!p) continue;
    let v = V[p.t] + ((p.t == 'L' || p.t == 'P') ? 0.1 * (p.c == 'w' ? ROWS - 1 - r : r) : 0); s += p.c == 'b' ? v : -v;
  } return s;
}
function allMoves(bd, col) { const o = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < 8; c++) if (bd[r][c] && bd[r][c].c == col) gen(bd, r, c).forEach(m => o.push([r, c, m[0], m[1]])); return o; }
function sim(bd, m) { const n = bd.map(r => r.slice()), cap = n[m[2]][m[3]]; n[m[2]][m[3]] = n[m[0]][m[1]]; n[m[0]][m[1]] = null; return [n, cap]; }

function search(bd, d, col, a, b) {
  if (d == 0) return evalB(bd);
  const ms = allMoves(bd, col); if (!ms.length) return evalB(bd);
  if (col == 'b') { let best = -1e9; for (const m of ms) { const [n, cap] = sim(bd, m); const v = cap && cap.t == 'K' ? 1e4 + d : search(n, d - 1, 'w', a, b); best = Math.max(best, v); a = Math.max(a, v); if (b <= a) break; } return best; }
  let best = 1e9; for (const m of ms) { const [n, cap] = sim(bd, m); const v = cap && cap.t == 'K' ? -1e4 - d : search(n, d - 1, 'b', a, b); best = Math.min(best, v); b = Math.min(b, v); if (b <= a) break; } return best; }

function botMove() {
  if (over || turn != 'b') return;
  const ms = allMoves(board, 'b'); if (!ms.length) return;
  let pick;
  const depth = botLv <= 220 ? 0 : botLv <= 600 ? 1 : botLv <= 1200 ? 2 : 3;
  if (botLv <= 100) pick = ms[Math.random() * ms.length | 0];
  else if (botLv <= 220) { const caps = ms.filter(m => board[m[2]][m[3]]); pick = (caps.length && Math.random() < .5 ? caps : ms)[Math.random() * (caps.length && Math.random() < .5 ? caps.length : ms.length) | 0]; }
  else {
    const noise = botLv >= 1750 ? 0 : botLv >= 1600 ? .3 : botLv >= 1200 ? .8 : 2;
    let best = -1e9;
    for (const m of ms) {
      const [n, cap] = sim(board, m);
      let v = cap && cap.t == 'K' ? 1e4 : search(n, depth - 1, 'w', -1e9, 1e9);
      v += Math.random() * noise; if (v > best) { best = v; pick = m; }
    }
  }
  apply(pick[0], pick[1], pick[2], pick[3]);
}

function buildLv() {
  if (!document.getElementById('lvs')) return;
  document.getElementById('lvs').innerHTML = '';
  LV.forEach(([n, l]) => {
    const b = document.createElement('button'); b.textContent = `${l} (${n})`;
    if (n == botLv) b.className = 'on';
    b.onclick = () => { botLv = n; if (document.getElementById('botLv')) document.getElementById('botLv').innerHTML = `<b>${n} — ${l}</b>`; buildLv(); };
    document.getElementById('lvs').appendChild(b);
  });
}

function showMine() { const l = LV.slice().reverse().find(x => rating >= x[0]) || LV[0]; if (document.getElementById('mine')) document.getElementById('mine').textContent = `${rating} — ${l[1]}`; }

window.onload = () => {
  init();
  buildLv();
  showMine();
  
  if (document.getElementById('bBot')) {
    document.getElementById('bBot').onclick = () => {
      botOn = !botOn; document.getElementById('bBot').className = botOn ? 'p' : '';
      document.getElementById('bBot').textContent = botOn ? 'Bot: ON' : 'Play vs Bot';
      if (document.getElementById('botTxt')) document.getElementById('botTxt').textContent = botOn ? 'Bot is on. You play White, the bot plays Black.' : 'Bot is off. You are playing with the normal Loless turn system.';
      if (botOn) { init(); settled = false; }
    };
  }
  if (document.getElementById('bReset')) document.getElementById('bReset').onclick = () => { init(); settled = false; };
};
