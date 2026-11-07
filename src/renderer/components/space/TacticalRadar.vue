<template>
  <div class="tactical-radar-container">
    <div class="radar-header">
      <div class="radar-title">
        <i class="pi pi-compass mr-2"></i>
        <span>TACTICAL SENSORS</span>
      </div>
      <div class="radar-controls">
        <button
          class="mode-toggle-btn"
          @click="toggleRadarMode"
          :title="`Current Mode: ${radarMode === 'head-up' ? 'Heading-Up (Ship Fore is Up)' : 'North-Up (Sector 000° is Up)'}`"
        >
          {{ radarMode === 'head-up' ? 'HEAD-UP' : 'NORTH-UP' }}
        </button>
        <span class="range-label">Range: {{ maxRangeSU }} SU</span>
        <button class="zoom-btn" @click="zoomIn" title="Zoom In"><i class="pi pi-plus"></i></button>
        <button class="zoom-btn" @click="zoomOut" title="Zoom Out"><i class="pi pi-minus"></i></button>
      </div>
    </div>

    <!-- Active Heading & Mode Banner -->
    <div class="radar-subbanner">
      <span>HEADING: <strong class="text-blue">{{ telemetry.heading.yaw.toFixed(1) }}°</strong> mark {{ telemetry.heading.pitch.toFixed(1) }}°</span>
      <span>MODE: <strong class="text-blue">{{ radarMode === 'head-up' ? 'RELATIVE (SHIP-CENTRIC)' : 'SECTOR (TRUE NORTH)' }}</strong></span>
    </div>

    <div class="radar-stage">
    <div class="radar-display">
      <svg
        ref="svgRef"
        viewBox="-160 -160 320 320"
        class="radar-svg"
      >
        <!-- Background grid & rings -->
        <circle cx="0" cy="0" r="140" class="radar-ring outer-ring" />
        <circle cx="0" cy="0" r="105" class="radar-ring" />
        <circle cx="0" cy="0" r="70" class="radar-ring" />
        <circle cx="0" cy="0" r="35" class="radar-ring" />

        <!-- Crosshairs -->
        <line x1="-140" y1="0" x2="140" y2="0" class="radar-axis" />
        <line x1="0" y1="-140" x2="0" y2="140" class="radar-axis" />

        <!-- Bezel Cardinal Labels -->
        <template v-if="radarMode === 'head-up'">
          <!-- In Head-Up mode: Top is Fore, Right is Starboard, Bottom is Aft, Left is Port -->
          <text x="0" y="-145" class="cardinal-text" text-anchor="middle">FORE (000°)</text>
          <text x="150" y="4" class="cardinal-text" text-anchor="start">STBD (090°)</text>
          <text x="0" y="155" class="cardinal-text" text-anchor="middle">AFT (180°)</text>
          <text x="-150" y="4" class="cardinal-text" text-anchor="end">PORT (270°)</text>
        </template>
        <template v-else>
          <!-- In North-Up mode: Top is Sector North (000°), East is 090°, etc. -->
          <text x="0" y="-145" class="cardinal-text" text-anchor="middle">000° (N)</text>
          <text x="150" y="4" class="cardinal-text" text-anchor="start">090° (E)</text>
          <text x="0" y="155" class="cardinal-text" text-anchor="middle">180° (S)</text>
          <text x="-150" y="4" class="cardinal-text" text-anchor="end">270° (W)</text>
        </template>

        <!-- Range ring markers -->
        <text x="4" y="-37" class="range-text">{{ (maxRangeSU * 0.25).toFixed(0) }}</text>
        <text x="4" y="-72" class="range-text">{{ (maxRangeSU * 0.5).toFixed(0) }}</text>
        <text x="4" y="-107" class="range-text">{{ (maxRangeSU * 0.75).toFixed(0) }}</text>
        <text x="4" y="-142" class="range-text">{{ maxRangeSU }}</text>

        <!-- Desired Turn Indicator (shows where ordered heading is if turning in Head-Up mode) -->
        <g
          v-if="radarMode === 'head-up' && Math.abs(telemetry.heading.desiredYaw - telemetry.heading.yaw) > 1"
          :transform="`rotate(${desiredHeadingOffset})`"
        >
          <line x1="0" y1="0" x2="0" y2="-38" class="desired-heading-vector" stroke-dasharray="3 3" />
          <polygon points="0,-42 -4,-34 4,-34" class="desired-heading-arrow" />
        </g>

        <!-- Ownship hull points fore, with the heading vector leaving the bow -->
        <g :transform="`rotate(${ownshipScreenRotation})`">
          <polygon points="0,-9 -3.6,6 3.6,6" class="ownship-center" />
          <line x1="0" y1="-9" x2="0" y2="-45" class="heading-vector" />
          <polygon points="0,-48 -5,-38 5,-38" class="heading-arrow" />
        </g>
        <circle
          cx="0"
          cy="0"
          r="12"
          :class="['shield-bubble', isShieldsUp ? 'shields-up' : 'shields-down']"
        />

        <!-- Sensor Contacts -->
        <g
          v-for="c in projectedContacts"
          :key="c.entityId || (c as any).EntityId"
          class="radar-contact"
          @click="inspectContact(c.entityId || (c as any).EntityId)"
        >
          <polygon
            v-if="c.isShip"
            points="0,-8 -3.2,5 3.2,5"
            :transform="`translate(${c.x}, ${c.y}) rotate(${c.screenRotation}) scale(${c.isLocked ? 1.2 : 1})`"
            :class="['contact-dot', 'ship-glyph', c.typeClass, c.isLocked ? 'contact-locked' : '', c.isInspected ? 'contact-inspected' : '']"
          />
          <circle
            v-else
            :cx="c.x"
            :cy="c.y"
            :r="c.isLocked ? 6 : 4"
            :class="['contact-dot', c.typeClass, c.isLocked ? 'contact-locked' : '', c.isInspected ? 'contact-inspected' : '']"
          />

          <!-- Target Lock Reticle -->
          <g v-if="c.isLocked" :transform="`translate(${c.x}, ${c.y})`" class="lock-reticle">
            <path d="M -10 -5 L -10 -10 L -5 -10" class="lock-bracket" />
            <path d="M 10 -5 L 10 -10 L 5 -10" class="lock-bracket" />
            <path d="M -10 5 L -10 10 L -5 10" class="lock-bracket" />
            <path d="M 10 5 L 10 10 L 5 10" class="lock-bracket" />
          </g>

          <!-- Label -->
          <text
            :x="c.x + 8"
            :y="c.y + 4"
            class="contact-label"
          >
            {{ c.name }} ({{ (c.rangeSU ?? 0).toFixed(1) }})
          </text>
        </g>
      </svg>
    </div>

    <aside v-if="inspectedContact" class="sensor-report">
      <div class="report-title">SENSOR REPORT</div>
      <div class="report-name">{{ inspectedContact.name }}</div>
      <dl class="report-fields">
        <div class="report-row">
          <dt>ID</dt>
          <dd>{{ inspectedContact.entityId }}</dd>
        </div>
        <div class="report-row">
          <dt>TYPE</dt>
          <dd>{{ inspectedContact.type }}</dd>
        </div>
        <div class="report-row">
          <dt>SYSTEM</dt>
          <dd>{{ telemetry.position.system || 'Unknown' }}</dd>
        </div>
        <div class="report-row">
          <dt>RANGE</dt>
          <dd>{{ inspectedContact.rangeSU.toFixed(1) }} SU</dd>
        </div>
        <div class="report-row">
          <dt>BEARING</dt>
          <dd>
            <span title="Relative Bearing">{{ formatPair(inspectedContact.relativeBearing, relativeElevation(inspectedContact)) }}</span><span title="True Bearing"> ({{ formatPair(inspectedContact.bearingYaw, inspectedContact.bearingPitch) }})</span>
          </dd>
        </div>
        <div class="report-row">
          <dt>HEADING</dt>
          <dd v-if="inspectedHeading">
            <span title="Relative Heading">{{ formatPair(inspectedHeading.relative.azimuth, inspectedHeading.relative.elevation) }}</span><span title="True Heading"> ({{ formatPair(inspectedHeading.true.azimuth, inspectedHeading.true.elevation) }})</span>
          </dd>
          <dd v-else>{{ isShipContact(inspectedContact) ? 'UNKNOWN' : 'N/A' }}</dd>
        </div>
        <div class="report-row">
          <dt>VELOCITY</dt>
          <dd>{{ inspectedContact.velocitySU.toFixed(1) }} SU/s</dd>
        </div>
        <div class="report-row">
          <dt>SHIELDS</dt>
          <dd class="shield-readout">
            <span
              v-for="face in shieldFaces(inspectedContact)"
              :key="face.letter"
              class="shield-face"
              :style="{ color: face.color }"
              :title="face.title"
            >{{ face.glyph }}</span>
          </dd>
        </div>
        <div class="report-row">
          <dt>CLOAK</dt>
          <dd :class="inspectedContact.cloaked ? 'report-warn' : ''">
            {{ inspectedContact.cloaked ? 'CLOAKED' : 'CLEAR' }}
          </dd>
        </div>
        <div class="report-row">
          <dt>POSITION</dt>
          <dd>
            {{ formatCoord(inspectedContact.position?.x) }},
            {{ formatCoord(inspectedContact.position?.y) }},
            {{ formatCoord(inspectedContact.position?.z) }}
          </dd>
        </div>
        <div class="report-row">
          <dt>LOCK</dt>
          <dd :class="isContactLocked(inspectedContact.entityId) ? 'report-down' : ''">
            {{ isContactLocked(inspectedContact.entityId) ? 'WEAPONS LOCK' : 'NONE' }}
          </dd>
        </div>
      </dl>
    </aside>
    </div>

    <!-- Contact Quick Roster -->
    <div class="contacts-list">
      <div class="contacts-header">
        <span>CONTACTS ({{ telemetry.contacts.length }})</span>
        <span class="text-xs text-color-secondary">Click row for sensor report</span>
      </div>
      <div v-if="telemetry.contacts.length === 0" class="no-contacts">
        No contacts in sensor range.
      </div>
      <div
        v-for="c in telemetry.contacts"
        :key="c.entityId || (c as any).EntityId"
        :class="[
          'contact-row',
          inspectedId === (c.entityId || (c as any).EntityId) ? 'inspected-row' : '',
          telemetry.targetLock?.targetId === (c.entityId || (c as any).EntityId) ? 'locked-row' : ''
        ]"
        @click="inspectContact(c.entityId || (c as any).EntityId)"
      >
        <div class="contact-info">
          <span class="contact-name font-semibold">{{ c.name || (c as any).Name }}</span>
          <span class="contact-meta text-xs">
            Type: {{ c.type || (c as any).Type }} | Range: {{ (c.rangeSU ?? (c as any).RangeSU ?? 0).toFixed(1) }} SU
            | Bearing: <span title="Relative Bearing">{{ formatPair(c.relativeBearing ?? (c as any).RelativeBearing ?? 0, relativeElevation(c)) }}</span>
            | Heading: <span :title="contactHeading(c) ? 'Relative Heading' : undefined">{{ relativeHeadingText(c) }}</span>
          </span>
        </div>
        <div class="contact-action" @click.stop>
          <button
            v-if="berthAction(c) === 'launch'"
            class="cmd-btn"
            title="Leave the surface"
            @click="departBerth()"
          >
            LAUNCH
          </button>
          <button
            v-else-if="berthAction(c) === 'undock'"
            class="cmd-btn"
            title="Leave the dock"
            @click="departBerth()"
          >
            UNDOCK
          </button>
          <button
            v-else-if="canApproach(c) === 'land'"
            class="cmd-btn"
            title="Land on the surface"
            @click="landOn(c.entityId)"
          >
            LAND
          </button>
          <button
            v-else-if="canApproach(c) === 'dock'"
            class="cmd-btn"
            title="Dock with the station"
            @click="dockWith(c.entityId)"
          >
            DOCK
          </button>
          <button
            v-if="isStationaryContact(c) && !isNavActive(c, 'intercept')"
            :class="['cmd-btn', 'nav-btn', isNavActive(c, 'approach') ? 'nav-active' : '']"
            :title="isNavActive(c, 'approach') ? 'Cancel course' : 'Face the target, approach, and stop alongside it'"
            @click="setCourse(c)"
          >
            SET COURSE
          </button>
          <button
            v-else
            :class="['cmd-btn', 'nav-btn', isNavActive(c, 'intercept') ? 'nav-active' : '']"
            :disabled="!isNavActive(c, 'intercept') && !interceptPlan(c).course"
            :title="isNavActive(c, 'intercept') ? 'Cancel intercept' : interceptPlan(c).title"
            @click="plotIntercept(c)"
          >
            INTERCEPT
          </button>
          <button
            :class="['lock-btn', isContactLocked(c.entityId) ? 'locked-active' : '']"
            @click="toggleLock(c.entityId)"
          >
            {{ isContactLocked(c.entityId) ? 'UNLOCK' : 'LOCK' }}
          </button>
          <button
            class="cmd-btn cmd-fire"
            :disabled="!canFireAt(c)"
            :title="fireTitle(c)"
            @click="fireAt(c)"
          >
            FIRE
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSpaceStore, type SensorContact, type ShieldFaceState } from '../../stores/useSpaceStore'
import { solveIntercept, warpToVelocitySU, type InterceptCourse } from './interceptCourse'

