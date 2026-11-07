<template>
  <div class="engineering-console">
    <!-- Reactor & Grid Summary -->
    <div class="panel-section">
      <div class="section-title">
        <i class="pi pi-cog mr-2"></i>
        <span>POWER GENERATION & STORAGE</span>
      </div>

      <div class="grid-stats">
        <div class="stat-card">
          <span class="card-label">TOTAL OUTPUT</span>
          <span class="card-value">{{ telemetry.power.totalProduced.toFixed(0) }} MW</span>
        </div>
        <div class="stat-card">
          <span class="card-label">TOTAL ALLOCATED</span>
          <span class="card-value">{{ totalAllocated.toFixed(0) }} MW</span>
        </div>
        <div class="stat-card">
          <span class="card-label">GRID SURPLUS</span>
          <span :class="['card-value', telemetry.power.surplus >= 0 ? 'text-green' : 'text-red']">
            {{ telemetry.power.surplus >= 0 ? '+' : '' }}{{ telemetry.power.surplus.toFixed(0) }} MW
          </span>
        </div>
        <div class="stat-card">
          <span class="card-label">BATTERY STORAGE</span>
          <span class="card-value">
            {{ telemetry.power.battery.toFixed(0) }} / {{ telemetry.power.batteryCapacity.toFixed(0) }} MW
          </span>
        </div>
      </div>

      <!-- Battery Progress Bar -->
      <div class="battery-bar-container mt-2">
        <div
          class="battery-fill"
          :style="{ width: `${batteryPercent}%` }"
        ></div>
      </div>
    </div>

    <!-- Power Channel Distribution Sliders -->
    <div class="panel-section mt-3">
      <div class="section-title flex justify-content-between align-items-center">
        <span>SUBSYSTEM POWER ALLOCATION</span>
        <button class="balance-btn" @click="handleAutoBalance">AUTO-BALANCE</button>
      </div>

      <div class="channels-list">
        <!-- Engines -->
        <div class="channel-row">
          <div class="channel-label">
            <i class="pi pi-forward mr-1"></i> ENGINES
          </div>
          <input
            type="range"
            min="0"
            :max="telemetry.power.totalProduced"
            v-model.number="allocEngines"
            @change="applyAllocation('Engines', allocEngines)"
            class="channel-slider"
          />
          <div class="channel-val">{{ allocEngines.toFixed(0) }} MW</div>
        </div>

        <!-- Shields -->
        <div class="channel-row">
          <div class="channel-label">
            <i class="pi pi-shield mr-1"></i> SHIELDS
          </div>
          <input
            type="range"
            min="0"
            :max="telemetry.power.totalProduced"
            v-model.number="allocShields"
            @change="applyAllocation('Shields', allocShields)"
            class="channel-slider"
          />
          <div class="channel-val">{{ allocShields.toFixed(0) }} MW</div>
        </div>

        <!-- Weapons -->
        <div class="channel-row">
          <div class="channel-label">
            <i class="pi pi-bolt mr-1"></i> WEAPONS
          </div>
          <input
            type="range"
            min="0"
            :max="telemetry.power.totalProduced"
            v-model.number="allocWeapons"
            @change="applyAllocation('Weapons', allocWeapons)"
            class="channel-slider"
          />
          <div class="channel-val">{{ allocWeapons.toFixed(0) }} MW</div>
        </div>

        <!-- Sensors -->
        <div class="channel-row">
          <div class="channel-label">
            <i class="pi pi-compass mr-1"></i> SENSORS
          </div>
          <input
            type="range"
            min="0"
            :max="telemetry.power.totalProduced"
            v-model.number="allocSensors"
            @change="applyAllocation('Sensors', allocSensors)"
            class="channel-slider"
          />
          <div class="channel-val">{{ allocSensors.toFixed(0) }} MW</div>
        </div>

        <!-- Life Support -->
        <div class="channel-row">
          <div class="channel-label">
            <i class="pi pi-heart mr-1"></i> LIFE SUPPORT
          </div>
          <input
            type="range"
            min="0"
            :max="telemetry.power.totalProduced"
            v-model.number="allocLifeSupport"
            @change="applyAllocation('LifeSupport', allocLifeSupport)"
            class="channel-slider"
          />
          <div class="channel-val">{{ allocLifeSupport.toFixed(0) }} MW</div>
        </div>
      </div>
    </div>

    <!-- Alert Condition -->
    <div class="panel-section mt-3">
      <div class="section-title">
        <i class="pi pi-exclamation-triangle mr-2"></i>
        <span>SHIP ALERT STATUS</span>
      </div>

      <div class="alert-buttons">
        <button
          :class="['alert-btn alert-green', telemetry.alertStatus === 'Green' ? 'active-green' : '']"
          @click="setAlertStatus('Green')"
        >
          CONDITION GREEN
        </button>
        <button
          :class="['alert-btn alert-yellow', telemetry.alertStatus === 'Yellow' ? 'active-yellow' : '']"
          @click="setAlertStatus('Yellow')"
        >
          YELLOW ALERT
        </button>
        <button
          :class="['alert-btn alert-red', telemetry.alertStatus === 'Red' ? 'active-red' : '']"
          @click="setAlertStatus('Red')"
        >
          RED ALERT
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSpaceStore } from '../../stores/useSpaceStore'

