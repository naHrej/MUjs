<template>
  <div ref="radarRoot" class="tactical-radar-container">
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
        <span class="range-label">Range: {{ displayedRangeLabel }}</span>
      </div>
    </div>

    <!-- Active Heading & Mode Banner -->
    <div class="radar-subbanner">
      <span>HEADING: <strong class="text-blue">{{ telemetry.heading.yaw.toFixed(1) }}°</strong> mark {{ telemetry.heading.pitch.toFixed(1) }}°</span>
      <span>MODE: <strong class="text-blue">{{ radarMode === 'head-up' ? 'RELATIVE (SHIP-CENTRIC)' : 'SECTOR (TRUE NORTH)' }}</strong></span>
    </div>

    <div class="radar-body">
    <div class="contacts-list" :style="{ width: `${contactsWidth}px` }">
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
        <span class="contact-name font-semibold">{{ c.name || (c as any).Name }}</span>
        <span class="contact-meta text-xs">{{ contactSummary(c) }}</span>
      </div>
    </div>

    <div
      ref="splitterRef"
      class="radar-splitter"
      title="Drag to resize the contact list"
      @mousedown.prevent="startContactsResize"
    ></div>

    <div class="radar-main">
    <div class="radar-stage">
    <div class="radar-display" @wheel.prevent="onRadarWheel">
      <svg
        ref="svgRef"
        viewBox="-220 -220 440 440"
        class="radar-svg"
      >
        <!-- Range rings continue until the circle leaves the viewBox -->
        <g v-for="ring in rangeRings" :key="ring.distance">
          <circle
            cx="0"
            cy="0"
            :r="ring.radius"
            :class="['radar-ring', ring.major ? 'radar-ring-major' : '']"
          />
          <text
            x="6"
            :y="-ring.radius - 3"
            :class="['range-text', ring.major ? 'range-text-major' : '']"
          >{{ ring.label }}</text>
        </g>
        <circle
          v-if="sensorRingRadius != null"
          cx="0"
          cy="0"
          :r="sensorRingRadius"
          class="radar-ring radar-ring-sensor"
        />

        <!-- Crosshairs -->
        <line :x1="-VIEW_EDGE" y1="0" :x2="VIEW_EDGE" y2="0" class="radar-axis" />
        <line x1="0" :y1="-VIEW_EDGE" x2="0" :y2="VIEW_EDGE" class="radar-axis" />

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

        <!-- Desired Turn Indicator (shows where ordered heading is if turning in Head-Up mode) -->
        <g
          v-if="radarMode === 'head-up' && Math.abs(telemetry.heading.desiredYaw - telemetry.heading.yaw) > 1"
          :transform="`rotate(${desiredHeadingOffset})`"
        >
          <line x1="0" y1="0" x2="0" y2="-38" class="desired-heading-vector" stroke-dasharray="3 3" />
          <polygon points="0,-42 -4,-34 4,-34" class="desired-heading-arrow" />
        </g>

        <!-- Ownship hull points along its heading -->
        <g :transform="`rotate(${ownshipScreenRotation})`">
          <polygon points="0,-9 -3.6,6 3.6,6" class="ownship-center" />
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

        </g>

        <g
          v-for="callout in contactCallouts"
          :key="callout.id"
          class="contact-callout"
        >
          <template v-if="callout.stacked">
            <line
              v-for="member in callout.members"
              :key="`${member.entityId}-leader`"
              :x1="member.leaderX"
              :y1="member.leaderY"
              :x2="callout.bracketX"
              :y2="member.lineY"
              class="contact-leader"
            />
            <path :d="callout.bracket" class="contact-bracket" />
            <text
              v-for="member in callout.members"
              :key="`${member.entityId}-label`"
              :x="callout.textX"
              :y="member.textY"
              class="contact-label"
              @click.stop="inspectContact(member.entityId)"
            >{{ member.text }}</text>
          </template>
          <text
            v-else
            :x="callout.x"
            :y="callout.y"
            class="contact-label"
            @click.stop="inspectContact(callout.entityId)"
          >{{ callout.text }}</text>
        </g>
      </svg>
      <div class="radar-zoom">
        <button class="zoom-btn" :disabled="!canZoomIn" @click="zoomIn" title="Zoom In"><i class="pi pi-plus"></i></button>
        <button class="zoom-btn" :disabled="!canZoomOut" @click="zoomOut" title="Zoom Out"><i class="pi pi-minus"></i></button>
      </div>
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
    <div class="radar-actions">
      <button
        class="cmd-btn"
        :disabled="!selectedBerth.enabled"
        :title="selectedBerth.title"
        @click="runSelectedBerth"
      >
        {{ selectedBerth.label }}
      </button>
      <button
        v-if="!inspectedContact || (isStationaryContact(inspectedContact) && !isNavActive(inspectedContact, 'intercept'))"
        :class="['cmd-btn', 'nav-btn', inspectedContact && isNavActive(inspectedContact, 'approach') ? 'nav-active' : '']"
        :disabled="!inspectedContact"
        :title="inspectedContact ? (isNavActive(inspectedContact, 'approach') ? 'Cancel course' : 'Face the target, approach, and stop alongside it') : 'Select a contact'"
        @click="inspectedContact && setCourse(inspectedContact)"
      >
        SET COURSE
      </button>
      <button
        v-else
        :class="['cmd-btn', 'nav-btn', isNavActive(inspectedContact, 'intercept') ? 'nav-active' : '']"
        :disabled="!isNavActive(inspectedContact, 'intercept') && !interceptPlan(inspectedContact).course"
        :title="isNavActive(inspectedContact, 'intercept') ? 'Cancel intercept' : interceptPlan(inspectedContact).title"
        @click="plotIntercept(inspectedContact)"
      >
        INTERCEPT
      </button>
      <button
        :class="['lock-btn', inspectedContact && isContactLocked(inspectedContact.entityId) ? 'locked-active' : '']"
        :disabled="!inspectedContact"
        :title="inspectedContact ? 'Toggle weapons lock' : 'Select a contact'"
        @click="inspectedContact && toggleLock(inspectedContact.entityId)"
      >
        {{ inspectedContact && isContactLocked(inspectedContact.entityId) ? 'UNLOCK' : 'LOCK' }}
      </button>
      <button
        class="cmd-btn cmd-fire"
        :disabled="!inspectedContact || !canFireAt(inspectedContact)"
        :title="inspectedContact ? fireTitle(inspectedContact) : 'Select a contact'"
        @click="inspectedContact && fireAt(inspectedContact)"
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

