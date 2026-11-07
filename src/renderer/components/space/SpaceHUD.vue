<template>
  <div class="space-hud-container">
    <!-- Dedicated Fixed-Height Top Notification & Status Strip (Zero Layout Shift) -->
    <div class="hud-top-status-strip">
      <div
        v-if="latestAlert"
        :class="['log-item', 'strip-log-item', `log-${latestAlert.station}`]"
      >
        <div class="log-time">{{ formatTime(latestAlert.timestamp) }}</div>
        <div class="log-badge">{{ latestAlert.station.toUpperCase() }}</div>
        <div class="log-message">{{ cleanMessage(latestAlert.message) }}</div>
      </div>
      <button
        v-if="latestAlert"
        class="strip-dismiss-btn"
        @click="dismissLatestAlert"
        title="Dismiss Alert"
      >
        <i class="pi pi-times"></i>
      </button>
      <div v-else class="strip-idle-content">
        <i class="pi pi-circle-fill idle-dot"></i>
        <span class="idle-text">SUBSPACE MONITOR ACTIVE • BRIDGE STATIONS ONLINE</span>
      </div>
    </div>

    <!-- Master Vessel Banner -->
    <div class="vessel-banner">
      <div class="vessel-identity">
        <span class="vessel-name font-bold">{{ telemetry.name }}</span>
        <span class="vessel-class text-xs text-color-secondary">{{ telemetry.className }} Class</span>
      </div>

      <div class="vessel-stats">
        <!-- Alert Badge -->
        <div :class="['alert-badge', `badge-${telemetry.alertStatus.toLowerCase()}`]">
          {{ telemetry.alertStatus.toUpperCase() }}
        </div>

        <div class="stat-pill">
          <span class="stat-tag">HULL</span>
          <span class="stat-metric">{{ telemetry.hull.pct.toFixed(0) }}%</span>
        </div>

        <div class="stat-pill">
          <span class="stat-tag">SHIELDS</span>
          <span :class="['stat-metric', telemetry.shields.isRaised ? 'text-green' : 'text-red']">
            {{ telemetry.shields.isRaised ? `${telemetry.shields.overallPct.toFixed(0)}%` : 'DOWN' }}
          </span>
        </div>

        <div class="stat-pill">
          <span class="stat-tag">VELOCITY</span>
          <span class="stat-metric">
            {{ telemetry.speed.isWarp ? `WARP ${telemetry.speed.warp.toFixed(1)}` : `${telemetry.speed.current.toFixed(1)} SU/s` }}
          </span>
        </div>
      </div>

      <div class="vessel-actions">
        <!-- Popout / Dock Button -->
        <button
          v-if="isPopout"
          class="action-icon-btn dock-btn"
          @click="emit('dock')"
          title="Dock Back to Main Client Window"
        >
          <i class="pi pi-sign-in"></i>
        </button>
        <button
          v-else
          class="action-icon-btn popout-btn"
          @click="emit('popout')"
          title="Pop Out into Separate Window"
        >
          <i class="pi pi-external-link"></i>
        </button>

        <button
          class="alert-log-toggle-btn"
          :class="{ 'has-alerts': recentAlerts.length > 0 }"
          @click="showAlertLog = !showAlertLog"
          :title="`Crew Action Alerts (${recentAlerts.length} events)`"
        >
          <i class="pi pi-bell"></i>
          <span v-if="recentAlerts.length" class="alert-count-pill">{{ recentAlerts.length }}</span>
        </button>

        <button
          class="close-hud-btn"
          @click="emit('close')"
          :title="isPopout ? 'Close Window' : 'Close Space HUD'"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>
    </div>

    <!-- Action Alerts Log Drawer / Overlay -->
    <div v-if="showAlertLog" class="alert-history-drawer">
      <div class="drawer-header">
        <div class="drawer-title">
          <i class="pi pi-history mr-2"></i>
          <span>CREW ACTION LOG ({{ recentAlerts.length }})</span>
        </div>
        <div class="drawer-actions">
          <button class="drawer-clear-btn" @click="clearAlerts" title="Clear History">
            <i class="pi pi-trash mr-1"></i> CLEAR
          </button>
          <button class="drawer-close-btn" @click="showAlertLog = false" title="Close Log">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </div>
      <div class="drawer-list">
        <div v-if="recentAlerts.length === 0" class="drawer-empty">
          No bridge actions logged during this session.
        </div>
        <div
          v-for="item in recentAlerts"
          :key="item.id"
          :class="['log-item', `log-${item.station}`]"
        >
          <div class="log-time">{{ formatTime(item.timestamp) }}</div>
          <div class="log-badge">{{ item.station.toUpperCase() }}</div>
          <div class="log-message">{{ cleanMessage(item.message) }}</div>
        </div>
      </div>
    </div>

    <!-- Station Navigation Tabs -->
    <div class="station-tab-bar">
      <div
        v-for="station in dockedStations"
        :key="station"
        :class="['tab-group', activeStation === station ? 'tab-active' : '']"
      >
        <button class="tab-btn" @click="activeStation = station">
          <i :class="[stationMeta[station].icon, 'mr-1']"></i> {{ stationMeta[station].label }}
        </button>
        <button
          class="tab-undock"
          :title="`Undock ${stationMeta[station].label} into its own window`"
          @click="toggleStationWindow(station)"
        >
          <i class="pi pi-external-link"></i>
        </button>
      </div>
      <div v-if="poppedStations.length" class="tab-popped-tray">
        <div v-for="station in poppedStations" :key="station" class="tab-popped">
          <button
            class="tab-popped-btn"
            :title="`Focus ${stationMeta[station].label}`"
            @click="focusStationWindow(station)"
          >
            <i :class="stationMeta[station].icon"></i>
          </button>
          <button
            class="tab-popped-btn"
            :title="`Dock ${stationMeta[station].label}`"
            @click="dockStationWindow(station)"
          >
            <i class="pi pi-sign-in"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Active Station Console Content -->
    <div class="station-content">
      <TacticalRadar v-if="activeStation === 'radar' && !stationWindows.radar" />
      <HelmConsole v-else-if="activeStation === 'helm' && !stationWindows.helm" />
      <WeaponsConsole v-else-if="activeStation === 'tactical' && !stationWindows.tactical" />
      <EngineeringConsole v-else-if="activeStation === 'engineering' && !stationWindows.engineering" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSpaceStore } from '../../stores/useSpaceStore'
