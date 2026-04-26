//go:build !windows

package main

import "sync"

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
	HeatmapPoints  []HeatmapPoint
}

func NewAutoClicker() *AutoClicker {
	return &AutoClicker{
		CPS: 10, Button: "left", HoldMs: 10,
		ClickPattern: PatternUniform,
		BurstMin:     3, BurstMax: 5, BurstPauseMs: 200,
		Jitter:    JitterConfig{Amplitude: 3},
		Scheduler: SchedulerConfig{ClickSecs: 5, PauseSecs: 2},
	}
}

func (ac *AutoClicker) Start()                           {}
func (ac *AutoClicker) Stop()                            {}
func (ac *AutoClicker) IsRunning() bool                  { return false }
func (ac *AutoClicker) StartMacroRecord()                {}
func (ac *AutoClicker) StopMacroRecord()                 {}
func (ac *AutoClicker) RecordClick(button string)        {}
func (ac *AutoClicker) PlayMacro(stop chan struct{})     {}
func (ac *AutoClicker) StartHeatmap(h *uintptr)          {}
func (ac *AutoClicker) RecordHeatmapClick()              {}
func (ac *AutoClicker) GetHeatmapPoints() []HeatmapPoint { return nil }
func (ac *AutoClicker) ClearHeatmap()                    {}
