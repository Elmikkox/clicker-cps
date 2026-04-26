# CPS Counter & Auto Clicker

> Desktop tool for MCBE PvP — built with Go + Wails + Vanilla JS

![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)
![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat-square&logo=go&logoColor=white)
![Wails](https://img.shields.io/badge/Wails-v2-red?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## Features

### CPS Counter
- Global mouse hook — counts clicks even when the window is not focused
- Modes: **ALL** / **LMB** / **RMB**
- Real-time graph, peak CPS, session timer
- Start / Stop / Reset

### Auto Clicker
- **Uniform** — constant interval
- **Human** — ±15% random variation to bypass anti-cheat
- **Burst** — click bursts with configurable pauses
- **Jitter** — micro mouse movements on each click
- **Scheduler** — click N seconds → pause M seconds → repeat X times
- **Macro** — record and replay click sequences with coordinates
- **Heatmap** — visualize where you click on screen
- **Global hotkeys** — start/stop binds work even in-game

### UI
- Dark theme
- EN / RU language support
- Resizable window with fluid layout
- Sidebar navigation

## Requirements

- Windows 10 / 11
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 11)

## Build

Requires [Wails v2](https://wails.io) and Go 1.21+.

```bash
wails build
```

## Stack

- **Go** — backend logic, WinAPI hooks, auto clicker
- **Wails v2** — Go ↔ JS bridge, native window
- **Vanilla JS** — frontend, no frameworks
- **WinAPI** — `SetWindowsHookEx` for global mouse/keyboard hooks, `SendInput` for click emulation
