import {
  ClickerStart, ClickerStop,
  ClickerSetCPS, ClickerSetButton, ClickerSetHoldMs,
  ClickerSetPattern, ClickerSetBurst, ClickerSetJitter, ClickerSetScheduler,
  ClickerSetStartBind, ClickerSetStopBind
} from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { t } from './i18n.js';

const CODE_TO_VK = {
  'KeyA':0x41,'KeyB':0x42,'KeyC':0x43,'KeyD':0x44,'KeyE':0x45,'KeyF':0x46,
  'KeyG':0x47,'KeyH':0x48,'KeyI':0x49,'KeyJ':0x4A,'KeyK':0x4B,'KeyL':0x4C,
  'KeyM':0x4D,'KeyN':0x4E,'KeyO':0x4F,'KeyP':0x50,'KeyQ':0x51,'KeyR':0x52,
  'KeyS':0x53,'KeyT':0x54,'KeyU':0x55,'KeyV':0x56,'KeyW':0x57,'KeyX':0x58,
  'KeyY':0x59,'KeyZ':0x5A,
  'Digit0':0x30,'Digit1':0x31,'Digit2':0x32,'Digit3':0x33,'Digit4':0x34,
  'Digit5':0x35,'Digit6':0x36,'Digit7':0x37,'Digit8':0x38,'Digit9':0x39,
  'F1':0x70,'F2':0x71,'F3':0x72,'F4':0x73,'F5':0x74,'F6':0x75,
  'F7':0x76,'F8':0x77,'F9':0x78,'F10':0x79,'F11':0x7A,'F12':0x7B,
  'Space':0x20,'Enter':0x0D,'Escape':0x1B,'Tab':0x09,'Backspace':0x08,
  'Insert':0x2D,'Delete':0x2E,'Home':0x24,'End':0x23,
  'PageUp':0x21,'PageDown':0x22,
  'ArrowLeft':0x25,'ArrowUp':0x26,'ArrowRight':0x27,'ArrowDown':0x28,
  'Numpad0':0x60,'Numpad1':0x61,'Numpad2':0x62,'Numpad3':0x63,'Numpad4':0x64,
  'Numpad5':0x65,'Numpad6':0x66,'Numpad7':0x67,'Numpad8':0x68,'Numpad9':0x69,
  'CapsLock':0x14,'ShiftLeft':0x10,'ShiftRight':0x10,
  'ControlLeft':0x11,'ControlRight':0x11,
  'AltLeft':0x12,'AltRight':0x12,
};

function codeToVK(code) { return CODE_TO_VK[code] || 0; }

let clickerRunning = false;
let clickerPattern = 'uniform';
let schedEnabled   = false;
let jitterEnabled  = false;
let startBind      = null;
let stopBind       = null;
let listeningFor   = null;