const {
  telemetry,
  berthed,
  isShieldsUp,
  lockTarget,
  clearLock,
  setHeading,
  navOrder,
  beginApproach,
  beginIntercept,
  dockWith,
  landOn,
  departBerth,
  fireBeam,
  fireTorpedo
} = useSpaceStore()

const clickPing = ref<{ x: number; y: number; key: number } | null>(null)
let pingTimer: any = null

const maxRangeSU = ref(50)
const ranges = [10, 25, 50, 100, 250, 500]
const radarMode = ref<'head-up' | 'north-up'>('head-up')
const inspectedId = ref<string | null>(null)

function handleRadarContextMenu(event: MouseEvent) {
  event.preventDefault()
  if (!svgRef.value) return

  const rect = svgRef.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const clientX = event.clientX - rect.left
  const clientY = event.clientY - rect.top
  const svgX = (clientX / rect.width) * 320 - 160
  const svgY = (clientY / rect.height) * 320 - 160

  let clickAngle = (Math.atan2(svgX, -svgY) * 180) / Math.PI
  if (clickAngle < 0) clickAngle += 360

  let targetYaw: number
  if (radarMode.value === 'head-up') {
    targetYaw = (telemetry.heading.yaw + clickAngle) % 360
  } else {
    targetYaw = clickAngle % 360
  }

  targetYaw = Math.round(targetYaw * 10) / 10

  clickPing.value = { x: svgX, y: svgY, key: Date.now() }
  if (pingTimer) clearTimeout(pingTimer)
  pingTimer = setTimeout(() => {
    clickPing.value = null
  }, 1000)

  setHeading(targetYaw, telemetry.heading.desiredPitch || 0)
}

