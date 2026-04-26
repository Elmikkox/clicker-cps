//go:build !windows

package main

// installHook is a no-op on non-Windows platforms
func (a *App) installHook(stopCh chan struct{}) {
	<-stopCh
}

func (a *App) SetClickerStartBind(vk uint32) {}
func (a *App) SetClickerStopBind(vk uint32)  {}
func (a *App) ClearClickerBinds()            {}
func (a *App) runKeyboardHook()              {}
