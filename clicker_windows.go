//go:build windows

package main

import (
	"math"
	"math/rand"
	"sync"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	procSendInput    = user32.NewProc("SendInput")
	procGetCursorPos = user32.NewProc("GetCursorPos")
	procSetCursorPos = user32.NewProc("SetCursorPos")
)

const (
	INPUT_MOUSE           = 0
	MOUSEEVENTF_LEFTDOWN  = 0x0002
	MOUSEEVENTF_LEFTUP    = 0x0004
	MOUSEEVENTF_RIGHTDOWN = 0x0008
	MOUSEEVENTF_RIGHTUP   = 0x0010
	MOUSEEVENTF_MOVE      = 0x0001
)

type POINT struct{ X, Y int32 }

type MOUSEINPUT struct {
	Dx          int32
	Dy          int32
	MouseData   uint32
	DwFlags     uint32
	Time        uint32
	DwExtraInfo uintptr
}

type INPUT struct {
	Type uint32
	_    uint32
	Mi   MOUSEINPUT
}

type Pattern string

const (
	PatternUniform Pattern = "uniform"
	PatternHuman   Pattern = "human"
	PatternBurst   Pattern = "burst"
)

type SchedulerConfig struct {
	Enabled   bool
	ClickSecs int
	PauseSecs int
	Repeats   int
}

type JitterConfig struct {
	Enabled   bool
	Amplitude int
}

type MacroEvent struct {
	DelayMs int64  `json:"delay_ms"`
	Button  string `json:"button"`
	X       int32  `json:"x"`
	Y       int32  `json:"y"`
}

type HeatmapPoint struct {
	X int32 `json:"x"`
	Y int32 `json:"y"`
}

type AutoClicker struct {
	mu             sync.Mutex
	running        bool
	stop           chan struct{}
	CPS            float64
	Button         string
	HoldMs         int
	ClickPattern   Pattern
	BurstMin       int
	BurstMax       int
	BurstPauseMs   int
	Jitter         JitterConfig
	Scheduler      SchedulerConfig
	MacroEvents    []MacroEvent
	MacroRecording bool
	macroLastTime  time.Time
	macroStopCh    chan struct{}
	HeatmapPoints  []HeatmapPoint
	heatmapStop    chan struct{}
	heatmapMu      sync.Mutex
}

func NewAutoClicker() *AutoClicker {
	return &AutoClicker{
		CPS:          10,
		Button:       "left",
		HoldMs:       10,
		ClickPattern: PatternUniform,
		BurstMin:     3,
		BurstMax:     5,
		BurstPauseMs: 200,
		Jitter:       JitterConfig{Amplitude: 3},
		Scheduler:    SchedulerConfig{ClickSecs: 5, PauseSecs: 2, Repeats: 0},
	}
}

func (ac *AutoClicker) Start() {
	ac.mu.Lock()
	defer ac.mu.Unlock()
	if ac.running {
		return
	}
	ac.running = true
	ac.stop = make(chan struct{})
	go ac.loop(ac.stop)
}

func (ac *AutoClicker) Stop() {
	ac.mu.Lock()
	defer ac.mu.Unlock()
	if !ac.running {
		return
	}
	ac.running = false
	close(ac.stop)
	ac.stop = nil
}

func (ac *AutoClicker) IsRunning() bool {
	ac.mu.Lock()
	defer ac.mu.Unlock()
	return ac.running
}

func (ac *AutoClicker) loop(stop chan struct{}) {
	ac.mu.Lock()
	cfg := ac.snapshot()
	ac.mu.Unlock()

	if cfg.Scheduler.Enabled {
		ac.schedulerLoop(stop, cfg)
	} else {
		ac.clickLoop(stop, cfg, -1)
	}
}

type clickerSnapshot struct {
	CPS          float64
	Button       string
	HoldMs       int
	Pattern      Pattern
	BurstMin     int
	BurstMax     int
	BurstPauseMs int
	Jitter       JitterConfig
	Scheduler    SchedulerConfig
}