function toggleRadarMode() {
  radarMode.value = radarMode.value === 'head-up' ? 'north-up' : 'head-up'
}

function zoomIn() {
  const idx = ranges.indexOf(maxRangeSU.value)
  if (idx > 0) maxRangeSU.value = ranges[idx - 1]
}

function zoomOut() {
  const idx = ranges.indexOf(maxRangeSU.value)
  if (idx < ranges.length - 1) maxRangeSU.value = ranges[idx + 1]
}

// Difference between desired yaw and current yaw (for turn indicator)
const desiredHeadingOffset = computed(() => {
  let diff = (telemetry.heading.desiredYaw - telemetry.heading.yaw) % 360
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff
})

const ownshipScreenRotation = computed(() => (radarMode.value === 'head-up' ? 0 : telemetry.heading.yaw))

interface ContactCourse {
  yaw: number
  pitch: number | null
}

const shipCourse = ref<Record<string, ContactCourse>>({})
const courseAnchor = new Map<string, { x: number; y: number; z: number }>()

function wrapYaw(yaw: number) {
  return ((yaw % 360) + 360) % 360
}

function attitudeFromDelta(dx: number, dy: number, dz: number): ContactCourse {
  const horizontal = Math.hypot(dx, dy)
  const yaw = horizontal > 0.02 ? wrapYaw((Math.atan2(dy, dx) * 180) / Math.PI) : 0
  const pitch = (Math.atan2(dz, Math.max(horizontal, 1e-6)) * 180) / Math.PI
  return { yaw, pitch }
}

