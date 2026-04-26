import './style.css';
import './app.css';
import { t, setLang } from './i18n.js';
import { initCounter, refreshCounterLang } from './counter.js';
import { initClicker, refreshClickerLang } from './clicker.js';
import { initMacro, refreshMacroLang } from './macro.js';
import { initHeatmap, refreshHeatmapLang } from './heatmap.js';

document.querySelector('#app').innerHTML = `
<div class="topbar">
  <button class="lang-btn active" data-lang="en">EN</button>
  <button class="lang-btn" data-lang="ru">RU</button>
</div>
<div class="layout">
  <div class="sidebar">
    <div class="sidebar-logo" id="sidebarLogo">TOOLS</div>
    <div class="nav-item active" data-page="counter">
      <span class="nav-icon">&#x1F4CA;</span>
      <span data-i18n="cpsCounter">CPS Counter</span>
      <span class="nav-dot" id="counterDot"></span>
    </div>
    <div class="nav-item" data-page="clicker">
      <span class="nav-icon">&#x1F5B1;</span>
      <span data-i18n="clicker">Clicker</span>
      <span class="nav-dot" id="clickerDot"></span>
    </div>
  </div>
  <div class="content">

    <div class="page active" id="page-counter">
      <div class="page-header">
        <span class="page-title" data-i18n="cpsCounter">CPS Counter</span>
        <span class="badge" data-i18n="mcbePvp">MCBE PvP</span>
      </div>
      <div class="tabs">
        <button class="tab tab-all active" data-mode="all">ALL</button>
        <button class="tab tab-lmb" data-mode="lmb">LMB</button>
        <button class="tab tab-rmb" data-mode="rmb">RMB</button>
      </div>
      <div class="cps-display">
        <div class="cps-label">
          <span class="status-dot" id="statusDot"></span>
          <span data-i18n="clicksPerSecond">CLICKS PER SECOND</span>
        </div>
        <div class="cps-value mode-all inactive" id="cps">0.0</div>
        <div class="cps-bar-wrap"><div class="cps-bar mode-all" id="cpsBar"></div></div>
      </div>
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label" data-i18n="peak">PEAK</div>
          <div class="stat-value" id="peak">0.0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label" data-i18n="total">TOTAL</div>
          <div class="stat-value" id="total">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label" data-i18n="time">TIME</div>
          <div class="stat-value" id="elapsed">00:00</div>
        </div>
      </div>
      <div class="mini-stats">
        <div class="mini-card">
          <span class="mini-label lmb">LMB</span>
          <span class="mini-val" id="lmbInfo">0 CPS - 0 total</span>
        </div>
        <div class="mini-card">
          <span class="mini-label rmb">RMB</span>
          <span class="mini-val" id="rmbInfo">0 CPS - 0 total</span>
        </div>
      </div>
      <div class="graph-wrap"><canvas id="graph"></canvas></div>
      <div class="btn-row">
        <button class="btn btn-start" id="startBtn">START</button>
        <button class="btn btn-stop" id="stopBtn" disabled>STOP</button>
        <button class="btn btn-reset" id="resetBtn">RESET</button>
      </div>
    </div>

    <div class="page" id="page-clicker">
      <div class="page-header">
        <span class="page-title" data-i18n="autoClicker">Auto Clicker</span>
        <span class="badge" id="clickerBadge" data-i18n="stopped">STOPPED</span>
      </div>
      <div class="sub-tabs">
        <button class="sub-tab active" data-sub="basic" data-i18n="basic">Basic</button>
        <button class="sub-tab" data-sub="pattern" data-i18n="patternTab">Pattern</button>
        <button class="sub-tab" data-sub="scheduler" data-i18n="scheduler">Scheduler</button>
        <button class="sub-tab" data-sub="macro" data-i18n="macro">Macro</button>
        <button class="sub-tab" data-sub="heatmap" data-i18n="heatmap">Heatmap</button>
      </div>

      <div class="sub-page active" id="sub-basic">
        <div class="clicker-status">
          <div class="clicker-cps-big inactive" id="clickerCpsBig">0</div>
          <div class="clicker-info">
            <div class="clicker-info-row"><span data-i18n="cps">CPS</span><span id="infoClickerCPS">10</span></div>
            <div class="clicker-info-row"><span data-i18n="button">BUTTON</span><span id="infoClickerBtn">LEFT</span></div>
            <div class="clicker-info-row"><span data-i18n="hold">HOLD</span><span id="infoClickerHold">10ms</span></div>
            <div class="clicker-info-row"><span data-i18n="pattern">PATTERN</span><span id="infoClickerPattern">UNIFORM</span></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title" data-i18n="settings">SETTINGS</div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="cps">CPS</span>
            <input type="range" class="slider" id="cpsSlider" min="1" max="50" value="10" step="1"/>
            <span class="slider-val" id="cpsSliderVal">10 /s</span>
          </div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="hold">HOLD</span>
            <input type="range" class="slider" id="holdSlider" min="0" max="200" value="10" step="5"/>
            <span class="slider-val" id="holdSliderVal">10 ms</span>
          </div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="button">BUTTON</span>
            <div class="btn-toggle-row" style="flex:1">
              <button class="btn-toggle active-lmb" id="btnLeft" data-i18n="left">LEFT</button>
              <button class="btn-toggle" id="btnRight" data-i18n="right">RIGHT</button>
            </div>
          </div>
        </div>
        <div class="section">
          <div class="section-title" data-i18n="hotkeys">HOTKEYS</div>
          <div class="bind-row">
            <span class="bind-label" data-i18n="start">START</span>
            <div class="bind-key" id="bindStart" data-i18n="clickToSet">Click to set</div>
          </div>
          <div class="bind-row">
            <span class="bind-label" data-i18n="stop">STOP</span>
            <div class="bind-key" id="bindStop" data-i18n="clickToSet">Click to set</div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-green" id="clickerStartBtn">START</button>
          <button class="btn btn-stop" id="clickerStopBtn" disabled>STOP</button>
        </div>
      </div>

      <div class="sub-page" id="sub-pattern">
        <div class="section">
          <div class="section-title" data-i18n="clickPattern">CLICK PATTERN</div>
          <div class="pattern-grid">
            <div class="pattern-card active" data-pattern="uniform">
              <div class="pattern-name" data-i18n="uniform">UNIFORM</div>
              <div class="pattern-desc" data-i18n="uniformDesc">Constant interval between clicks</div>
            </div>
            <div class="pattern-card" data-pattern="human">
              <div class="pattern-name" data-i18n="human">HUMAN</div>
              <div class="pattern-desc" data-i18n="humanDesc">+/-15% random variation</div>
            </div>
            <div class="pattern-card" data-pattern="burst">
              <div class="pattern-name" data-i18n="burst">BURST</div>
              <div class="pattern-desc" data-i18n="burstDesc">Click bursts with pauses</div>
            </div>
          </div>
        </div>
        <div class="section" id="burstSettings" style="display:none">
          <div class="section-title" data-i18n="burstSettings">BURST SETTINGS</div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="min">MIN</span>
            <input type="range" class="slider" id="burstMin" min="1" max="10" value="3" step="1"/>
            <span class="slider-val" id="burstMinVal">3</span>
          </div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="max">MAX</span>
            <input type="range" class="slider" id="burstMax" min="1" max="15" value="5" step="1"/>
            <span class="slider-val" id="burstMaxVal">5</span>
          </div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="pause">PAUSE</span>
            <input type="range" class="slider" id="burstPause" min="50" max="1000" value="200" step="50"/>
            <span class="slider-val" id="burstPauseVal">200ms</span>
          </div>
        </div>
        <div class="section">
          <div class="section-title" data-i18n="jitter">JITTER</div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="enabled">ENABLED</span>
            <div class="btn-toggle-row" style="flex:1">
              <button class="btn-toggle active-lmb" id="jitterOff" data-i18n="off">OFF</button>
              <button class="btn-toggle" id="jitterOn" data-i18n="on">ON</button>
            </div>
          </div>
          <div class="slider-row" id="jitterAmpRow" style="opacity:0.4">
            <span class="slider-label" data-i18n="amplitude">AMPLITUDE</span>
            <input type="range" class="slider" id="jitterAmp" min="1" max="20" value="3" step="1"/>
            <span class="slider-val" id="jitterAmpVal">3 px</span>
          </div>
        </div>
      </div>

      <div class="sub-page" id="sub-scheduler">
        <div class="section">
          <div class="section-title" data-i18n="schedulerTitle">SCHEDULER</div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="enabled">ENABLED</span>
            <div class="btn-toggle-row" style="flex:1">
              <button class="btn-toggle active-lmb" id="schedOff" data-i18n="off">OFF</button>
              <button class="btn-toggle" id="schedOn" data-i18n="on">ON</button>
            </div>
          </div>
        </div>
        <div class="section" id="schedSettings" style="opacity:0.4">
          <div class="section-title" data-i18n="schedule">SCHEDULE</div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="click">CLICK</span>
            <input type="range" class="slider" id="schedClick" min="1" max="60" value="5" step="1"/>
            <span class="slider-val" id="schedClickVal">5 s</span>
          </div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="pause">PAUSE</span>
            <input type="range" class="slider" id="schedPause" min="1" max="60" value="2" step="1"/>
            <span class="slider-val" id="schedPauseVal">2 s</span>
          </div>
          <div class="slider-row">
            <span class="slider-label" data-i18n="repeats">REPEATS</span>
            <input type="range" class="slider" id="schedRepeats" min="0" max="50" value="0" step="1"/>
            <span class="slider-val" id="schedRepeatsVal">inf</span>
          </div>
          <div class="sched-preview" id="schedPreview">Click 5s - Pause 2s - inf</div>
        </div>
      </div>

      <div class="sub-page" id="sub-macro">
        <div class="section">
          <div class="section-title" data-i18n="macroRecorder">MACRO RECORDER</div>
          <div class="macro-status">
            <span class="macro-dot" id="macroDot"></span>
            <span id="macroStatusText" data-i18n="ready">Ready</span>
          </div>
          <div class="macro-info" id="macroInfo" data-i18n="noEvents">No events recorded</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-red" id="macroRecordBtn">RECORD</button>
          <button class="btn btn-green" id="macroPlayBtn" disabled>PLAY</button>
          <button class="btn btn-stop" id="macroStopBtn" disabled>STOP</button>
          <button class="btn btn-reset" id="macroClearBtn">CLEAR</button>
        </div>
        <div class="macro-list" id="macroList"></div>
      </div>

      <div class="sub-page" id="sub-heatmap">
        <div class="section">
          <div class="section-title" data-i18n="heatmapTitle">CLICK HEATMAP</div>
          <div class="heatmap-info" id="heatmapInfo">0 clicks recorded</div>
        </div>
        <div class="btn-row">
          <button class="btn btn-green" id="heatmapStartBtn">START</button>
          <button class="btn btn-stop" id="heatmapStopBtn" disabled>STOP</button>
          <button class="btn btn-reset" id="heatmapClearBtn">CLEAR</button>
        </div>
        <div class="heatmap-wrap">
          <canvas id="heatmapCanvas"></canvas>
          <div class="heatmap-empty" id="heatmapEmpty" data-i18n="heatmapEmpty">
            Start recording to see your click heatmap
          </div>
        </div>
      </div>

    </div>
  </div>
</div>
`;

// Navigation
document.querySelectorAll('.nav-item').forEach(function(item) {
  item.addEventListener('click', function() {
    var page = item.dataset.page;
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    item.classList.add('active');
    document.getElementById('page-' + page).classList.add('active');
  });
});

// Sub-tabs
document.querySelectorAll('.sub-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    var sub = tab.dataset.sub;
    document.querySelectorAll('.sub-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.sub-page').forEach(function(p) { p.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('sub-' + sub).classList.add('active');
  });
});

// Language
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.dataset.i18n;
    var val = t(key);
    if (val) el.textContent = val;
  });
  refreshCounterLang();
  refreshClickerLang();
  refreshMacroLang();
  refreshHeatmapLang();
}

document.querySelectorAll('.lang-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var lang = btn.dataset.lang;
    setLang(lang);
    document.querySelectorAll('.lang-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    applyLang();
  });
});

// Init
initCounter();
initClicker();
initMacro();
initHeatmap();
