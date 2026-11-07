<template>
  <div class="helm-console">
    <!-- Navigation / Heading Section -->
    <div class="panel-section">
      <div class="section-title">
        <i class="pi pi-compass mr-2"></i>
        <span>FLIGHT NAVIGATION</span>
      </div>

      <div class="heading-grid">
        <div class="telemetry-box">
          <span class="box-label">CURRENT YAW</span>
          <span class="box-value">{{ telemetry.heading.yaw.toFixed(1) }}°</span>
        </div>
        <div class="telemetry-box">
          <span class="box-label">CURRENT PITCH</span>
          <span class="box-value">{{ telemetry.heading.pitch.toFixed(1) }}°</span>
        </div>
        <div class="telemetry-box">
          <span class="box-label">ORDERED YAW</span>
          <span class="box-value highlight">{{ telemetry.heading.desiredYaw.toFixed(1) }}°</span>
        </div>
        <div class="telemetry-box">
          <span class="box-label">ORDERED PITCH</span>
          <span class="box-value highlight">{{ telemetry.heading.desiredPitch.toFixed(1) }}°</span>
        </div>
      </div>

      <!-- Heading Setting Controls -->
      <div class="controls-row mt-3">
        <div class="input-group">
          <label>Set Yaw (0-359°):</label>
          <input
            type="number"
            min="0"
            max="359"
            v-model.number="targetYaw"
            class="helm-input"
          />
        </div>
        <div class="input-group">
          <label>Set Pitch (-90 to +90°):</label>
          <input
            type="number"
            min="-90"
            max="90"
            v-model.number="targetPitch"
            class="helm-input"
          />
        </div>
        <button class="helm-action-btn" @click="applyHeading">
          PLOT COURSE
        </button>
      </div>

      <!-- Quick Nudge Buttons -->
      <div class="nudge-bar mt-2">
        <button class="nudge-btn" @click="nudgeYaw(-15)">-15°</button>
        <button class="nudge-btn" @click="nudgeYaw(-5)">-5°</button>
        <button class="nudge-btn" @click="nudgeYaw(5)">+5°</button>
        <button class="nudge-btn" @click="nudgeYaw(15)">+15°</button>
        <button class="nudge-btn ml-auto" @click="invertCourse">REVERSE (180°)</button>
      </div>
    </div>

    <!-- Propulsion / Impulse Section -->
    <div class="panel-section mt-3">
      <div class="section-title">
        <i class="pi pi-forward mr-2"></i>
        <span>IMPULSE ENGINES</span>
      </div>

      <div class="throttle-display">
        <div class="speed-stat">
          <span class="stat-label">IMPULSE SPEED</span>
          <span class="stat-value">{{ telemetry.speed.current.toFixed(1) }} SU/s</span>
        </div>
        <div class="speed-stat">
          <span class="stat-label">THROTTLE</span>
          <span class="stat-value highlight">{{ currentImpulsePercent.toFixed(0) }}%</span>
        </div>
      </div>

      <div class="slider-container mt-2">
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="throttleValue"
          @change="applyThrottle"
          class="helm-slider"
        />
      </div>

      <div class="preset-buttons mt-2">
        <button class="preset-btn" @click="setThrottlePreset(0)">ALL STOP</button>
        <button class="preset-btn" @click="setThrottlePreset(25)">1/4 IMPULSE</button>
        <button class="preset-btn" @click="setThrottlePreset(50)">1/2 IMPULSE</button>
        <button class="preset-btn" @click="setThrottlePreset(100)">FULL IMPULSE</button>
      </div>
    </div>

    <!-- Warp Drive Section -->
    <div class="panel-section mt-3">
      <div class="section-title">
        <i class="pi pi-bolt mr-2"></i>
        <span>COCHRANE WARP DRIVE</span>
      </div>

      <div class="warp-status-row">
        <span class="warp-state-label">
          WARP STATUS:
          <strong :class="telemetry.speed.isWarp ? 'text-green' : 'text-gray'">
            {{ telemetry.speed.isWarp ? `ENGAGED (WARP ${telemetry.speed.warp.toFixed(2)})` : 'DISENGAGED' }}
          </strong>
        </span>
      </div>

      <div class="warp-buttons mt-2">
        <button
          v-for="factor in [1, 2, 4, 6, 8, 9, 9.9]"
          :key="factor"
          :class="['warp-btn', telemetry.speed.desiredWarp === factor ? 'warp-active' : '']"
          @click="engageWarp(factor)"
        >
          WARP {{ factor }}
        </button>
        <button class="warp-btn warp-drop" @click="dropWarp">DROP WARP</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSpaceStore } from '../../stores/useSpaceStore'