function observeShipCourses() {
  const next: Record<string, ContactCourse> = { ...shipCourse.value }
  const seen = new Set<string>()

  for (const contact of telemetry.contacts) {
    const id = contact.entityId
    if (!id) continue
    seen.add(id)

    if (contact.headingYaw != null && Number.isFinite(contact.headingYaw)) {
      next[id] = { yaw: wrapYaw(contact.headingYaw), pitch: contact.headingPitch }
    } else if (contact.velocity && Math.hypot(contact.velocity.x, contact.velocity.y, contact.velocity.z) > 0.05) {
      next[id] = attitudeFromDelta(contact.velocity.x, contact.velocity.y, contact.velocity.z)
    } else if (contact.position) {
      const anchor = courseAnchor.get(id)
      if (!anchor) {
        courseAnchor.set(id, { ...contact.position })
      } else {
        const dx = contact.position.x - anchor.x
        const dy = contact.position.y - anchor.y
        const dz = contact.position.z - anchor.z
        if (Math.hypot(dx, dy, dz) >= 0.05) {
          const tracked = attitudeFromDelta(dx, dy, dz)
          if (Math.hypot(dx, dy) <= 0.02 && next[id]) tracked.yaw = next[id].yaw
          next[id] = tracked
          courseAnchor.set(id, { ...contact.position })
        }
      }
    }
  }

  for (const id of Object.keys(next)) {
    if (!seen.has(id)) {
      delete next[id]
      courseAnchor.delete(id)
    }
  }

  shipCourse.value = next
}

watch(() => telemetry.contacts, observeShipCourses, { deep: true, immediate: true })

