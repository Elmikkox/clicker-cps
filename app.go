package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Mode string

const (
	ModeAll Mode = "all"
	ModeLMB Mode = "lmb"
	ModeRMB Mode = "rmb"
)

type App struct {
	ctx      context.Context
	mu       sync.Mutex
	mode     Mode
	running  bool
	stopHook chan struct{}

	lmb       clickTrack
	rmb       clickTrack
	startTime time.Time

	ac           *AutoClicker
	macroStop    chan struct{}
	macroPlaying bool

	heatmapActive bool
}

type clickTrack struct {
	clicks  []time.Time
	peakCPS float64
	total   int
}

func (t *clickTrack) add(now time.Time) {
	t.clicks = append(t.clicks, now)
	t.total++
	t.prune(now)
	cps := float64(len(t.clicks))
	if cps > t.peakCPS {
		t.peakCPS = cps
	}
}

func (t *clickTrack) prune(now time.Time) {
	cutoff := now.Add(-time.Second)
	i := 0
	for i < len(t.clicks) && t.clicks[i].Before(cutoff) {
		i++
	}
	t.clicks = t.clicks[i:]
}

func (t *clickTrack) cps(now time.Time) float64 {
	t.prune(now)
	return float64(len(t.clicks))
}

func NewApp() *App {
	return &App{
		mode: ModeAll,
		ac:   NewAutoClicker(),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// install permanent keyboard hook for global hotkeys
	go a.runKeyboardHook()

	go func() {
		ticker := time.NewTicker(100 * time.Millisecond)
		defer ticker.Stop()
		for range ticker.C {
			runtime.EventsEmit(ctx, "stats", a.buildStats())
		}
	}()

	go func() {
		ticker := time.NewTicker(200 * time.Millisecond)
		defer ticker.Stop()
		for range ticker.C {
			a.mu.Lock()
			macroPlaying := a.macroPlaying
			macroRecording := a.ac.MacroRecording
			macroLen := len(a.ac.MacroEvents)
			heatmapActive := a.heatmapActive
			heatmapLen := len(a.ac.HeatmapPoints)
			a.mu.Unlock()

			runtime.EventsEmit(ctx, "clicker_status", map[string]interface{}{
				"running":        a.ac.IsRunning(),
				"cps":            a.ac.CPS,
				"button":         a.ac.Button,
				"holdMs":         a.ac.HoldMs,
				"pattern":        string(a.ac.ClickPattern),
				"macroPlaying":   macroPlaying,
				"macroRecording": macroRecording,
				"macroLen":       macroLen,
				"heatmapActive":  heatmapActive,
				"heatmapLen":     heatmapLen,
			})
		}
	}()
}

// ── CPS Counter ───────────────────────────────────────────────────────────────

func (a *App) SetMode(m string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.mode = Mode(m)
}

func (a *App) StartCounting() {
	a.mu.Lock()
	if a.running {
		a.mu.Unlock()
		return
	}
	a.running = true
	a.lmb = clickTrack{}
	a.rmb = clickTrack{}
	a.startTime = time.Now()
	a.stopHook = make(chan struct{})
	stopCh := a.stopHook
	a.mu.Unlock()
	go a.installHook(stopCh)
}

func (a *App) StopCounting() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if !a.running {
		return
	}
	a.running = false
	if a.stopHook != nil {
		close(a.stopHook)
		a.stopHook = nil
	}
}

func (a *App) ResetStats() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.running {
		return
	}
	a.lmb = clickTrack{}
	a.rmb = clickTrack{}
	a.startTime = time.Time{}
}

func (a *App) registerLMB() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if !a.running {
		return
	}
	switch a.mode {
	case ModeAll, ModeLMB:
		a.lmb.add(time.Now())
	}
	if a.ac.MacroRecording {
		go a.ac.RecordClick("left")
	}
	if a.heatmapActive {
		go a.ac.RecordHeatmapClick()
	}
}

func (a *App) registerRMB() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if !a.running {
		return
	}
	switch a.mode {
	case ModeAll, ModeRMB:
		a.rmb.add(time.Now())
	}
	if a.ac.MacroRecording {
		go a.ac.RecordClick("right")
	}
	if a.heatmapActive {
		go a.ac.RecordHeatmapClick()
	}
}

func (a *App) buildStats() map[string]interface{} {
	a.mu.Lock()
	defer a.mu.Unlock()

	now := time.Now()
	lmbCPS := a.lmb.cps(now)
	rmbCPS := a.rmb.cps(now)
	allCPS := lmbCPS + rmbCPS

	var displayCPS, displayPeak float64
	var displayTotal int

	switch a.mode {
	case ModeLMB:
		displayCPS = lmbCPS
		displayPeak = a.lmb.peakCPS
		displayTotal = a.lmb.total
	case ModeRMB:
		displayCPS = rmbCPS
		displayPeak = a.rmb.peakCPS
		displayTotal = a.rmb.total
	default:
		displayCPS = allCPS
		displayPeak = a.lmb.peakCPS + a.rmb.peakCPS
		displayTotal = a.lmb.total + a.rmb.total
	}

	return map[string]interface{}{
		"cps":      displayCPS,
		"peak":     displayPeak,
		"total":    displayTotal,
		"elapsed":  a.formatElapsed(),
		"running":  a.running,
		"mode":     string(a.mode),
		"lmbCPS":   lmbCPS,
		"rmbCPS":   rmbCPS,
		"lmbTotal": a.lmb.total,
		"rmbTotal": a.rmb.total,
	}
}

