import { createApp, reactive, type App } from 'vue'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import Aura from '@primeuix/themes/aura'
import StationFrame from '../components/space/StationFrame.vue'
import { stationMeta, stations, type StationId } from '../components/space/stations'
import { useSpaceStore } from '../stores/useSpaceStore'

export type { StationId }
export { stationMeta, stations }

export const stationWindows = reactive<Record<StationId, boolean>>({
  radar: false,
  helm: false,
  tactical: false,
  engineering: false
})

interface StationWindowEntry {
  win: Window
  app: App
  closing: boolean
}

const windows: Partial<Record<StationId, StationWindowEntry>> = {}
let parentHooked = false

interface WindowBounds {
  left: number
  top: number
  width: number
  height: number
}

function boundsKey(id: StationId) {
  return `mujs_station_window_${id}`
}

function readSavedBounds(id: StationId): WindowBounds | null {
  try {
    const raw = localStorage.getItem(boundsKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as WindowBounds
    if (![parsed.left, parsed.top, parsed.width, parsed.height].every((value) => Number.isFinite(value))) return null
    if (parsed.width < 360 || parsed.height < 280) return null
    return parsed
  } catch {
    return null
  }
}

function saveBounds(id: StationId, win: Window) {
  if (win.closed) return
  const bounds: WindowBounds = {
    left: win.screenX,
    top: win.screenY,
    width: Math.max(360, win.outerWidth),
    height: Math.max(280, win.outerHeight)
  }
  try {
    localStorage.setItem(boundsKey(id), JSON.stringify(bounds))
  } catch {
    /* ignore quota errors */
  }
}

function defaultBounds(id: StationId): WindowBounds {
  const meta = stationMeta[id]
  const index = stations.indexOf(id)
  const availLeft = window.screen.availLeft || 0
  const availTop = window.screen.availTop || 0
  const availRight = availLeft + (window.screen.availWidth || 1920)
  let left = window.screenX + window.outerWidth + 12
  let top = window.screenY + 32 + index * 28
  if (left + meta.width > availRight) {
    left = Math.max(availLeft, window.screenX - meta.width - 12)
  }
  if (top < availTop) top = availTop
  return { left, top, width: meta.width, height: meta.height }
}

function copyDocumentStyles(win: Window) {
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    try {
      win.document.head.appendChild(node.cloneNode(true))
    } catch (error) {
      console.warn('[StationWindow] Failed copying stylesheet node:', error)
    }
  })
}

function hookParentClose() {
  if (parentHooked) return
  parentHooked = true
  window.addEventListener('beforeunload', () => {
    for (const id of stations) {
      const entry = windows[id]
      if (!entry || entry.win.closed) continue
      entry.closing = true
      saveBounds(id, entry.win)
      entry.win.close()
    }
  })
}

export function focusStationWindow(id: StationId) {
  const entry = windows[id]
  if (entry && !entry.win.closed) entry.win.focus()
}

export function dockStationWindow(id: StationId) {
  const entry = windows[id]
  stationWindows[id] = false
  if (!entry) return
  entry.closing = true
  saveBounds(id, entry.win)
  entry.app.unmount()
  if (!entry.win.closed) entry.win.close()
  delete windows[id]
}

export function openStationWindow(id: StationId) {
  const existing = windows[id]
  if (existing && !existing.win.closed) {
    existing.win.focus()
    stationWindows[id] = true
    return
  }

  hookParentClose()
  const bounds = readSavedBounds(id) ?? defaultBounds(id)
  const features = [
    `width=${Math.round(bounds.width)}`,
    `height=${Math.round(bounds.height)}`,
    `left=${Math.round(bounds.left)}`,
    `top=${Math.round(bounds.top)}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'resizable=yes'
  ].join(',')

  const win = window.open('about:blank', `mujs_station_${id}`, features)
  if (!win) {
    console.warn(`[StationWindow] Could not open the ${stationMeta[id].label} window.`)
    return
  }

  const { telemetry } = useSpaceStore()
  const ship = telemetry.name ? `${telemetry.name} — ` : ''
  win.document.title = `${ship}${stationMeta[id].label}`
  win.document.documentElement.classList.add('p-dark')
  copyDocumentStyles(win)
  win.document.body.style.margin = '0'
  win.document.body.style.padding = '0'
  win.document.body.style.background = '#04080e'
  win.document.body.style.height = '100vh'
  win.document.body.style.width = '100vw'
  win.document.body.style.overflow = 'hidden'

  const rootEl = win.document.createElement('div')
  rootEl.style.height = '100%'
  rootEl.style.width = '100%'
  win.document.body.appendChild(rootEl)

  const app = createApp(StationFrame, {
    station: id,
    onDock: () => dockStationWindow(id),
    onClose: () => dockStationWindow(id)
  })
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        prefix: 'p',
        darkModeSelector: '.p-dark',
        cssLayer: false
      }
    }
  })
  app.directive('tooltip', Tooltip)
  app.mount(rootEl)

  const entry: StationWindowEntry = { win, app, closing: false }
  windows[id] = entry
  stationWindows[id] = true

  win.addEventListener('beforeunload', () => {
    saveBounds(id, win)
    if (entry.closing) return
    stationWindows[id] = false
    entry.app.unmount()
    if (windows[id] === entry) delete windows[id]
  })
}

export function toggleStationWindow(id: StationId) {
  if (stationWindows[id]) dockStationWindow(id)
  else openStationWindow(id)
}