import TacticalRadar from './TacticalRadar.vue'
import HelmConsole from './HelmConsole.vue'
import WeaponsConsole from './WeaponsConsole.vue'
import EngineeringConsole from './EngineeringConsole.vue'
import { stationMeta, stations } from './stations'
import {
  dockStationWindow,
  focusStationWindow,
  stationWindows,
  toggleStationWindow
} from '../../composables/useStationWindows'

const props = withDefaults(
  defineProps<{
    isPopout?: boolean
  }>(),
  {
    isPopout: false
  }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'popout'): void
  (e: 'dock'): void
}>()

const showAlertLog = ref(false)

const {
  telemetry,
  activeStation,
  recentAlerts,
  latestAlert,
  dismissLatestAlert,
  clearAlerts
} = useSpaceStore()

const dockedStations = computed(() => stations.filter((station) => !stationWindows[station]))
const poppedStations = computed(() => stations.filter((station) => stationWindows[station]))

watch(
  () => stations.map((station) => stationWindows[station]),
  (flags, previous) => {
    const docked = stations.filter((station) => !stationWindows[station])
    if (previous) {
      const returned = stations.find((station, index) => previous[index] && !flags[index])
      if (returned && docked.includes(returned)) {
        activeStation.value = returned
        return
      }
    }
    if (stationWindows[activeStation.value] && docked.length) {
      activeStation.value = docked[0]
    }
  }
)

function cleanMessage(msg: string) {
  if (!msg) return ''
  // Strip any leading bracketed prefixes like [SECURITY], [Helm], etc. repeatedly
  return msg.replace(/^(\[[a-zA-Z0-9_\s-]+\]\s*)+/, '')
}

function formatTime(timestamp: number) {
  const d = new Date(timestamp)
  return d.toTimeString().split(' ')[0]
}
</script>

<style scoped>
.space-hud-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #04080e;
  border-left: 2px solid #1f334d;
  font-family: 'Consolas', 'Courier New', monospace;
  overflow: hidden;
  user-select: none;
}

.hud-top-status-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 1.6rem;
  padding: 2px 8px;
  background: #09101a;
  border-bottom: 1px solid #1f334d;
}