const { telemetry, setHeading, setImpulse, setWarp, fullStop } = useSpaceStore()

const targetYaw = ref(telemetry.heading.desiredYaw)
const targetPitch = ref(telemetry.heading.desiredPitch)
const throttleValue = ref(0)

const currentImpulsePercent = computed(() => {
  // Max impulse is ~7.49 SU/s
  const maxImpulseSU = 7.4948
  return Math.min(100, (telemetry.speed.current / maxImpulseSU) * 100)
})

function applyHeading() {
  setHeading(targetYaw.value, targetPitch.value)
}

function nudgeYaw(delta: number) {
  let newYaw = (telemetry.heading.desiredYaw + delta) % 360
  if (newYaw < 0) newYaw += 360
  targetYaw.value = newYaw
  setHeading(newYaw, targetPitch.value)
}

function invertCourse() {
  nudgeYaw(180)
}

function applyThrottle() {
  setImpulse(throttleValue.value / 100)
}

function setThrottlePreset(percent: number) {
  throttleValue.value = percent
  applyThrottle()
}

function engageWarp(factor: number) {
  setWarp(factor)
}

function dropWarp() {
  fullStop()
}
</script>

<style scoped>
.helm-console {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #080d14;
  color: #c9d1d9;
  font-family: 'Consolas', 'Courier New', monospace;
  padding: 10px;
  overflow-y: auto;
}

.panel-section {
  background: #0d1520;
  border: 1px solid #1f334d;
  border-radius: 6px;
  padding: 10px 12px;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: bold;
  color: #58a6ff;
  border-bottom: 1px solid #1f334d;
  padding-bottom: 6px;
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.heading-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.telemetry-box {
  background: #09101a;
  border: 1px solid #1f334d;
  border-radius: 4px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
}

.box-label {
  font-size: 0.65rem;
  color: #8b949e;
}

.box-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: #e6edf3;
}

.highlight {
  color: #388bfd;
}

.controls-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.input-group label {
  font-size: 0.7rem;
  color: #8b949e;
}

.helm-input {
  background: #161b22;
  border: 1px solid #30363d;
  color: #e6edf3;
  padding: 6px 8px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
}

.helm-action-btn {
  width: auto;
  height: auto;
  margin: 0;
  background: #1f6feb;
  border: 1px solid #388bfd;
  color: white;
  padding: 8px 14px;
  border-radius: 4px;
  font-family: inherit;
  font-weight: bold;
  line-height: 1.2;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s;
}

.helm-action-btn:hover {
  background: #388bfd;
}

.nudge-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.nudge-btn {
  width: auto;
  height: auto;
  margin: 0;
  background: #161b22;
  border: 1px solid #30363d;
  color: #79c0ff;
  padding: 6px 10px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
}

.nudge-btn:hover {
  border-color: #58a6ff;
  background: #1f2a3a;
}

.throttle-display {
  display: flex;
  justify-content: space-around;
  background: #09101a;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #1f334d;
}

.speed-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.65rem;
  color: #8b949e;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: bold;
}

.helm-slider {
  width: 100%;
  accent-color: #1f6feb;
  cursor: pointer;
}

.preset-buttons,
.warp-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-btn,
.warp-btn {
  width: auto;
  height: auto;
  margin: 0;
  background: #161b22;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 6px 10px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
  flex: 0 0 auto;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover,
.warp-btn:hover {
  background: #1f2a3a;
  border-color: #58a6ff;
  color: #58a6ff;
}

.warp-active {
  background: #1f6feb;
  border-color: #58a6ff;
  color: white;
  font-weight: bold;
}

.warp-drop {
  border-color: #f85149;
  color: #f85149;
}

.warp-drop:hover {
  background: #da3633;
  color: white;
}

.text-green {
  color: #3fb950;
}

.text-gray {
  color: #8b949e;
}
</style>