// Project contacts onto the radar circle (-140 to +140 radius)
const projectedContacts = computed(() => {
  const radius = 140
  const maxR = maxRangeSU.value
  const contacts = telemetry.contacts || []

  return contacts.map((raw: any) => {
    const c = {
      entityId: raw.entityId || raw.EntityId || '',
      name: raw.name || raw.Name || 'Contact',
      type: raw.type || raw.Type || 'Ship',
      rangeSU: Number(raw.rangeSU ?? raw.RangeSU ?? 0),
      bearingYaw: Number(raw.bearingYaw ?? raw.BearingYaw ?? 0),
      relativeBearing: Number(raw.relativeBearing ?? raw.RelativeBearing ?? 0)
    }

    // In Head-Up mode, angle is relative to ship bow (-90 deg offset aligns 0 deg to 12 o'clock)
    // In North-Up mode, angle is absolute bearing from North (-90 deg aligns North to 12 o'clock)
    const bearingDeg = radarMode.value === 'head-up' ? c.relativeBearing : c.bearingYaw
    const angleRad = (bearingDeg - 90) * (Math.PI / 180)

    // Scale distance
    const distClamped = Math.min(c.rangeSU, maxR)
    const normDist = (distClamped / maxR) * radius

    const x = Math.cos(angleRad) * normDist
    const y = Math.sin(angleRad) * normDist

    const isLocked = telemetry.targetLock?.targetId === c.entityId
    const isInspected = inspectedId.value === c.entityId

    const typeStr = (c.type || '').toLowerCase()
    let typeClass = 'type-ship'
    if (
      typeStr.includes('planet') ||
      typeStr.includes('star') ||
      typeStr.includes('moon') ||
      typeStr.includes('asteroid') ||
      typeStr.includes('nebula')
    ) {
      typeClass = 'type-celestial'
    } else if (typeStr.includes('station') || typeStr.includes('base')) {
      typeClass = 'type-station'
    } else if (
      typeStr.includes('blackhole') ||
      typeStr.includes('hole') ||
      typeStr.includes('pulsar') ||
      typeStr.includes('neutron') ||
      typeStr.includes('wormhole') ||
      typeStr.includes('anomaly') ||
      typeStr.includes('rift')
    ) {
      typeClass = 'type-anomaly'
    }

    const courseYaw = shipCourse.value[c.entityId]?.yaw
    const screenRotation = courseYaw == null
      ? 0
      : radarMode.value === 'head-up'
        ? courseYaw - telemetry.heading.yaw
        : courseYaw

    return {
      ...c,
      x,
      y,
      isLocked,
      isInspected,
      typeClass,
      isShip: typeClass === 'type-ship',
      screenRotation
    }
  })
})

const inspectedContact = computed(() => {
  if (!inspectedId.value) return null
  return telemetry.contacts.find((contact) => contact.entityId === inspectedId.value) ?? null
})

const inspectedHeading = computed(() => (inspectedContact.value ? contactHeading(inspectedContact.value) : null))

watch(
  () => telemetry.contacts.map((contact) => contact.entityId).join('|'),
  () => {
    if (inspectedId.value && !telemetry.contacts.some((contact) => contact.entityId === inspectedId.value)) {
      inspectedId.value = null
    }
  }
)

function formatCoord(value: number | undefined) {
  return Number.isFinite(value) ? value!.toFixed(1) : '—'
}

function formatPair(azimuth: number, elevation: number | null) {
  const az = wrapYaw(azimuth).toFixed(1)
  if (elevation == null || !Number.isFinite(elevation)) return `${az}°/—`
  const sign = elevation >= 0 ? '+' : ''
  return `${az}°/${sign}${elevation.toFixed(1)}°`
}

function relativeElevation(contact: SensorContact) {
  return contact.bearingPitch - telemetry.heading.pitch
}

function isShipContact(contact: SensorContact) {
  const type = (contact.type || '').toLowerCase()
  if (
    type.includes('planet') ||
    type.includes('star') ||
    type.includes('moon') ||
    type.includes('station') ||
    type.includes('base') ||
    type.includes('asteroid') ||
    type.includes('nebula') ||
    type.includes('blackhole') ||
    type.includes('hole') ||
    type.includes('pulsar') ||
    type.includes('neutron') ||
    type.includes('wormhole') ||
    type.includes('anomaly') ||
    type.includes('rift')
  ) {
    return false
  }
  return true
}

function contactHeading(contact: SensorContact) {
  if (!isShipContact(contact)) return null
  const course = shipCourse.value[contact.entityId]
  if (!course) return null
  return {
    relative: {
      azimuth: wrapYaw(course.yaw - telemetry.heading.yaw),
      elevation: course.pitch == null ? null : course.pitch - telemetry.heading.pitch
    },
    true: {
      azimuth: course.yaw,
      elevation: course.pitch
    }
  }
}

function relativeHeadingText(contact: SensorContact) {
  if (!isShipContact(contact)) return 'N/A'
  const heading = contactHeading(contact)
  if (!heading) return 'UNKNOWN'
  return formatPair(heading.relative.azimuth, heading.relative.elevation)
}