func (a *App) formatElapsed() string {
	if a.startTime.IsZero() {
		return "00:00"
	}
	d := time.Since(a.startTime)
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	s := int(d.Seconds()) % 60
	if h > 0 {
		return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%02d:%02d", m, s)
}

// ── Auto Clicker ──────────────────────────────────────────────────────────────

func (a *App) ClickerStart() { a.ac.Start() }
func (a *App) ClickerStop()  { a.ac.Stop() }

func (a *App) ClickerSetCPS(cps float64) {
	if cps < 1 {
		cps = 1
	}
	if cps > 50 {
		cps = 50
	}
	wasRunning := a.ac.IsRunning()
	if wasRunning {
		a.ac.Stop()
	}
	a.ac.CPS = cps
	if wasRunning {
		a.ac.Start()
	}
}

func (a *App) ClickerSetButton(btn string) {
	wasRunning := a.ac.IsRunning()
	if wasRunning {
		a.ac.Stop()
	}
	if btn == "right" {
		a.ac.Button = "right"
	} else {
		a.ac.Button = "left"
	}
	if wasRunning {
		a.ac.Start()
	}
}

func (a *App) ClickerSetHoldMs(ms int) {
	if ms < 0 {
		ms = 0
	}
	if ms > 500 {
		ms = 500
	}
	a.ac.HoldMs = ms
}

func (a *App) ClickerSetPattern(p string) {
	wasRunning := a.ac.IsRunning()
	if wasRunning {
		a.ac.Stop()
	}
	switch p {
	case "human":
		a.ac.ClickPattern = PatternHuman
	case "burst":
		a.ac.ClickPattern = PatternBurst
	default:
		a.ac.ClickPattern = PatternUniform
	}
	if wasRunning {
		a.ac.Start()
	}
}

func (a *App) ClickerSetBurst(min, max, pauseMs int) {
	if min < 1 {
		min = 1
	}
	if max < min {
		max = min
	}
	if pauseMs < 0 {
		pauseMs = 0
	}
	a.ac.BurstMin = min
	a.ac.BurstMax = max
	a.ac.BurstPauseMs = pauseMs
}

func (a *App) ClickerSetJitter(enabled bool, amplitude int) {
	if amplitude < 0 {
		amplitude = 0
	}
	if amplitude > 20 {
		amplitude = 20
	}
	a.ac.Jitter = JitterConfig{Enabled: enabled, Amplitude: amplitude}
}

func (a *App) ClickerSetScheduler(enabled bool, clickSecs, pauseSecs, repeats int) {
	a.ac.Scheduler = SchedulerConfig{
		Enabled:   enabled,
		ClickSecs: clickSecs,
		PauseSecs: pauseSecs,
		Repeats:   repeats,
	}
}

func (a *App) ClickerIsRunning() bool { return a.ac.IsRunning() }

// ── Clicker hotkey binds ──────────────────────────────────────────────────────

func (a *App) ClickerSetStartBind(vk uint32) { a.SetClickerStartBind(vk) }
func (a *App) ClickerSetStopBind(vk uint32)  { a.SetClickerStopBind(vk) }
func (a *App) ClickerClearBinds()            { a.ClearClickerBinds() }

// ── Macro ─────────────────────────────────────────────────────────────────────

func (a *App) MacroStartRecord() {
	a.ac.StartMacroRecord()
}

func (a *App) MacroStopRecord() {
	a.ac.StopMacroRecord()
}

func (a *App) MacroPlay() {
	a.mu.Lock()
	if a.macroPlaying {
		a.mu.Unlock()
		return
	}
	a.macroPlaying = true
	a.macroStop = make(chan struct{})
	stopCh := a.macroStop
	a.mu.Unlock()

	go func() {
		a.ac.PlayMacro(stopCh)
		a.mu.Lock()
		a.macroPlaying = false
		a.mu.Unlock()
	}()
}

func (a *App) MacroStopPlay() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if !a.macroPlaying {
		return
	}
	a.macroPlaying = false
	if a.macroStop != nil {
		close(a.macroStop)
		a.macroStop = nil
	}
}

func (a *App) MacroClear() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.ac.MacroEvents = nil
}

func (a *App) MacroGetEvents() []MacroEvent {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([]MacroEvent, len(a.ac.MacroEvents))
	copy(out, a.ac.MacroEvents)
	return out
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

func (a *App) HeatmapStart() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.heatmapActive = true
	a.ac.StartHeatmap(nil)
}

func (a *App) HeatmapStop() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.heatmapActive = false
}

func (a *App) HeatmapClear() {
	a.ac.ClearHeatmap()
}

func (a *App) HeatmapGetPoints() []HeatmapPoint {
	return a.ac.GetHeatmapPoints()
}
