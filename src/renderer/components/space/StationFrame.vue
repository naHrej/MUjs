<template>
  <div class="station-window">
    <header class="station-window-bar">
      <div class="station-window-title">
        <i :class="icon"></i>
        <span>{{ label }}</span>
        <span v-if="telemetry.name" class="station-window-ship">{{ telemetry.name }}</span>
      </div>
      <div class="station-window-stats">
        <span :class="['station-alert', `station-alert-${telemetry.alertStatus.toLowerCase()}`]">
          {{ telemetry.alertStatus.toUpperCase() }}
        </span>
        <span class="station-velocity">
          {{ telemetry.speed.isWarp ? `WARP ${telemetry.speed.warp.toFixed(1)}` : `${telemetry.speed.current.toFixed(1)} SU/s` }}
        </span>
      </div>
      <div class="station-window-actions">
        <button class="station-window-btn" title="Dock back into the main window" @click="emit('dock')">
          <i class="pi pi-sign-in"></i>
        </button>
        <button class="station-window-btn station-window-close" title="Close and dock back" @click="emit('close')">
          <i class="pi pi-times"></i>
        </button>
      </div>
    </header>
    <div class="station-window-body">
      <TacticalRadar v-if="station === 'radar'" />
      <HelmConsole v-else-if="station === 'helm'" />
      <WeaponsConsole v-else-if="station === 'tactical'" />
      <EngineeringConsole v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSpaceStore } from '../../stores/useSpaceStore'
import TacticalRadar from './TacticalRadar.vue'
import HelmConsole from './HelmConsole.vue'
import WeaponsConsole from './WeaponsConsole.vue'
import EngineeringConsole from './EngineeringConsole.vue'
import { stationMeta, type StationId } from './stations'

const props = defineProps<{
  station: StationId
}>()

const emit = defineEmits<{
  (e: 'dock'): void
  (e: 'close'): void
}>()

const { telemetry } = useSpaceStore()
const label = computed(() => stationMeta[props.station].label)
const icon = computed(() => stationMeta[props.station].icon)
</script>

<style scoped>
.station-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #04080e;
  color: #c9d1d9;
  font-family: 'Consolas', 'Courier New', monospace;
}

.station-window-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 4px 8px;
  background: #09101a;
  border-bottom: 1px solid #1f334d;
  flex-shrink: 0;
}

.station-window-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 0.78rem;
  font-weight: bold;
  letter-spacing: 0.4px;
  color: #58a6ff;
}

.station-window-ship {
  color: #8b949e;
  font-weight: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.station-window-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 0.68rem;
}

.station-alert {
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: bold;
  background: #162335;
  color: #79c0ff;
}

.station-alert-red {
  background: #3d1114;
  color: #f85149;
}

.station-alert-yellow {
  background: #3d2e0a;
  color: #e3b341;
}

.station-velocity {
  color: #c9d1d9;
  font-weight: bold;
}

.station-window-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.station-window-btn {
  width: auto;
  height: auto;
  margin: 0;
  background: transparent;
  border: 1px solid #1f334d;
  color: #8b949e;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
  line-height: 1;
}

.station-window-btn:hover {
  color: #3fb950;
  border-color: #238636;
}

.station-window-close:hover {
  color: #f85149;
  border-color: #da3633;
}

.station-window-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
