import { StartCounting, StopCounting, ResetStats, SetMode } from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { drawGraph, resizeCanvas, pushHistory, resetHistory, MODE_COLORS } from './graph.js';
import { t } from './i18n.js';

const MAX_CPS = 20;

let isRunning = false;
let curMode   = 'all';
let lastCPS   = 0;

// DOM refs — populated in init()
let cpsEl, peakEl, totalEl, elapsedEl, cpsBar;
let lmbInfo, rmbInfo;
let canvas, ctx;
let statusDot, counterDot;
let startBtn, stopBtn, resetBtn;

export function initCounter() {
  cpsEl      = document.getElementById('cps');
  peakEl     = document.getElementById('peak');
  totalEl    = document.getElementById('total');
  elapsedEl  = document.getElementById('elapsed');
  cpsBar     = document.getElementById('cpsBar');
  lmbInfo    = document.getElementById('lmbInfo');
  rmbInfo    = document.getElementById('rmbInfo');
  canvas     = document.getElementById('graph');
  ctx        = canvas.getContext('2d');
  statusDot  = document.getElementById('statusDot');
  counterDot = document.getElementById('counterDot');
  startBtn   = document.getElementById('startBtn');
  stopBtn    = document.getElementById('stopBtn');
  resetBtn   = document.getElementById('resetBtn');

  // tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (isRunning) return;
      curMode = tab.dataset.mode;
      SetMode(curMode);
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      cpsEl.className  = `cps-value mode-${curMode} inactive`;
      cpsBar.className = `cps-bar mode-${curMode}`;
      resetHistory();
      lastCPS = 0;
      resizeCanvas(canvas, ctx, curMode);
    });
  });

  startBtn.addEventListener('click', () => StartCounting());
  stopBtn.addEventListener('click',  () => StopCounting());
  resetBtn.addEventListener('click', () => {
    ResetStats();
    resetHistory();
    lastCPS = 0;
    cpsEl.textContent     = '0.0';
    peakEl.textContent    = '0.0';
    totalEl.textContent   = '0';
    elapsedEl.textContent = '00:00';
    cpsBar.style.width    = '0%';
    lmbInfo.textContent   = `0 CPS · 0 ${t('total').toLowerCase()}`;
    rmbInfo.textContent   = `0 CPS · 0 ${t('total').toLowerCase()}`;
    resizeCanvas(canvas, ctx, curMode);
  });

  // canvas resize observer
  new ResizeObserver(() => resizeCanvas(canvas, ctx, curMode)).observe(canvas.parentElement);
  resizeCanvas(canvas, ctx, curMode);

  // stats from Go
  EventsOn('stats', (data) => {
    const cpsNum  = parseFloat(data.cps);
    const running = data.running;

    if (running !== isRunning) {
      isRunning = running;
      startBtn.disabled = running;
      stopBtn.disabled  = !running;
      resetBtn.disabled = running;
      document.querySelectorAll('.tab').forEach(t => {
        t.style.pointerEvents = running ? 'none' : '';
        t.style.opacity       = running ? '0.5' : '';
      });
      document.querySelector(`.tab[data-mode="${curMode}"]`).style.opacity = '';
      statusDot.classList.toggle('active', running);
      counterDot.classList.toggle('visible', running);
      cpsEl.classList.toggle('inactive', !running);
    }

    if (!running) return;

    cpsEl.textContent     = cpsNum.toFixed(1);
    peakEl.textContent    = parseFloat(data.peak).toFixed(1);
    totalEl.textContent   = data.total;
    elapsedEl.textContent = data.elapsed;
    cpsBar.style.width    = Math.min((cpsNum / MAX_CPS) * 100, 100) + '%';

    lmbInfo.textContent = `${parseFloat(data.lmbCPS).toFixed(1)} CPS · ${data.lmbTotal} ${t('total').toLowerCase()}`;
    rmbInfo.textContent = `${parseFloat(data.rmbCPS).toFixed(1)} CPS · ${data.rmbTotal} ${t('total').toLowerCase()}`;

    if (cpsNum > lastCPS + 1) {
      cpsEl.classList.add('pulse');
      setTimeout(() => cpsEl.classList.remove('pulse'), 100);
    }
    lastCPS = cpsNum;

    pushHistory(cpsNum);
    resizeCanvas(canvas, ctx, curMode);
  });
}

export function refreshCounterLang() {
  if (startBtn)  startBtn.textContent  = t('start');
  if (stopBtn)   stopBtn.textContent   = t('stop');
  if (resetBtn)  resetBtn.textContent  = t('reset');
  document.querySelectorAll('.stat-label').forEach((el, i) => {
    const keys = ['peak', 'total', 'time'];
    if (keys[i]) el.textContent = t(keys[i]);
  });
}