func (ac *AutoClicker) snapshot() clickerSnapshot {
	return clickerSnapshot{
		CPS:          ac.CPS,
		Button:       ac.Button,
		HoldMs:       ac.HoldMs,
		Pattern:      ac.ClickPattern,
		BurstMin:     ac.BurstMin,
		BurstMax:     ac.BurstMax,
		BurstPauseMs: ac.BurstPauseMs,
		Jitter:       ac.Jitter,
		Scheduler:    ac.Scheduler,
	}
}

func (ac *AutoClicker) schedulerLoop(stop chan struct{}, cfg clickerSnapshot) {
	repeats := cfg.Scheduler.Repeats
	iteration := 0
	for {
		if repeats > 0 && iteration >= repeats {
			ac.Stop()
			return
		}
		clickDone := make(chan struct{})
		clickStop := make(chan struct{})
		go func() {
			defer close(clickDone)
			ac.clickLoop(clickStop, cfg, int64(cfg.Scheduler.ClickSecs)*int64(time.Second))
		}()
		select {
		case <-stop:
			close(clickStop)
			<-clickDone
			return
		case <-clickDone:
		}
		select {
		case <-stop:
			return
		case <-time.After(time.Duration(cfg.Scheduler.PauseSecs) * time.Second):
		}
		iteration++
	}
}

func (ac *AutoClicker) clickLoop(stop chan struct{}, cfg clickerSnapshot, durationNs int64) {
	deadline := time.Time{}
	if durationNs > 0 {
		deadline = time.Now().Add(time.Duration(durationNs))
	}
	switch cfg.Pattern {
	case PatternBurst:
		ac.burstLoop(stop, cfg, deadline)
	default:
		ac.uniformLoop(stop, cfg, deadline)
	}
}

func (ac *AutoClicker) uniformLoop(stop chan struct{}, cfg clickerSnapshot, deadline time.Time) {
	if cfg.CPS <= 0 {
		cfg.CPS = 1
	}
	baseInterval := time.Duration(float64(time.Second) / cfg.CPS)
	for {
		select {
		case <-stop:
			return
		default:
		}
		if !deadline.IsZero() && time.Now().After(deadline) {
			return
		}
		interval := baseInterval
		if cfg.Pattern == PatternHuman {
			interval = time.Duration(float64(baseInterval) * (1.0 + (rand.Float64()*0.30 - 0.15)))
		}
		sendClickWithJitter(cfg.Button, cfg.HoldMs, cfg.Jitter)
		select {
		case <-stop:
			return
		case <-time.After(interval):
		}
	}
}

func (ac *AutoClicker) burstLoop(stop chan struct{}, cfg clickerSnapshot, deadline time.Time) {
	baseInterval := time.Duration(float64(time.Second) / cfg.CPS)
	for {
		select {
		case <-stop:
			return
		default:
		}
		if !deadline.IsZero() && time.Now().After(deadline) {
			return
		}
		burstCount := cfg.BurstMin + rand.Intn(cfg.BurstMax-cfg.BurstMin+1)
		for i := 0; i < burstCount; i++ {
			select {
			case <-stop:
				return
			default:
			}
			sendClickWithJitter(cfg.Button, cfg.HoldMs, cfg.Jitter)
			time.Sleep(baseInterval)
		}
		select {
		case <-stop:
			return
		case <-time.After(time.Duration(cfg.BurstPauseMs) * time.Millisecond):
		}
	}
}

func sendClickWithJitter(button string, holdMs int, jitter JitterConfig) {
	if jitter.Enabled && jitter.Amplitude > 0 {
		applyJitter(jitter.Amplitude)
	}
	sendClick(button, holdMs)
}