.strip-log-item {
  flex: 1;
  min-width: 0;
  background: transparent;
  padding: 0;
}

.strip-dismiss-btn {
  width: auto;
  height: auto;
  margin: 0;
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 0 2px;
  font-size: 0.75rem;
  line-height: 1;
}

.strip-dismiss-btn:hover {
  color: #f85149;
}

.strip-idle-content {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 0.7rem;
  color: #8b949e;
}

.idle-dot {
  font-size: 0.45rem;
  color: #3fb950;
  flex-shrink: 0;
}

.idle-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vessel-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #09101a;
  border-bottom: 1px solid #1f334d;
}

.vessel-identity {
  display: flex;
  flex-direction: column;
}

.vessel-name {
  color: #58a6ff;
  font-size: 1rem;
  letter-spacing: 1px;
}

.vessel-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-badge {
  font-size: 0.65rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge-green {
  background: #194d24;
  color: #3fb950;
  border: 1px solid #238636;
}

.badge-yellow {
  background: #4d3800;
  color: #e3b341;
  border: 1px solid #9e6a03;
}

.badge-red {
  background: #4d1010;
  color: #f85149;
  border: 1px solid #da3633;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #0d1520;
  border: 1px solid #1f334d;
  border-radius: 4px;
  padding: 2px 6px;
}

.stat-tag {
  font-size: 0.55rem;
  color: #8b949e;
}

.stat-metric {
  font-size: 0.75rem;
  font-weight: bold;
  color: #c9d1d9;
}

.vessel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-icon-btn {
  background: transparent;
  border: 1px solid #1f334d;
  color: #8b949e;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.action-icon-btn:hover {
  color: #58a6ff;
  border-color: #58a6ff;
}

.dock-btn:hover {
  color: #3fb950;
  border-color: #238636;
}

.popout-btn:hover {
  color: #58a6ff;
  border-color: #1f6feb;
}

.alert-log-toggle-btn {
  position: relative;
  background: transparent;
  border: 1px solid #1f334d;
  color: #8b949e;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.alert-log-toggle-btn:hover,
.alert-log-toggle-btn.has-alerts {
  color: #e3b341;
  border-color: #9e6a03;
}

.alert-count-pill {
  position: absolute;
  top: -4px;
  right: -5px;
  background: #da3633;
  color: white;
  font-size: 0.55rem;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 8px;
  line-height: 1;
}

.close-hud-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px;
  font-size: 0.9rem;
}

.close-hud-btn:hover {
  color: #f85149;
}

/* Dedicated Fixed-Height Top Notification & Status Strip (Zero Layout Shift) */
.hud-top-status-strip {
  display: flex;
  align-items: center;
  height: 30px;
  min-height: 30px;
  max-height: 30px;
  padding: 0 12px;
  font-size: 0.72rem;
  background: #060b13;
  border-bottom: 1px solid #162438;
  box-sizing: border-box;
  overflow: hidden;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.hud-top-status-strip.has-alert {
  background: #0d1a29;
  border-bottom: 2px solid #58a6ff;
}

.strip-alert-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  animation: strip-fade 0.2s ease-out;
}

@keyframes strip-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.strip-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strip-icon {
  font-size: 0.82rem;
}

.strip-badge {
  font-weight: bold;
  font-size: 0.65rem;
  padding: 1px 5px;
  border-radius: 3px;
  background: #162a45;
  color: #79c0ff;
  border: 1px solid #1f4270;
  letter-spacing: 0.5px;
}

.strip-msg {
  color: #f0f6fc;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strip-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 8px;
}

.strip-time {
  font-size: 0.65rem;
  color: #8b949e;
}

.strip-dismiss-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
}

.strip-dismiss-btn:hover {
  color: #f85149;
}

.strip-idle-content {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  color: #484f58;
  font-size: 0.65rem;
  letter-spacing: 1px;
}

.idle-dot {
  font-size: 0.45rem;
  color: #238636;
  animation: idle-pulse 2.5s infinite;
}

@keyframes idle-pulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

.idle-text {
  color: #556273;
}

/* Station Color Schemes for Top Strip */
.alert-station-helm {
  border-bottom-color: #58a6ff !important;
  background: #091b2e !important;
}
.alert-station-helm .strip-icon {
  color: #58a6ff;
}
.alert-station-helm .strip-badge {
  background: #162a45;
  color: #79c0ff;
  border-color: #1f4270;
}

