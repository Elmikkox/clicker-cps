//go:build windows

package main

import (
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	user32                  = windows.NewLazySystemDLL("user32.dll")
	kernel32                = windows.NewLazySystemDLL("kernel32.dll")
	procSetWindowsHookEx    = user32.NewProc("SetWindowsHookExW")
	procCallNextHookEx      = user32.NewProc("CallNextHookEx")
	procUnhookWindowsHookEx = user32.NewProc("UnhookWindowsHookEx")
	procGetMessage          = user32.NewProc("GetMessageW")
	procTranslateMessage    = user32.NewProc("TranslateMessage")
	procDispatchMessage     = user32.NewProc("DispatchMessageW")
	procPostThreadMessage   = user32.NewProc("PostThreadMessageW")
	procGetCurrentThreadId  = kernel32.NewProc("GetCurrentThreadId")
)

const (
	WH_MOUSE_LL    = 14
	WH_KEYBOARD_LL = 13
	WM_LBUTTONDOWN = 0x0201
	WM_RBUTTONDOWN = 0x0204
	WM_KEYDOWN     = 0x0100
	WM_SYSKEYDOWN  = 0x0104
	WM_QUIT        = 0x0012
)

type MSG struct {
	Hwnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      [2]int32
}

type KBDLLHOOKSTRUCT struct {
	VkCode      uint32
	ScanCode    uint32
	Flags       uint32
	Time        uint32
	DwExtraInfo uintptr
}

type keyBind struct {
	mu      sync.Mutex
	startVK uint32
	stopVK  uint32
}

var globalBinds = &keyBind{}

func (a *App) SetClickerStartBind(vk uint32) {
	globalBinds.mu.Lock()
	defer globalBinds.mu.Unlock()
	globalBinds.startVK = vk
}

func (a *App) SetClickerStopBind(vk uint32) {
	globalBinds.mu.Lock()
	defer globalBinds.mu.Unlock()
	globalBinds.stopVK = vk
}

func (a *App) ClearClickerBinds() {
	globalBinds.mu.Lock()
	defer globalBinds.mu.Unlock()
	globalBinds.startVK = 0
	globalBinds.stopVK = 0
}

func (a *App) runKeyboardHook() {
	var kbHandle uintptr

	kbCb := windows.NewCallback(func(nCode int32, wParam uintptr, lParam uintptr) uintptr {
		if nCode >= 0 && (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN) {
			kb := (*KBDLLHOOKSTRUCT)(unsafe.Pointer(lParam)) //nolint:unsafeptr
			globalBinds.mu.Lock()
			startVK := globalBinds.startVK
			stopVK := globalBinds.stopVK
			globalBinds.mu.Unlock()

			if startVK != 0 && kb.VkCode == startVK && !a.ac.IsRunning() {
				go a.ac.Start()
			}
			if stopVK != 0 && kb.VkCode == stopVK && a.ac.IsRunning() {
				go a.ac.Stop()
			}
		}
		ret, _, _ := procCallNextHookEx.Call(kbHandle, uintptr(nCode), wParam, lParam)
		return ret
	})

	kh, _, _ := procSetWindowsHookEx.Call(WH_KEYBOARD_LL, kbCb, 0, 0)
	if kh == 0 {
		return
	}
	kbHandle = kh

	var msg MSG
	for {
		ret, _, _ := procGetMessage.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if ret == 0 || ret == ^uintptr(0) {
			break
		}
		procTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		procDispatchMessage.Call(uintptr(unsafe.Pointer(&msg)))
	}

	procUnhookWindowsHookEx.Call(kbHandle)
}

func (a *App) installHook(stopCh chan struct{}) {
	var mouseHandle uintptr

	mouseCb := windows.NewCallback(func(nCode int32, wParam uintptr, lParam uintptr) uintptr {
		if nCode >= 0 {
			switch wParam {
			case WM_LBUTTONDOWN:
				a.registerLMB()
			case WM_RBUTTONDOWN:
				a.registerRMB()
			}
		}
		ret, _, _ := procCallNextHookEx.Call(mouseHandle, uintptr(nCode), wParam, lParam)
		return ret
	})

	mh, _, _ := procSetWindowsHookEx.Call(WH_MOUSE_LL, mouseCb, 0, 0)
	if mh == 0 {
		return
	}
	mouseHandle = mh

	tid, _, _ := procGetCurrentThreadId.Call()

	go func() {
		<-stopCh
		procPostThreadMessage.Call(tid, WM_QUIT, 0, 0)
	}()

	var msg MSG
	for {
		ret, _, _ := procGetMessage.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if ret == 0 || ret == ^uintptr(0) {
			break
		}
		procTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		procDispatchMessage.Call(uintptr(unsafe.Pointer(&msg)))
	}

	procUnhookWindowsHookEx.Call(mouseHandle)
}