export function initClicker() {
  const clickerCpsBig   = document.getElementById('clickerCpsBig');
  const clickerBadge    = document.getElementById('clickerBadge');
  const infoClickerCPS  = document.getElementById('infoClickerCPS');
  const infoClickerBtn  = document.getElementById('infoClickerBtn');
  const infoClickerHold = document.getElementById('infoClickerHold');
  const infoClickerPat  = document.getElementById('infoClickerPattern');
  const cpsSlider       = document.getElementById('cpsSlider');
  const cpsSliderVal    = document.getElementById('cpsSliderVal');
  const holdSlider      = document.getElementById('holdSlider');
  const holdSliderVal   = document.getElementById('holdSliderVal');
  const btnLeft         = document.getElementById('btnLeft');
  const btnRight        = document.getElementById('btnRight');
  const bindStart       = document.getElementById('bindStart');
  const bindStop        = document.getElementById('bindStop');
  const clickerStartBtn = document.getElementById('clickerStartBtn');
  const clickerStopBtn  = document.getElementById('clickerStopBtn');
  const clickerDot      = document.getElementById('clickerDot');

  cpsSlider.addEventListener('input', () => {
    const v = parseInt(cpsSlider.value);
    cpsSliderVal.textContent = `${v} /s`;
    ClickerSetCPS(v);
    infoClickerCPS.textContent = v;
    if (clickerRunning) clickerCpsBig.textContent = v;
  });

  holdSlider.addEventListener('input', () => {
    const v = parseInt(holdSlider.value);
    holdSliderVal.textContent = `${v} ms`;
    ClickerSetHoldMs(v);
    infoClickerHold.textContent = `${v}ms`;
  });

  btnLeft.addEventListener('click', () => {
    ClickerSetButton('left');
    btnLeft.className  = 'btn-toggle active-lmb';
    btnRight.className = 'btn-toggle';
    infoClickerBtn.textContent = t('left');
  });

  btnRight.addEventListener('click', () => {
    ClickerSetButton('right');
    btnLeft.className  = 'btn-toggle';
    btnRight.className = 'btn-toggle active-rmb';
    infoClickerBtn.textContent = t('right');
  });

  clickerStartBtn.addEventListener('click', () => ClickerStart());
  clickerStopBtn.addEventListener('click',  () => ClickerStop());

  const patternCards  = document.querySelectorAll('.pattern-card');
  const burstSettings = document.getElementById('burstSettings');
  const burstMin      = document.getElementById('burstMin');
  const burstMax      = document.getElementById('burstMax');
  const burstPause    = document.getElementById('burstPause');
  const burstMinVal   = document.getElementById('burstMinVal');
  const burstMaxVal   = document.getElementById('burstMaxVal');
  const burstPauseVal = document.getElementById('burstPauseVal');
  const jitterOff     = document.getElementById('jitterOff');
  const jitterOn      = document.getElementById('jitterOn');
  const jitterAmpRow  = document.getElementById('jitterAmpRow');
  const jitterAmp     = document.getElementById('jitterAmp');
  const jitterAmpVal  = document.getElementById('jitterAmpVal');

  patternCards.forEach(card => {
    card.addEventListener('click', () => {
      const p = card.dataset.pattern;
      clickerPattern = p;
      ClickerSetPattern(p);
      patternCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      burstSettings.style.display = p === 'burst' ? 'flex' : 'none';
      infoClickerPat.textContent = p.toUpperCase();
    });
  });

  burstMin.addEventListener('input',   () => { burstMinVal.textContent   = burstMin.value;          updateBurst(); });
  burstMax.addEventListener('input',   () => { burstMaxVal.textContent   = burstMax.value;          updateBurst(); });
  burstPause.addEventListener('input', () => { burstPauseVal.textContent = burstPause.value + 'ms'; updateBurst(); });

  function updateBurst() {
    ClickerSetBurst(parseInt(burstMin.value), parseInt(burstMax.value), parseInt(burstPause.value));
  }

  jitterOff.addEventListener('click', () => {
    jitterEnabled = false;
    jitterOff.className = 'btn-toggle active-lmb';
    jitterOn.className  = 'btn-toggle';
    jitterAmpRow.style.opacity = '0.4';
    ClickerSetJitter(false, parseInt(jitterAmp.value));
  });

  jitterOn.addEventListener('click', () => {
    jitterEnabled = true;
    jitterOff.className = 'btn-toggle';
    jitterOn.className  = 'btn-toggle active-lmb';
    jitterAmpRow.style.opacity = '1';
    ClickerSetJitter(true, parseInt(jitterAmp.value));
  });

  jitterAmp.addEventListener('input', () => {
    jitterAmpVal.textContent = jitterAmp.value + ' px';
    ClickerSetJitter(jitterEnabled, parseInt(jitterAmp.value));
  });

  const schedOff        = document.getElementById('schedOff');
  const schedOn         = document.getElementById('schedOn');
  const schedSettings   = document.getElementById('schedSettings');
  const schedClick      = document.getElementById('schedClick');
  const schedPause      = document.getElementById('schedPause');
  const schedRepeats    = document.getElementById('schedRepeats');
  const schedClickVal   = document.getElementById('schedClickVal');
  const schedPauseVal   = document.getElementById('schedPauseVal');
  const schedRepeatsVal = document.getElementById('schedRepeatsVal');
  const schedPreview    = document.getElementById('schedPreview');

  schedOff.addEventListener('click', () => {
    schedEnabled = false;
    schedOff.className = 'btn-toggle active-lmb';
    schedOn.className  = 'btn-toggle';
    schedSettings.style.opacity = '0.4';
    updateScheduler();
  });

  schedOn.addEventListener('click', () => {
    schedEnabled = true;
    schedOff.className = 'btn-toggle';
    schedOn.className  = 'btn-toggle active-lmb';
    schedSettings.style.opacity = '1';
    updateScheduler();
  });

  [schedClick, schedPause, schedRepeats].forEach(el => {
    el.addEventListener('input', () => {
      schedClickVal.textContent   = schedClick.value + ' s';
      schedPauseVal.textContent   = schedPause.value + ' s';
      const r = parseInt(schedRepeats.value);
      schedRepeatsVal.textContent = r === 0 ? 'inf' : r;
      updateSchedulerPreview();
      updateScheduler();
    });
  });

  function updateScheduler() {
    ClickerSetScheduler(schedEnabled, parseInt(schedClick.value), parseInt(schedPause.value), parseInt(schedRepeats.value));
  }

  function updateSchedulerPreview() {
    const c = schedClick.value, p = schedPause.value;
    const r = parseInt(schedRepeats.value);
    schedPreview.textContent = `${t('click')} ${c}s - ${t('pause')} ${p}s - ${r === 0 ? 'inf' : r + 'x'}`;
  }
  updateSchedulerPreview();

  bindStart.addEventListener('click', () => startListening('start'));
  bindStop.addEventListener('click',  () => startListening('stop'));

  function startListening(which) {
    listeningFor = which;
    const el = which === 'start' ? bindStart : bindStop;
    el.textContent = t('pressKey');
    el.classList.add('listening');
  }

  window.addEventListener('keydown', (e) => {
    if (listeningFor) {
      e.preventDefault();
      const key = e.key === ' ' ? 'Space' : e.key;
      if (listeningFor === 'start') {
        startBind = e.code;
        bindStart.textContent = key.toUpperCase();
        bindStart.classList.remove('listening');
        ClickerSetStartBind(codeToVK(e.code));
      } else {
        stopBind = e.code;
        bindStop.textContent = key.toUpperCase();
        bindStop.classList.remove('listening');
        ClickerSetStopBind(codeToVK(e.code));
      }
      listeningFor = null;
      return;
    }
    if (startBind && e.code === startBind && !clickerRunning) ClickerStart();
    if (stopBind  && e.code === stopBind  && clickerRunning)  ClickerStop();
  });

  EventsOn('clicker_status', (data) => {
    const running = data.running;
    if (running !== clickerRunning) {
      clickerRunning = running;
      clickerStartBtn.disabled = running;
      clickerStopBtn.disabled  = !running;
      clickerDot.classList.toggle('visible', running);
      clickerBadge.textContent = running ? t('running') : t('stopped');
      clickerBadge.style.color = running ? '#4ade80' : '#6366f1';
      clickerBadge.style.background = running ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)';
      clickerCpsBig.classList.toggle('inactive', !running);
    }
    if (running) clickerCpsBig.textContent = Math.round(data.cps);
  });
}

export function refreshClickerLang() {
  const el = (id) => document.getElementById(id);
  const badge = el('clickerBadge');
  if (badge) badge.textContent = clickerRunning ? t('running') : t('stopped');
  if (el('bindStart') && !el('bindStart').classList.contains('listening') && !startBind)
    el('bindStart').textContent = t('clickToSet');
  if (el('bindStop') && !el('bindStop').classList.contains('listening') && !stopBind)
    el('bindStop').textContent = t('clickToSet');
}