function shieldColor(face: ShieldFaceState) {
  if (face.destroyed || !face.raised || (face.pct != null && face.pct <= 0)) return '#8b949e'
  if (face.pct == null || face.pct >= 100) return '#1E90FF'
  if (face.pct >= 80) return '#3DDC4A'
  if (face.pct >= 60) return '#FFE14A'
  if (face.pct >= 40) return '#FF8C00'
  if (face.pct >= 20) return '#FF3030'
  return '#8B0000'
}

function shieldTitle(name: string, face: ShieldFaceState) {
  if (face.destroyed) return `${name} destroyed`
  if (!face.raised) return `${name} down`
  if (face.pct == null) return `${name} raised`
  return `${name} ${Math.round(face.pct)}%`
}

function shieldFaces(contact: SensorContact) {
  const raised = contact.shieldsActive
  const fallback: ShieldFaceState = { pct: raised ? null : 0, raised, destroyed: false }
  const shields = contact.shields
  const faces = [
    { letter: 'F', name: 'Fore', face: shields?.fore ?? fallback },
    { letter: 'A', name: 'Aft', face: shields?.aft ?? fallback },
    { letter: 'P', name: 'Port', face: shields?.port ?? fallback },
    { letter: 'S', name: 'Starboard', face: shields?.starboard ?? fallback }
  ]
  if (shields?.up) faces.push({ letter: 'U', name: 'Up', face: shields.up })
  if (shields?.down) faces.push({ letter: 'D', name: 'Down', face: shields.down })
  return faces.map((entry) => ({
    letter: entry.letter,
    glyph: entry.face.destroyed ? '_' : entry.letter,
    color: shieldColor(entry.face),
    title: shieldTitle(entry.name, entry.face)
  }))
}

function isContactLocked(entityId: string) {
  return telemetry.targetLock?.targetId === entityId
}

function ownSpeedSU() {
  if (telemetry.speed.isWarp && telemetry.speed.warp > 0) return warpToVelocitySU(telemetry.speed.warp)
  return Math.max(0, telemetry.speed.current)
}

function targetVelocity(contact: SensorContact): SensorContact['velocity'] {
  if (contact.velocity) return contact.velocity
  if (contact.velocitySU <= 0.05) return { x: 0, y: 0, z: 0 }
  return null
}

function interceptPlan(contact: SensorContact): { course: InterceptCourse | null; title: string } {
  const speed = ownSpeedSU()
  const velocity = targetVelocity(contact)
  if (!velocity) {
    if (speed + 0.05 < contact.velocitySU) {
      return { course: null, title: 'Cannot intercept at the current speed.' }
    }
    return { course: null, title: 'Cannot plot an intercept until the target course is known.' }
  }
  const course = solveIntercept(telemetry.position, contact.position, velocity, speed)
  if (!course) return { course: null, title: 'Cannot intercept at the current speed.' }
  return { course, title: 'Plot an intercept course at the current speed' }
}

function isStationaryContact(contact: SensorContact) {
  if (contact.velocity && Math.hypot(contact.velocity.x, contact.velocity.y, contact.velocity.z) > 0.05) return false
  return contact.velocitySU <= 0.05
}

function isNavActive(contact: SensorContact, mode: 'approach' | 'intercept') {
  return navOrder.value?.targetId === contact.entityId && navOrder.value.mode === mode
}

function setCourse(contact: SensorContact) {
  beginApproach(contact.entityId)
}

function plotIntercept(contact: SensorContact) {
  if (!isNavActive(contact, 'intercept') && !interceptPlan(contact).course) return
  beginIntercept(contact.entityId)
}

function bodyKind(contact: SensorContact): 'station' | 'landable' | 'other' {
  const type = (contact.type || '').toLowerCase()
  if (type.includes('station')) return 'station'
  if (type.includes('planet') || type.includes('moon')) return 'landable'
  return 'other'
}

function approachLimitSU(contact: SensorContact) {
  const kind = bodyKind(contact)
  const fallbackRadius = kind === 'station' ? 0.5 : 0.65
  const clearance = kind === 'station' ? 0.25 : 0.35
  return (contact.radius ?? fallbackRadius) + clearance
}

function canApproach(contact: SensorContact): 'dock' | 'land' | null {
  if (berthed.value?.entityId === contact.entityId) return null
  const kind = bodyKind(contact)
  if (kind === 'other') return null
  if (contact.rangeSU > approachLimitSU(contact)) return null
  return kind === 'station' ? 'dock' : 'land'
}

function berthAction(contact: SensorContact): 'undock' | 'launch' | null {
  if (berthed.value?.entityId !== contact.entityId) return null
  return berthed.value.mode === 'landed' ? 'launch' : 'undock'
}