const radarRoot = ref<HTMLElement | null>(null)
const splitterRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const CONTACTS_WIDTH_KEY = 'mujs_radar_contacts_width'
const contactsWidth = ref(readContactsWidth())

function readContactsWidth() {
  const stored = Number(localStorage.getItem(CONTACTS_WIDTH_KEY))
  return Number.isFinite(stored) && stored >= 160 ? stored : 240
}

function startContactsResize(event: MouseEvent) {
  const handle = splitterRef.value
  const view = handle?.ownerDocument.defaultView
  if (!handle || !view) return

  const startX = event.clientX
  const startWidth = contactsWidth.value
  view.document.body.style.cursor = 'col-resize'

  const onMove = (move: MouseEvent) => {
    const root = radarRoot.value
    const limit = root ? Math.max(160, root.getBoundingClientRect().width - 320) : 480
    const next = startWidth + (move.clientX - startX)
    contactsWidth.value = Math.round(Math.min(limit, Math.max(160, next)))
  }

  const onUp = () => {
    view.document.body.style.cursor = ''
    localStorage.setItem(CONTACTS_WIDTH_KEY, String(contactsWidth.value))
    view.removeEventListener('mousemove', onMove)
    view.removeEventListener('mouseup', onUp)
  }

  view.addEventListener('mousemove', onMove)
  view.addEventListener('mouseup', onUp)
}

const clickPing = ref<{ x: number; y: number; key: number } | null>(null)
let pingTimer: any = null

const maxRangeSU = ref(50)
const RADAR_RADIUS = 140
const VIEW_EDGE = 220
const PARSEC_SU = 3085659622.014257
const AU_SU = PARSEC_SU / 206264.80624709636
const MIN_RANGE_SU = 0.25
const MAX_RANGE_SU = (100 * AU_SU * RADAR_RADIUS) / VIEW_EDGE
const ZOOM_FACTOR = 2