const { telemetry, allocatePower, setAlertStatus } = useSpaceStore()

const allocEngines = ref(telemetry.power.engines)
const allocShields = ref(telemetry.power.shields)
const allocWeapons = ref(telemetry.power.weapons)
const allocSensors = ref(telemetry.power.sensors)
const allocLifeSupport = ref(telemetry.power.lifeSupport)

watch(
  () => telemetry.power,
  (p) => {
    allocEngines.value = p.engines
    allocShields.value = p.shields
    allocWeapons.value = p.weapons
    allocSensors.value = p.sensors
    allocLifeSupport.value = p.lifeSupport
  },
  { deep: true }
)

const totalAllocated = computed(() => {
  return (
    allocEngines.value +
    allocShields.value +
    allocWeapons.value +
    allocSensors.value +
    allocLifeSupport.value
  )
})

const batteryPercent = computed(() => {
  if (telemetry.power.batteryCapacity <= 0) return 0
  return Math.min(100, (telemetry.power.battery / telemetry.power.batteryCapacity) * 100)
})

function applyAllocation(channel: string, amount: number) {
  allocatePower(channel, amount)
}

function handleAutoBalance() {
  const total = telemetry.power.totalProduced
  const ls = 50
  const rem = Math.max(0, total - ls)

  allocLifeSupport.value = ls
  allocEngines.value = Math.round(rem * 0.35)
  allocShields.value = Math.round(rem * 0.3)
  allocWeapons.value = Math.round(rem * 0.25)
  allocSensors.value = Math.round(rem * 0.1)

  applyAllocation('LifeSupport', allocLifeSupport.value)
  applyAllocation('Engines', allocEngines.value)
  applyAllocation('Shields', allocShields.value)
  applyAllocation('Weapons', allocWeapons.value)
  applyAllocation('Sensors', allocSensors.value)
}
</script>

<style scoped>
.engineering-console {
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

.grid-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-card {
  background: #09101a;
  border: 1px solid #1f334d;
  border-radius: 4px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
}

.card-label {
  font-size: 0.65rem;
  color: #8b949e;
}

.card-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: #e6edf3;
}

.battery-bar-container {
  height: 8px;
  background: #161b22;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #30363d;
}

.battery-fill {
  height: 100%;
  background: #238636;
  transition: width 0.3s;
}

.balance-btn {
  width: auto;
  height: auto;
  margin: 0 0 0 8px;
  background: #238636;
  border: 1px solid #2ea043;
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: bold;
  line-height: 1.2;
  letter-spacing: 0.4px;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
}

.balance-btn:hover {
  background: #2ea043;
}

.channels-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.channel-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.channel-label {
  width: 120px;
  font-size: 0.8rem;
  font-weight: bold;
  color: #8b949e;
}

.channel-slider {
  flex: 1;
  accent-color: #388bfd;
  cursor: pointer;
}

.channel-val {
  width: 75px;
  text-align: right;
  font-weight: bold;
  color: #58a6ff;
}

.alert-buttons {
  display: flex;
  gap: 8px;
}

.alert-btn {
  flex: 1;
  width: auto;
  height: auto;
  min-height: 3.4rem;
  margin: 0;
  padding: 10px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: bold;
  line-height: 1.25;
  white-space: normal;
  cursor: pointer;
  border: 1px solid #30363d;
  background: #161b22;
  transition: all 0.2s;
}

.alert-green {
  color: #3fb950;
}
.alert-yellow {
  color: #d29922;
}
.alert-red {
  color: #f85149;
}

.active-green {
  background: #238636;
  border-color: #3fb950;
  color: white;
}

.active-yellow {
  background: #9e6a03;
  border-color: #d29922;
  color: white;
}

.active-red {
  background: #da3633;
  border-color: #f85149;
  color: white;
}

.text-green {
  color: #3fb950;
}
.text-red {
  color: #f85149;
}
</style>
