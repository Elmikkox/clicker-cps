const HISTORY_LEN = 46;
const MAX_CPS = 20;

export const MODE_COLORS = {
  all: { line: '#6366f1', fill: 'rgba(99,102,241,0.35)', dot: '#a78bfa' },
  lmb: { line: '#3b82f6', fill: 'rgba(59,130,246,0.35)', dot: '#60a5fa' },
  rmb: { line: '#ec4899', fill: 'rgba(236,72,153,0.35)',  dot: '#f472b6' },
};

export let history = new Array(HISTORY_LEN).fill(0);

export function pushHistory(val) {
  history.push(val);
  if (history.length > HISTORY_LEN) history.shift();
}

export function resetHistory() {
  history = new Array(HISTORY_LEN).fill(0);
}

export function drawGraph(canvas, ctx, mode) {
  const w = canvas.width, h = canvas.height;
  if (!w || !h) return;

  const colors = MODE_COLORS[mode];
  const maxVal = Math.max(...history, MAX_CPS / 2, 1);
  const stepX  = w / (HISTORY_LEN - 1);

  ctx.clearRect(0, 0, w, h);

  // grid lines
  ctx.strokeStyle = '#1e1e2e';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = (h / 4) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, colors.fill);
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.beginPath();
  history.forEach((v, i) => {
    const x = i * stepX, y = h - (v / maxVal) * (h - 8);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo((HISTORY_LEN - 1) * stepX, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // line
  ctx.beginPath();
  history.forEach((v, i) => {
    const x = i * stepX, y = h - (v / maxVal) * (h - 8);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // dot at latest value
  const lv = history[history.length - 1];
  const dotX = (HISTORY_LEN - 1) * stepX;
  const dotY = h - (lv / maxVal) * (h - 8);
  ctx.beginPath();
  ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
  ctx.fillStyle = colors.dot;
  ctx.fill();
}

export function resizeCanvas(canvas, ctx, mode) {
  const wrap = canvas.parentElement;
  if (!wrap) return;
  const style = getComputedStyle(wrap);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop)  + parseFloat(style.paddingBottom);
  const w = wrap.clientWidth  - padX;
  const h = wrap.clientHeight - padY;
  if (w > 0 && h > 0) {
    canvas.width  = w;
    canvas.height = h;
    drawGraph(canvas, ctx, mode);
  }
}
