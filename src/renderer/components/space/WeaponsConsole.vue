<template>
  <div class="weapons-console">
    <!-- Defensive Shield Array & Hull Integrity -->
    <div class="panel-section">
      <div class="section-title flex justify-content-between align-items-center">
        <span>DEFENSIVE SHIELDS & HULL</span>
        <button
          :class="['shield-toggle-btn', isShieldsUp ? 'btn-shields-up' : 'btn-shields-down']"
          :title="isShieldsUp ? 'Lower shields' : 'Raise shields'"
          @click="toggleShields"
        >
          {{ isShieldsUp ? 'LOWER' : 'RAISE' }}
        </button>
      </div>

      <!-- 4 Quadrant Display -->
      <div class="quadrant-display">
        <div class="quadrant fore">
          <span class="quad-name">FORE</span>
          <span class="quad-val">{{ telemetry.shields.fore.toFixed(0) }}</span>
        </div>
        <div class="quad-middle-row">
          <div class="quadrant port">
            <span class="quad-name">PORT</span>
            <span class="quad-val">{{ telemetry.shields.port.toFixed(0) }}</span>
          </div>
          <div class="ship-silhouette">
            <div class="hull-stat">
              HULL: {{ telemetry.hull.pct.toFixed(0) }}%
            </div>
            <div class="armor-stat">
              ARMOR: {{ telemetry.armor.pct.toFixed(0) }}%
            </div>
          </div>
          <div class="quadrant starboard">
            <span class="quad-name">STBD</span>
            <span class="quad-val">{{ telemetry.shields.starboard.toFixed(0) }}</span>
          </div>
        </div>
        <div class="quadrant aft">
          <span class="quad-name">AFT</span>
          <span class="quad-val">{{ telemetry.shields.aft.toFixed(0) }}</span>
        </div>
      </div>
    </div>

    <!-- Target Lock Banner -->
    <div class="panel-section mt-3">
      <div class="section-title">
        <i class="pi pi-crosshairs mr-2"></i>
        <span>TACTICAL TARGET LOCK</span>
      </div>

      <div v-if="telemetry.targetLock" class="target-locked-card">
        <div class="target-details">
          <span class="target-name font-bold">{{ lockedContactName }}</span>
          <span class="text-xs text-color-secondary">ID: {{ telemetry.targetLock.targetId }}</span>
          <span class="text-xs text-color-secondary" v-if="lockedTarget">
            Range: {{ lockedTarget.rangeSU.toFixed(1) }} SU | Bearing: {{ lockedTarget.relativeBearing.toFixed(0) }}°
          </span>
        </div>
        <button class="unlock-btn" title="Clear target lock" @click="clearLock">UNLOCK</button>
      </div>
      <div v-else class="no-target-card">
        NO TARGET LOCKED (Select contact on Radar or scan list)
      </div>
    </div>

    <!-- Offensive Weapons Section -->
    <div class="panel-section mt-3">
      <div class="section-title">
        <i class="pi pi-bolt mr-2"></i>
        <span>OFFENSIVE WEAPONS BATTERIES</span>
      </div>

      <!-- Beam Weapons -->
      <div class="weapon-group">
        <div class="group-title">BEAM EMITTERS (PHASERS / DISRUPTORS)</div>
        <div v-for="beam in telemetry.weapons.beams" :key="`beam-${beam.index}`" class="weapon-card">
          <div class="weapon-info">
            <span class="weapon-name">{{ beam.name }}</span>
            <span :class="['weapon-status', beam.ready ? 'is-ready' : 'is-not-ready']">
              {{ beamStatus(beam) }}
            </span>
          </div>
          <button
            class="fire-btn fire-beam"
            :disabled="!beam.ready || !telemetry.targetLock"
            :title="fireTitle(beam.ready, 'beam')"
            @click="handleFireBeam(beam.index)"
          >
            FIRE
          </button>
        </div>
      </div>

      <!-- Torpedo Launchers -->
      <div class="weapon-group mt-3">
        <div class="group-title">TORPEDO LAUNCHERS</div>
        <div v-for="tube in telemetry.weapons.tubes" :key="`tube-${tube.index}`" class="weapon-card">
          <div class="weapon-info">
            <span class="weapon-name">{{ tube.name }}</span>
            <span :class="['weapon-status', tube.ready ? 'is-ready' : 'is-not-ready']">
              {{ tubeStatus(tube) }}
            </span>
          </div>
          <button
            class="fire-btn fire-torpedo"
            :disabled="!tube.ready || !telemetry.targetLock"
            :title="fireTitle(tube.ready, 'torpedo')"
            @click="handleFireTorpedo(tube.index)"
          >
            FIRE
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSpaceStore, type BeamWeaponState, type TorpedoTubeState } from '../../stores/useSpaceStore'

