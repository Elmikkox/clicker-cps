import { MacroStartRecord, MacroStopRecord, MacroPlay, MacroStopPlay, MacroClear, MacroGetEvents } from '../wailsjs/go/main/App';
import { t } from './i18n.js';

let macroRecording = false;
let macroPlaying   = false;

export function initMacro() {
  const macroRecordBtn  = document.getElementById('macroRecordBtn');
  const macroPlayBtn    = document.getElementById('macroPlayBtn');
  const macroStopBtn    = document.getElementById('macroStopBtn');
  const macroClearBtn   = document.getElementById('macroClearBtn');
  const macroStatusText = document.getElementById('macroStatusText');
  const macroDot        = document.getElementById('macroDot');
  const macroInfo       = document.getElementById('macroInfo');
  const macroList       = document.getElementById('macroList');

  macroRecordBtn.addEventListener('click', () => {
    if (macroRecording) {
      MacroStopRecord();
      macroRecording = false;
      macroRecordBtn.textContent = t('record');
      macroRecordBtn.className   = 'btn btn-red';
      macroDot.classList.remove('active');
      macroStatusText.textContent = t('ready');
      MacroGetEvents().then(events => {
        macroInfo.textContent = t('eventsRecorded', events.length);
        macroPlayBtn.disabled = events.length === 0;
        renderMacroList(events, macroList);
      });
    } else {
      MacroStartRecord();
      macroRecording = true;
      macroRecordBtn.textContent = t('stopRec');
      macroRecordBtn.className   = 'btn btn-stop';
      macroDot.classList.add('active');
      macroStatusText.textContent = t('recording');
      macroPlayBtn.disabled = true;
    }
  });

  macroPlayBtn.addEventListener('click', () => {
    MacroPlay();
    macroPlaying = true;
    macroPlayBtn.disabled = true;
    macroStopBtn.disabled = false;
    macroStatusText.textContent = t('playing');
    macroDot.classList.add('active');
  });

  macroStopBtn.addEventListener('click', () => {
    MacroStopPlay();
    macroPlaying = false;
    macroPlayBtn.disabled = false;
    macroStopBtn.disabled = true;
    macroStatusText.textContent = t('ready');
    macroDot.classList.remove('active');
  });

  macroClearBtn.addEventListener('click', () => {
    MacroClear();
    macroInfo.textContent = t('noEvents');
    macroPlayBtn.disabled = true;
    macroList.innerHTML   = '';
  });
}

function renderMacroList(events, macroList) {
  macroList.innerHTML = '';
  events.slice(0, 20).forEach((ev, i) => {
    const row = document.createElement('div');
    row.className = 'macro-event';
    row.innerHTML = `<span class="macro-idx">#${i + 1}</span><span class="macro-btn ${ev.button}">${ev.button.toUpperCase()}</span><span class="macro-delay">+${ev.delay_ms}ms</span><span class="macro-pos">${ev.x}, ${ev.y}</span>`;
    macroList.appendChild(row);
  });
  if (events.length > 20) {
    const more = document.createElement('div');
    more.className   = 'macro-more';
    more.textContent = t('moreEvents', events.length - 20);
    macroList.appendChild(more);
  }
}

export function refreshMacroLang() {
  const el = (id) => document.getElementById(id);
  if (el('macroRecordBtn') && !macroRecording) el('macroRecordBtn').textContent = t('record');
  if (el('macroPlayBtn'))  el('macroPlayBtn').textContent  = t('play');
  if (el('macroStopBtn'))  el('macroStopBtn').textContent  = t('stop');
  if (el('macroClearBtn')) el('macroClearBtn').textContent = t('clear');
  if (el('macroStatusText') && !macroRecording && !macroPlaying)
    el('macroStatusText').textContent = t('ready');
  if (el('macroInfo')) el('macroInfo').textContent = t('noEvents');
}