func applyJitter(amplitude int) {
	amp := float64(amplitude)
	dx := int32((rand.Float64()*2 - 1) * amp * math.Pi / 2)
	dy := int32((rand.Float64()*2 - 1) * amp * math.Pi / 2)
	inp := INPUT{Type: INPUT_MOUSE, Mi: MOUSEINPUT{DwFlags: MOUSEEVENTF_MOVE, Dx: dx, Dy: dy}}
	procSendInput.Call(1, uintptr(unsafe.Pointer(&inp)), unsafe.Sizeof(inp))
}

func sendClick(button string, holdMs int) {
	var downFlag, upFlag uint32
	if button == "right" {
		downFlag = MOUSEEVENTF_RIGHTDOWN
		upFlag = MOUSEEVENTF_RIGHTUP
	} else {
		downFlag = MOUSEEVENTF_LEFTDOWN
		upFlag = MOUSEEVENTF_LEFTUP
	}
	down := INPUT{Type: INPUT_MOUSE, Mi: MOUSEINPUT{DwFlags: downFlag}}
	up := INPUT{Type: INPUT_MOUSE, Mi: MOUSEINPUT{DwFlags: upFlag}}
	sz := unsafe.Sizeof(down)
	procSendInput.Call(1, uintptr(unsafe.Pointer(&down)), sz)
	if holdMs > 0 {
		time.Sleep(time.Duration(holdMs) * time.Millisecond)
	}
	procSendInput.Call(1, uintptr(unsafe.Pointer(&up)), sz)
	_ = windows.GetLastError
}

func (ac *AutoClicker) StartMacroRecord() {
	ac.mu.Lock()
	defer ac.mu.Unlock()
	ac.MacroEvents = nil
	ac.MacroRecording = true
	ac.macroLastTime = time.Now()
}

func (ac *AutoClicker) StopMacroRecord() {
	ac.mu.Lock()
	defer ac.mu.Unlock()
	ac.MacroRecording = false
}

func (ac *AutoClicker) RecordClick(button string) {
	ac.mu.Lock()
	defer ac.mu.Unlock()
	if !ac.MacroRecording {
		return
	}
	now := time.Now()
	delay := now.Sub(ac.macroLastTime).Milliseconds()
	ac.macroLastTime = now
	var pt POINT
	procGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
	ac.MacroEvents = append(ac.MacroEvents, MacroEvent{
		DelayMs: delay,
		Button:  button,
		X:       pt.X,
		Y:       pt.Y,
	})
}

func (ac *AutoClicker) PlayMacro(stop chan struct{}) {
	ac.mu.Lock()
	events := make([]MacroEvent, len(ac.MacroEvents))
	copy(events, ac.MacroEvents)
	ac.mu.Unlock()
	if len(events) == 0 {
		return
	}
	for {
		for _, ev := range events {
			select {
			case <-stop:
				return
			case <-time.After(time.Duration(ev.DelayMs) * time.Millisecond):
			}
			procSetCursorPos.Call(uintptr(ev.X), uintptr(ev.Y))
			sendClick(ev.Button, 10)
		}
		select {
		case <-stop:
			return
		default:
		}
	}
}

func (ac *AutoClicker) StartHeatmap(hookHandle *uintptr) {
	ac.heatmapMu.Lock()
	ac.HeatmapPoints = nil
	ac.heatmapMu.Unlock()
}

func (ac *AutoClicker) RecordHeatmapClick() {
	var pt POINT
	procGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
	ac.heatmapMu.Lock()
	ac.HeatmapPoints = append(ac.HeatmapPoints, HeatmapPoint{X: pt.X, Y: pt.Y})
	ac.heatmapMu.Unlock()
}

func (ac *AutoClicker) GetHeatmapPoints() []HeatmapPoint {
	ac.heatmapMu.Lock()
	defer ac.heatmapMu.Unlock()
	out := make([]HeatmapPoint, len(ac.HeatmapPoints))
	copy(out, ac.HeatmapPoints)
	return out
}

func (ac *AutoClicker) ClearHeatmap() {
	ac.heatmapMu.Lock()
	defer ac.heatmapMu.Unlock()
	ac.HeatmapPoints = nil
}