.alert-station-tactical {
  border-bottom-color: #f85149 !important;
  background: #250e12 !important;
}
.alert-station-tactical .strip-icon {
  color: #f85149;
}
.alert-station-tactical .strip-badge {
  background: #45161c;
  color: #ff7b72;
  border-color: #7d242c;
}

.alert-station-engineering {
  border-bottom-color: #d29922 !important;
  background: #231d0a !important;
}
.alert-station-engineering .strip-icon {
  color: #d29922;
}
.alert-station-engineering .strip-badge {
  background: #3d300e;
  color: #e3b341;
  border-color: #775c17;
}

.alert-station-security,
.alert-station-alert {
  border-bottom-color: #ff3333 !important;
  background: #330b0b !important;
}
.alert-station-security .strip-icon,
.alert-station-alert .strip-icon {
  color: #ff5555;
}
.alert-station-security .strip-badge,
.alert-station-alert .strip-badge {
  background: #551313;
  color: #ffa198;
  border-color: #8e2323;
}

.alert-station-bridge {
  border-bottom-color: #bc8cff !important;
  background: #1d132b !important;
}
.alert-station-bridge .strip-icon {
  color: #bc8cff;
}
.alert-station-bridge .strip-badge {
  background: #351e54;
  color: #d2a8ff;
  border-color: #633b9c;
}

/* Alert History Drawer / Overlay */
.alert-history-drawer {
  background: #060b12;
  border-bottom: 2px solid #1f334d;
  max-height: 180px;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #0d1520;
  border-bottom: 1px solid #1f334d;
  font-size: 0.75rem;
  color: #79c0ff;
  font-weight: bold;
}

.drawer-actions {
  display: flex;
  gap: 8px;
}

.drawer-clear-btn {
  background: transparent;
  border: 1px solid #30363d;
  color: #8b949e;
  padding: 1px 6px;
  font-size: 0.65rem;
  border-radius: 3px;
  cursor: pointer;
}

.drawer-clear-btn:hover {
  color: #f85149;
  border-color: #f85149;
}

.drawer-close-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
}

.drawer-close-btn:hover {
  color: #f0f6fc;
}

.drawer-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drawer-empty {
  font-size: 0.7rem;
  color: #484f58;
  text-align: center;
  padding: 10px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
  padding: 2px 4px;
  border-radius: 2px;
  background: #09101a;
}

.log-time {
  color: #8b949e;
  font-size: 0.65rem;
  flex-shrink: 0;
}

.log-badge {
  font-size: 0.55rem;
  font-weight: bold;
  padding: 1px 4px;
  border-radius: 2px;
  background: #162335;
  color: #79c0ff;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  min-width: 0;
  color: #c9d1d9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.station-tab-bar {
  display: flex;
  background: #09101a;
  border-bottom: 1px solid #1f334d;
  gap: 2px;
  padding: 0 4px;
}

.tab-group {
  flex: 1;
  display: flex;
  align-items: stretch;
  min-width: 0;
  background: #0d1520;
  border: 1px solid transparent;
  border-bottom: none;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.tab-btn {
  flex: 1;
  width: auto;
  height: auto;
  margin: 0;
  min-width: 0;
  background: transparent;
  border: none;
  color: #8b949e;
  padding: 6px 4px;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #c9d1d9;
}

.tab-undock {
  width: auto;
  height: auto;
  margin: 0;
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: #6e7681;
  cursor: pointer;
  padding: 0 6px;
  font-size: 0.72rem;
}

.tab-undock:hover {
  color: #3fb950;
}

.tab-popped-tray {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 2px 4px 8px;
}

.tab-popped {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid #1f334d;
  border-radius: 4px;
  background: #0d1520;
}

.tab-popped-btn {
  width: auto;
  height: auto;
  margin: 0;
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  padding: 4px 6px;
  font-size: 0.75rem;
}

.tab-popped-btn:hover {
  color: #58a6ff;
}

.tab-active {
  background: #080d14;
  border-color: #1f334d;
  border-top: 2px solid #58a6ff;
}

.tab-active .tab-btn {
  color: #58a6ff;
}

.station-content {
  flex: 1;
  overflow: hidden;
}

.text-green {
  color: #3fb950;
}

.text-red {
  color: #f85149;
}
</style>