function weaponsInRange(contact: SensorContact) {
  const beams = telemetry.weapons.beams.filter((beam) => beam.ready && contact.rangeSU <= beam.maxRange)
  const tubes = telemetry.weapons.tubes.filter((tube) => tube.ready && contact.rangeSU <= tube.maxRange)
  return { beams, tubes }
}

function canFireAt(contact: SensorContact) {
  if (!isContactLocked(contact.entityId)) return false
  const ready = weaponsInRange(contact)
  return ready.beams.length > 0 || ready.tubes.length > 0
}

function fireTitle(contact: SensorContact) {
  if (!isContactLocked(contact.entityId)) return 'Weapons are not locked on this contact.'
  const ready = weaponsInRange(contact)
  if (ready.beams.length === 0 && ready.tubes.length === 0) {
    const anyReady = telemetry.weapons.beams.some((beam) => beam.ready) || telemetry.weapons.tubes.some((tube) => tube.ready)
    return anyReady ? 'Target is out of weapon range.' : 'No weapons are ready.'
  }
  return 'Fire ready weapons'
}

function fireAt(contact: SensorContact) {
  if (!canFireAt(contact)) return
  const ready = weaponsInRange(contact)
  for (const beam of ready.beams) fireBeam(beam.index, contact.entityId)
  for (const tube of ready.tubes) fireTorpedo(tube.index, contact.entityId)
}

function inspectContact(entityId: string) {
  if (!entityId) return
  inspectedId.value = inspectedId.value === entityId ? null : entityId
}

function toggleLock(entityId: string) {
  if (telemetry.targetLock?.targetId === entityId) {
    clearLock()
  } else {
    lockTarget(entityId)
  }
}
</script>

<style scoped>
.tactical-radar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #080d14;
  color: #79c0ff;
  font-family: 'Consolas', 'Courier New', monospace;
  border-radius: 6px;
  overflow: hidden;
  user-select: none;
}

.radar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  background: #0d1520;
  border-bottom: 1px solid #1f334d;
  font-size: 0.85rem;
  letter-spacing: 1px;
}

.radar-subbanner {
  display: flex;
  justify-content: space-between;
  padding: 4px 12px;
  background: #09101a;
  border-bottom: 1px solid #1f334d;
  font-size: 0.75rem;
  color: #8b949e;
}

.radar-title {
  display: flex;
  align-items: center;
  font-weight: bold;
  color: #58a6ff;
}