function niceStep(target: number) {
  if (!Number.isFinite(target) || target <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(target))
  const normalized = target / magnitude
  const nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1
  return nice * magnitude
}

const displayedRangeSU = computed(() => maxRangeSU.value * (VIEW_EDGE / RADAR_RADIUS))
const displayedRangeLabel = computed(() => formatDistance(displayedRangeSU.value))

function trimTrailingZeros(text: string) {
  return text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

function formatDistance(distance: number) {
  const au = distance / AU_SU
  if (au >= 0.05) {
    const digits = au >= 10 ? 0 : au >= 1 ? 1 : 2
    return `${trimTrailingZeros(au.toFixed(digits))} AU`
  }
  if (distance >= 100) return `${Math.round(distance)} SU`
  if (distance >= 10) return `${trimTrailingZeros(distance.toFixed(1))} SU`
  return `${trimTrailingZeros(distance.toFixed(2))} SU`
}
const SENSOR_RANGE_SCALE = 1_000_000 / 99
const SENSOR_THRESHOLD = 0.01

function gridVisibility(x: number, y: number, z: number) {
  const px = x / PARSEC_SU
  const py = y / PARSEC_SU
  const pz = z / PARSEC_SU
  const dx = Math.abs(px - Math.round(px / 100) * 100)
  const dy = Math.abs(py - Math.round(py / 100) * 100)
  const dz = Math.abs(pz - Math.round(pz / 100) * 100)
  const visibility = 1.1 - 1 / (1 + dx * dx + dy * dy + dz * dz)
  return Math.min(1, Math.max(0, visibility))
}

function shortRangeLimitSU(resolution: number, signature: number, visibility: number) {
  const reach = (resolution + 0.01) * signature * visibility
  const span = reach / SENSOR_THRESHOLD - 0.1
  if (span <= 0) return 0
  return Math.sqrt(span * SENSOR_RANGE_SCALE)
}

const sensorRangeSU = computed(() => {
  const ship = telemetry as typeof telemetry & {
    srsResolution?: number
    SrsResolution?: number
    sensorResolution?: number
  }
  const reported = Number(ship.srsResolution ?? ship.SrsResolution ?? ship.sensorResolution)
  const powered = telemetry.power.sensors > 0
  const resolution = Number.isFinite(reported) ? Math.max(0, reported) : powered ? 1 : 0
  const visibility = gridVisibility(telemetry.position.x, telemetry.position.y, telemetry.position.z)
  return shortRangeLimitSU(resolution, 1, visibility)
})

const sensorRingRadius = computed(() => {
  const radius = sensorRangeSU.value * (RADAR_RADIUS / maxRangeSU.value)
  if (radius <= 0 || radius > VIEW_EDGE * Math.SQRT2) return null
  return radius
})

const rangeRings = computed(() => {
  const maxRange = maxRangeSU.value
  const pixelsPerSU = RADAR_RADIUS / maxRange
  const limit = VIEW_EDGE * Math.SQRT2
  const step = niceStep((limit / pixelsPerSU) / 4)
  const rings: { distance: number; radius: number; major: boolean; label: string }[] = []

  for (let index = 1; index < 24; index++) {
    const distance = step * index
    const radius = distance * pixelsPerSU
    if (radius > limit) break
    rings.push({
      distance,
      radius,
      major: index % 2 === 0,
      label: formatDistance(distance)
    })
  }

  return rings
})
const radarMode = ref<'head-up' | 'north-up'>('head-up')
const inspectedId = ref<string | null>(null)

function handleRadarContextMenu(event: MouseEvent) {
  event.preventDefault()
  if (!svgRef.value) return

  const rect = svgRef.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const point = svgRef.value.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const matrix = svgRef.value.getScreenCTM()
  if (!matrix) return
  const mapped = point.matrixTransform(matrix.inverse())
  const svgX = mapped.x
  const svgY = mapped.y

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

function clampRange(value: number) {
  return Math.min(MAX_RANGE_SU, Math.max(MIN_RANGE_SU, value))
}

const canZoomIn = computed(() => maxRangeSU.value > MIN_RANGE_SU * 1.01)
const canZoomOut = computed(() => maxRangeSU.value < MAX_RANGE_SU / 1.01)

function zoomIn() {
  if (!canZoomIn.value) return
  maxRangeSU.value = clampRange(maxRangeSU.value / ZOOM_FACTOR)
}

function zoomOut() {
  if (!canZoomOut.value) return
  maxRangeSU.value = clampRange(maxRangeSU.value * ZOOM_FACTOR)
}

let wheelAccum = 0
function onRadarWheel(event: WheelEvent) {
  wheelAccum += event.deltaY
  const threshold = 80
  if (Math.abs(wheelAccum) < threshold) return
  const steps = Math.trunc(wheelAccum / threshold)
  wheelAccum -= steps * threshold
  const factor = ZOOM_FACTOR ** Math.min(4, Math.abs(steps))
  maxRangeSU.value = clampRange(steps > 0 ? maxRangeSU.value * factor : maxRangeSU.value / factor)
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
    const radius = RADAR_RADIUS
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

    const normDist = (c.rangeSU / maxR) * radius
    if (normDist > VIEW_EDGE * Math.SQRT2) return null

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
  }).filter((contact) => contact != null)
})

