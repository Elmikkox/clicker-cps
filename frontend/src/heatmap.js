import { HeatmapStart, HeatmapStop, HeatmapClear, HeatmapGetPoints } from '../wailsjs/go/main/App';
import { t } from './i18n.js';

let heatmapActive = false;
let pollInterval  = null;

export function initHeatmap() {
  const heatmapStartBtn = document.getElementById('heatmapStartBtn');
  const heatmapStopBtn  = document.getElementById('heatmapStopBtn');
  const heatmapClearBtn = document.getElementById('heatmapClearBtn');
  const heatmapInfo     = document.getElementById('heatmapInfo');
  const heatmapCanvas   = document.getElementById('heatmapCanvas');
  const heatmapEmpty    = document.getElementById('heatmapEmpty');
  const hctx            = heatmapCanvas.getContext('2d');

  // resize canvas when wrap resizes
  new ResizeObserver(() => {
    const wrap = heatmapCanvas.parentElement;
    heatmapCanvas.width  = wrap.clientWidth;
    heatmapCanvas.height = wrap.clientHeight;
    if (heatmapActive) {
      HeatmapGetPoints().then(pts => renderHeatmap(hctx, heatmapCanvas, pts, heatmapInfo, heatmapEmpty));
    }
  }).observe(heatmapCanvas.parentElement);

  heatmapStartBtn.addEventListener('click', () => {
    HeatmapStart();
    heatmapActive = true;
    heatmapStartBtn.disabled = true;
    heatmapStopBtn.disabled  = false;
    heatmapEmpty.style.display = 'none';

    pollInterval = setInterval(() => {
      HeatmapGetPoints().then(pts => {
        if (pts && pts.length > 0) {
          heatmapInfo.textContent = t('clicksRecorded', pts.length);
          const wrap = heatmapCanvas.parentElement;
          heatmapCanvas.width  = wrap.clientWidth;
          heatmapCanvas.height = wrap.clientHeight;
          renderHeatmap(hctx, heatmapCanvas, pts, heatmapInfo, heatmapEmpty);
        }
      });
    }, 500);
  });

  heatmapStopBtn.addEventListener('click', () => {
    HeatmapStop();
    heatmapActive = false;
    heatmapStartBtn.disabled = false;
    heatmapStopBtn.disabled  = true;
    clearInterval(pollInterval);
    HeatmapGetPoints().then(pts => renderHeatmap(hctx, heatmapCanvas, pts, heatmapInfo, heatmapEmpty));
  });

  heatmapClearBtn.addEventListener('click', () => {
    HeatmapClear();
    heatmapInfo.textContent = t('clicksRecorded', 0);
    hctx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
    heatmapEmpty.style.display = 'flex';
  });
}

function renderHeatmap(hctx, canvas, points, infoEl, emptyEl) {
  if (!points || points.length === 0) return;
  const w = canvas.width, h = canvas.height;
  hctx.clearRect(0, 0, w, h);

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  // glow blobs
  points.forEach(pt => {
    const cx = ((pt.x - minX) / rangeX) * (w - 60) + 30;
    const cy = ((pt.y - minY) / rangeY) * (h - 60) + 30;
    const grad = hctx.createRadialGradient(cx, cy, 0, cx, cy, 35);
    grad.addColorStop(0, 'rgba(99,102,241,0.45)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');
    hctx.beginPath();
    hctx.arc(cx, cy, 35, 0, Math.PI * 2);
    hctx.fillStyle = grad;
    hctx.fill();
  });

  // dots
  points.forEach(pt => {
    const cx = ((pt.x - minX) / rangeX) * (w - 60) + 30;
    const cy = ((pt.y - minY) / rangeY) * (h - 60) + 30;
    hctx.beginPath();
    hctx.arc(cx, cy, 3, 0, Math.PI * 2);
    hctx.fillStyle = '#a78bfa';
    hctx.fill();
  });

  if (infoEl) infoEl.textContent = t('clicksRecorded', points.length);
  if (emptyEl) emptyEl.style.display = 'none';
}

export function refreshHeatmapLang() {
  const el = (id) => document.getElementById(id);
  if (el('heatmapEmpty')) el('heatmapEmpty').textContent = t('heatmapEmpty');
}