.radar-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.mode-toggle-btn {
  width: auto;
  height: auto;
  margin: 0;
  background: #1f2a3a;
  border: 1px solid #388bfd;
  color: #58a6ff;
  border-radius: 4px;
  padding: 4px 10px;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: bold;
  line-height: 1.2;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-toggle-btn:hover {
  background: #2b3d54;
  color: white;
}

.zoom-btn {
  width: 1.8rem;
  height: 1.8rem;
  margin: 0;
  background: #172436;
  border: 1px solid #388bfd44;
  color: #79c0ff;
  border-radius: 4px;
  padding: 0;
  font-family: inherit;
  line-height: 1;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s;
}

.zoom-btn:hover {
  background: #1f334d;
  border-color: #58a6ff;
}

.radar-stage {
  display: flex;
  flex: 1;
  min-height: 280px;
  min-width: 0;
}

.radar-display {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  flex: 1;
  min-width: 0;
  min-height: 280px;
}

.sensor-report {
  width: 190px;
  flex-shrink: 0;
  border-left: 1px solid #1f334d;
  background: #0d1520;
  padding: 10px 12px;
  overflow-y: auto;
}

.report-title {
  font-size: 0.7rem;
  font-weight: bold;
  letter-spacing: 1px;
  color: #58a6ff;
  margin-bottom: 6px;
}

.report-name {
  font-size: 0.9rem;
  font-weight: bold;
  color: #e6edf3;
  margin-bottom: 8px;
  line-height: 1.2;
}

.report-fields {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.report-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.report-row dt {
  font-size: 0.6rem;
  letter-spacing: 0.6px;
  color: #8b949e;
}

.report-row dd {
  margin: 0;
  font-size: 0.75rem;
  color: #c9d1d9;
  line-height: 1.3;
  word-break: break-word;
}

.report-stack {
  white-space: pre-line;
}

.report-up {
  color: #3fb950;
}

.report-down {
  color: #f85149;
}

.shield-readout {
  display: flex;
  gap: 0.2rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  font-size: 0.95rem;
  line-height: 1;
}

.shield-face {
  cursor: default;
}

.report-warn {
  color: #e3b341;
}

.radar-svg {
  width: 100%;
  max-width: 320px;
  height: auto;
  aspect-ratio: 1 / 1;
}

.radar-ring {
  fill: none;
  stroke: #1b385a;
  stroke-width: 1;
}

.outer-ring {
  stroke: #2b5687;
  stroke-width: 1.5;
}

.radar-axis {
  stroke: #173252;
  stroke-width: 1;
  stroke-dasharray: 2 4;
}

.cardinal-text {
  fill: #4c86be;
  font-size: 8px;
  font-weight: bold;
}

.range-text {
  fill: #325e8a;
  font-size: 7px;
}

.heading-vector {
  stroke: #58a6ff;
  stroke-width: 2;
}

.heading-arrow {
  fill: #58a6ff;
}

.desired-heading-vector {
  stroke: #e3b341;
  stroke-width: 1.5;
}

.desired-heading-arrow {
  fill: #e3b341;
}

.ownship-center {
  fill: #58a6ff;
  stroke: #9ecbff;
  stroke-width: 0.6;
  stroke-linejoin: round;
}

.ship-glyph {
  stroke-linejoin: round;
}

.shield-bubble {
  fill: none;
  stroke-width: 1.5;
}

.shields-up {
  stroke: #3fb950;
  stroke-dasharray: 3 2;
}

.shields-down {
  stroke: #f85149;
  opacity: 0.4;
}

.radar-contact {
  cursor: pointer;
}

.contact-dot {
  stroke-width: 1;
  stroke: #ffffff88;
}

.type-ship {
  fill: #e3b341;
}

.type-celestial {
  fill: #3fb950;
}

.type-station {
  fill: #a371f7;
}

.type-anomaly {
  fill: #bc8cff;
}

.contact-locked {
  fill: #f85149;
  stroke: #f85149;
}

.contact-inspected {
  stroke: #58a6ff;
  stroke-width: 2;
}

.lock-bracket {
  fill: none;
  stroke: #f85149;
  stroke-width: 1.5;
}

.contact-label {
  fill: #c9d1d9;
  font-size: 7px;
  pointer-events: none;
}

.contacts-list {
  border-top: 1px solid #1f334d;
  background: #09101a;
  max-height: 180px;
  overflow-y: auto;
  padding: 6px;
}

.contacts-header {
  display: flex;
  justify-content: space-between;
  padding: 4px 6px;
  font-size: 0.75rem;
  color: #8b949e;
}

.no-contacts {
  padding: 8px;
  font-size: 0.8rem;
  color: #484f58;
  text-align: center;
}

.contact-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.contact-row:hover {
  background: #132033;
}

.inspected-row {
  background: #132033;
  border-left: 3px solid #58a6ff;
}

.locked-row {
  box-shadow: inset 3px 0 0 #f85149;
}

.contact-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.contact-action {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
}

.contact-name {
  color: #e6edf3;
  font-size: 0.85rem;
}

.contact-meta {
  color: #8b949e;
}

.cmd-btn,
.lock-btn {
  width: auto;
  height: auto;
  margin: 0;
  box-sizing: border-box;
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: bold;
  line-height: 1.2;
  letter-spacing: 0.3px;
  text-align: center;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
}

.lock-btn {
  width: 6.5rem;
}

.nav-btn {
  width: 7.75rem;
}

.nav-active {
  background: #1f3b2d;
  border-color: #3fb950;
  color: #aff5b4;
}

.cmd-btn:hover:not(:disabled) {
  border-color: #58a6ff;
  color: #58a6ff;
}

.cmd-btn:disabled,
.lock-btn:disabled {
  background: #161b22;
  border-color: #30363d;
  color: #6e7681;
  cursor: not-allowed;
}

.cmd-fire:not(:disabled) {
  background: #da3633;
  border-color: #f85149;
  color: white;
}

.lock-btn:hover {
  border-color: #f85149;
  color: #f85149;
}

.locked-active:hover {
  color: white;
}

.locked-active {
  background: #da3633;
  color: white;
  border-color: #f85149;
  font-weight: bold;
}

.text-blue {
  color: #58a6ff;
}
.steer-hint {
  color: #388bfd;
  font-size: 0.65rem;
  letter-spacing: 0.5px;
}

.click-ping-marker {
  pointer-events: none;
}

.ping-dot {
  fill: #58a6ff;
  opacity: 0.9;
}

.ping-ring {
  fill: none;
  stroke: #58a6ff;
  stroke-width: 1.5;
  animation: ping-wave 1s ease-out forwards;
}

@keyframes ping-wave {
  0% {
    r: 4;
    opacity: 1;
    stroke-width: 2;
  }
  100% {
    r: 28;
    opacity: 0;
    stroke-width: 0.5;
  }
}
</style>