const LABEL_CHAR_WIDTH = 4.1
const LABEL_HEIGHT = 9
const LABEL_LINE = 11
const LABEL_GAP = 3

function contactLabel(name: string, rangeSU: number) {
  return `${name} (${rangeSU.toFixed(1)})`
}

function labelWidth(text: string) {
  return Math.max(18, text.length * LABEL_CHAR_WIDTH)
}

const contactCallouts = computed(() => {
  const contacts = projectedContacts.value
  const boxes = contacts.map((contact) => {
    const text = contactLabel(contact.name, contact.rangeSU)
    return {
      contact,
      text,
      x: contact.x + 8,
      y: contact.y - 7,
      w: labelWidth(text),
      h: LABEL_HEIGHT
    }
  })

  const parent = boxes.map((_, index) => index)
  const find = (index: number): number => {
    let root = index
    while (parent[root] !== root) root = parent[root]
    let cursor = index
    while (parent[cursor] !== root) {
      const next = parent[cursor]
      parent[cursor] = root
      cursor = next
    }
    return root
  }
  const overlaps = (left: (typeof boxes)[number], right: (typeof boxes)[number]) =>
    left.x < right.x + right.w + LABEL_GAP &&
    left.x + left.w + LABEL_GAP > right.x &&
    left.y < right.y + right.h + LABEL_GAP &&
    left.y + left.h + LABEL_GAP > right.y

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i], boxes[j])) {
        const left = find(i)
        const right = find(j)
        if (left !== right) parent[right] = left
      }
    }
  }

  const groups = new Map<number, number[]>()
  boxes.forEach((_, index) => {
    const root = find(index)
    const list = groups.get(root)
    if (list) list.push(index)
    else groups.set(root, [index])
  })

  return [...groups.values()].map((indexes) => {
    if (indexes.length === 1) {
      const box = boxes[indexes[0]]
      return {
        id: box.contact.entityId || box.text,
        stacked: false as const,
        entityId: box.contact.entityId,
        text: box.text,
        x: box.x,
        y: box.contact.y + 3,
        members: [],
        bracket: '',
        bracketX: 0,
        textX: 0
      }
    }

    const members = indexes
      .map((index) => boxes[index])
      .sort((left, right) => left.contact.y - right.contact.y || left.contact.x - right.contact.x)
    const width = Math.max(...members.map((member) => labelWidth(member.text)))
    const blockHeight = members.length * LABEL_LINE
    const rightEdge = Math.max(...members.map((member) => member.contact.x))
    let textX = rightEdge + 18
    if (textX + width > VIEW_EDGE - 4) textX = VIEW_EDGE - 4 - width
    const bracketX = textX - 6
    const preferredTop = members.reduce((sum, member) => sum + member.contact.y, 0) / members.length - blockHeight / 2
    const top = Math.min(VIEW_EDGE - blockHeight - 2, Math.max(-VIEW_EDGE + 8, preferredTop))
    const bottom = top + (members.length - 1) * LABEL_LINE + 4
    const placed = members.map((member, line) => {
      const textY = top + line * LABEL_LINE + 8
      const lineY = textY - 3
      const dx = bracketX - member.contact.x
      const dy = lineY - member.contact.y
      const length = Math.hypot(dx, dy) || 1
      return {
        entityId: member.contact.entityId,
        text: member.text,
        textY,
        lineY,
        leaderX: member.contact.x + (dx / length) * 8,
        leaderY: member.contact.y + (dy / length) * 8
      }
    })

    return {
      id: placed.map((member) => member.entityId).join('|'),
      stacked: true as const,
      entityId: '',
      text: '',
      x: 0,
      y: 0,
      members: placed,
      bracket: `M ${bracketX + 5} ${top} H ${bracketX} V ${bottom} H ${bracketX + 5}`,
      bracketX,
      textX
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

function contactSummary(contact: SensorContact) {
  const type = contact.type || 'Contact'
  const range = (contact.rangeSU ?? 0).toFixed(1)
  const bearing = formatPair(contact.relativeBearing ?? 0, relativeElevation(contact))
  return `${type} ${range}SU @ ${bearing}`
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

const selectedBerth = computed(() => {
  const contact = inspectedContact.value
  if (!contact) return { label: 'DOCK', title: 'Select a contact', enabled: false, run: () => {} }
  const leaving = berthAction(contact)
  if (leaving === 'launch') return { label: 'LAUNCH', title: 'Leave the surface', enabled: true, run: () => departBerth() }
  if (leaving === 'undock') return { label: 'UNDOCK', title: 'Leave the dock', enabled: true, run: () => departBerth() }
  const approach = canApproach(contact)
  if (approach === 'land') return { label: 'LAND', title: 'Land on the surface', enabled: true, run: () => landOn(contact.entityId) }
  if (approach === 'dock') return { label: 'DOCK', title: 'Dock with the station', enabled: true, run: () => dockWith(contact.entityId) }
  return { label: 'DOCK', title: 'This contact cannot be docked with', enabled: false, run: () => {} }
})

function runSelectedBerth() {
  if (!selectedBerth.value.enabled) return
  selectedBerth.value.run()
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

.zoom-btn:hover:not(:disabled) {
  background: #1f334d;
  border-color: #58a6ff;
}

.zoom-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.radar-body {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.radar-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr) auto;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.radar-actions {
  grid-column: 1;
  grid-row: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #09101a;
  border-top: 1px solid #1f334d;
}

.radar-stage {
  display: contents;
}

.radar-display {
  position: relative;
  display: flex;
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  min-height: 0;
}

.radar-zoom {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sensor-report {
  grid-column: 2;
  grid-row: 1 / span 2;
  width: 190px;
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
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.radar-ring {
  fill: none;
  stroke: #2a4a6e;
  stroke-width: 1;
  stroke-dasharray: 2 3;
}

.radar-ring-major {
  stroke: #4d7399;
  stroke-width: 1.15;
  stroke-dasharray: none;
}

.radar-ring-sensor {
  stroke: #79c0ff;
  stroke-width: 1.6;
  stroke-dasharray: none;
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
  fill: #9fb6cc;
  font-size: 7px;
}

.range-text-major {
  fill: #c5d7e8;
  font-size: 8px;
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

.contact-callout {
  pointer-events: none;
}

.contact-leader {
  fill: none;
  stroke: #6e8eae;
  stroke-width: 0.7;
}

.contact-bracket {
  fill: none;
  stroke: #9fb6cc;
  stroke-width: 0.8;
}

.contact-label {
  fill: #c9d1d9;
  font-size: 7px;
  pointer-events: auto;
  cursor: pointer;
}

.radar-splitter {
  position: relative;
  flex-shrink: 0;
  width: 8px;
  cursor: col-resize;
  background: #1f334d;
  touch-action: none;
  z-index: 3;
}

.radar-splitter::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -8px;
  right: -8px;
}

.radar-splitter:hover {
  background: #388bfd;
}

.contacts-list {
  flex-shrink: 0;
  min-height: 0;
  background: #09101a;
  overflow-y: auto;
  padding: 6px;
}

.no-contacts {
  padding: 8px;
  font-size: 0.8rem;
  color: #484f58;
  text-align: center;
}

.contact-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
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