const {
  telemetry,
  isShieldsUp,
  lockedTarget,
  toggleShields,
  clearLock,
  fireBeam,
  fireTorpedo
} = useSpaceStore()

const lockedContactName = computed(() => {
  return lockedTarget.value ? lockedTarget.value.name : telemetry.targetLock?.targetId || 'Target'
})

function beamStatus(beam: BeamWeaponState) {
  if (beam.ready) return 'READY'
  return `CHARGING ${Math.min(99, Math.floor(beam.charge))}%`
}

function tubeStatus(tube: TorpedoTubeState) {
  if (tube.ready) return 'READY'
  if (tube.timeToReady > 0) return `RELOADING ${Math.max(1, Math.ceil(tube.timeToReady))}s`
  return 'EMPTY'
}

function fireTitle(ready: boolean, kind: 'beam' | 'torpedo') {
  if (!ready) return kind === 'beam' ? 'Beam is still charging' : 'Launcher is not ready'
  if (!telemetry.targetLock) return 'No target lock'
  return 'Fire'
}

function handleFireBeam(idx: number) {
  if (!telemetry.targetLock) return
  fireBeam(idx, telemetry.targetLock.targetId)
}

function handleFireTorpedo(idx: number) {
  if (!telemetry.targetLock) return
  fireTorpedo(idx, telemetry.targetLock.targetId)
}
</script>

<style scoped>
.weapons-console {
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

.shield-toggle-btn {
  width: auto;
  height: auto;
  margin: 0 0 0 8px;
  padding: 4px 12px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: bold;
  line-height: 1.2;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
}

.btn-shields-up {
  background: #238636;
  border: 1px solid #3fb950;
  color: white;
}

.btn-shields-down {
  background: #21262d;
  border: 1px solid #f85149;
  color: #f85149;
}

.quadrant-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px;
}

.quad-middle-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  justify-content: center;
}

.quadrant {
  background: #09101a;
  border: 1px solid #1f334d;
  border-radius: 4px;
  padding: 4px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 70px;
}

.quad-name {
  font-size: 0.65rem;
  color: #8b949e;
}

.quad-val {
  font-size: 1rem;
  font-weight: bold;
  color: #388bfd;
}

.ship-silhouette {
  background: #111a27;
  border: 1px solid #1f334d;
  border-radius: 6px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hull-stat {
  font-size: 0.8rem;
  font-weight: bold;
  color: #3fb950;
}

.armor-stat {
  font-size: 0.8rem;
  font-weight: bold;
  color: #e3b341;
}

.target-locked-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1c1515;
  border: 1px solid #f85149;
  border-radius: 4px;
  padding: 8px 12px;
}

.target-details {
  display: flex;
  flex-direction: column;
}

.target-name {
  color: #f85149;
  font-size: 0.95rem;
}

.unlock-btn {
  width: auto;
  height: auto;
  margin: 0 0 0 8px;
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 4px 12px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: bold;
  line-height: 1.2;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
}

.unlock-btn:hover {
  background: #da3633;
  color: white;
}

.no-target-card {
  background: #09101a;
  border: 1px dashed #30363d;
  border-radius: 4px;
  padding: 10px;
  text-align: center;
  color: #484f58;
  font-size: 0.8rem;
}

.weapon-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-title {
  font-size: 0.7rem;
  color: #8b949e;
  margin-bottom: 4px;
}

.weapon-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #09101a;
  border: 1px solid #1f334d;
  border-radius: 4px;
  padding: 8px 12px;
}

.weapon-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.weapon-name {
  font-size: 0.85rem;
  font-weight: bold;
  color: #e6edf3;
}

.weapon-status {
  font-size: 0.7rem;
  font-weight: bold;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

.weapon-status.is-ready {
  color: #3fb950;
}

.weapon-status.is-not-ready {
  color: #e3b341;
}

.fire-btn {
  width: auto;
  height: auto;
  min-width: 4.5rem;
  margin: 0 0 0 8px;
  padding: 6px 14px;
  border-radius: 4px;
  font-family: inherit;
  font-weight: bold;
  font-size: 0.8rem;
  line-height: 1.2;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s;
}

.fire-beam {
  background: #da3633;
  border: 1px solid #f85149;
  color: white;
}

.fire-beam:hover:not(:disabled) {
  background: #f85149;
}

.fire-torpedo {
  background: #bd5611;
  border: 1px solid #d29922;
  color: white;
}

.fire-torpedo:hover:not(:disabled) {
  background: #d29922;
}

.fire-beam:disabled {
  background: #3d1c1c;
  border-color: #6e2c2c;
  color: #e7b3b3;
  cursor: not-allowed;
}

.fire-torpedo:disabled {
  background: #3d2914;
  border-color: #6e4b22;
  color: #efd0b0;
  cursor: not-allowed;
}
</style>
