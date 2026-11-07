import { reactive, ref, computed } from 'vue'
import { eventMiddleware } from '../../services/eventMiddleware'
import type { MiddlewareEvent, ProtocolEnvelope } from '../../shared/types/events'
import { solveIntercept } from '../components/space/interceptCourse'

export interface SensorPosition {
  x: number
  y: number
  z: number
}

export interface SensorContact {
  entityId: string
  name: string
  type: string
  rangeSU: number
  bearingYaw: number
  bearingPitch: number
  relativeBearing: number
  velocitySU: number
  shieldsActive: boolean
  shields: ContactShields
  cloaked: boolean
  position: SensorPosition
  velocity: SensorPosition | null
  headingYaw: number | null
  headingPitch: number | null
  radius: number | null
}

export interface ShieldFaceState {
  pct: number | null
  raised: boolean
  destroyed: boolean
}

export interface ContactShields {
  fore: ShieldFaceState
  aft: ShieldFaceState
  port: ShieldFaceState
  starboard: ShieldFaceState
  up: ShieldFaceState | null
  down: ShieldFaceState | null
}

export interface BerthState {
  entityId: string
  mode: 'docked' | 'landed'
}

export interface BridgeAlert {
  id: string
  shipId: string
  station: string
  actor: string
  actorDbref: string
  message: string
  timestamp: number
}

export interface BeamWeaponState {
  index: number
  name: string
  charge: number
  ready: boolean
  maxRange: number
}

export interface TorpedoTubeState {
  index: number
  name: string
  ready: boolean
  ammo: number
  timeToReady: number
  reloadTime: number
  maxRange: number
}

export interface SpaceWeapons {
  beams: BeamWeaponState[]
  tubes: TorpedoTubeState[]
}

export interface SpaceTelemetry {
  shipId: string
  name: string
  className: string
  alertStatus: string
  heading: {
    yaw: number
    pitch: number
    desiredYaw: number
    desiredPitch: number
  }
  speed: {
    current: number
    desired: number
    warp: number
    desiredWarp: number
    isWarp: boolean
  }
  position: {
    x: number
    y: number
    z: number
    system: string
  }
  power: {
    totalProduced: number
    surplus: number
    battery: number
    batteryCapacity: number
    engines: number
    shields: number
    weapons: number
    sensors: number
    lifeSupport: number
    cloak: number
  }
  shields: {
    isRaised: boolean
    overallPct: number
    fore: number
    aft: number
    port: number
    starboard: number
  }
  hull: {
    current: number
    max: number
    pct: number
  }
  armor: {
    current: number
    max: number
    pct: number
  }
  targetLock: {
    targetId: string
    strength: number
  } | null
  contacts: SensorContact[]
  weapons: SpaceWeapons
}

const defaultTelemetry: SpaceTelemetry = {
  shipId: '',
  name: 'USS Stargazer',
  className: 'Constellation',
  alertStatus: 'Green',
  heading: { yaw: 0, pitch: 0, desiredYaw: 0, desiredPitch: 0 },
  speed: { current: 0, desired: 0, warp: 0, desiredWarp: 0, isWarp: false },
  position: { x: 14960, y: 0, z: 0, system: 'Sol' },
  power: {
    totalProduced: 1200,
    surplus: 0,
    battery: 1000,
    batteryCapacity: 1000,
    engines: 400,
    shields: 300,
    weapons: 300,
    sensors: 150,
    lifeSupport: 50,
    cloak: 0
  },
  shields: { isRaised: false, overallPct: 100, fore: 500, aft: 500, port: 500, starboard: 500 },
  hull: { current: 1500, max: 1500, pct: 100 },
  armor: { current: 600, max: 600, pct: 100 },
  targetLock: null,
  contacts: [],
  weapons: {
    beams: [{ index: 0, name: 'Primary Phaser Array', charge: 100, ready: true, maxRange: 50 }],
    tubes: [{ index: 0, name: 'Forward Torpedo Tube', ready: true, ammo: 0, timeToReady: 0, reloadTime: 5, maxRange: 100 }]
  }
}

const BEAM_RECHARGE_PERCENT_PER_SECOND = 10
let weaponsAuthoritative = false
let weaponTickAt = Date.now()

// Global reactive telemetry state
const telemetry = reactive<SpaceTelemetry>({ ...defaultTelemetry })
const hasActiveTelemetry = ref(false)
const lastTelemetryTimestamp = ref(0)
const hudVisible = ref(false)
const berthed = ref<BerthState | null>(null)
const activeStation = ref<'radar' | 'helm' | 'tactical' | 'engineering'>('radar')
const recentAlerts = ref<BridgeAlert[]>([])
const latestAlert = ref<BridgeAlert | null>(null)
let alertDismissTimer: any = null

// Subscribe to protocol envelopes
const stopSpaceEvents = eventMiddleware.subscribe((event: MiddlewareEvent) => {
  if (event.type === 'protocol-envelope') {
    handleEnvelope(event.envelope)
  }
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopSpaceEvents()
    stopApproachTimer()
  })
}

function handleEnvelope(envelope: ProtocolEnvelope) {
  if (envelope.type === 'space.telemetry' && envelope.payload) {
    const payload = envelope.payload

    // Normalize contacts to avoid case mismatch (PascalCase from C# vs camelCase in TS)
    if (Array.isArray(payload.contacts)) {
      payload.contacts = payload.contacts.map((c: any) => normalizeSensorContact(c))
    }

    if ('dockedTo' in payload || 'DockedTo' in payload) {
      const dockedId = payload.dockedTo ?? payload.DockedTo
      const dockedMode = String(payload.dockedMode ?? payload.DockedMode ?? 'docked').toLowerCase()
      berthed.value = dockedId
        ? { entityId: String(dockedId), mode: dockedMode.includes('land') ? 'landed' : 'docked' }
        : null
    }

    if (payload.weapons || payload.Weapons) {
      payload.weapons = normalizeWeapons(payload.weapons || payload.Weapons)
      delete payload.Weapons
      weaponsAuthoritative = true
    }

    Object.assign(telemetry, payload)
    hasActiveTelemetry.value = true
    lastTelemetryTimestamp.value = Date.now()
    noteApproachSample()
  } else if (envelope.type === 'space.action.alert' && envelope.payload) {
    const payload = envelope.payload
    const alert: BridgeAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      shipId: payload.shipId || '',
      station: (payload.station || 'bridge').toLowerCase(),
      actor: payload.actor || 'Crew',
      actorDbref: payload.actorDbref || '',
      message: payload.message || '',
      timestamp: Number(payload.timestamp || Date.now())
    }

    recentAlerts.value.unshift(alert)
    if (recentAlerts.value.length > 40) {
      recentAlerts.value.pop()
    }
    latestAlert.value = alert

    if (alertDismissTimer) clearTimeout(alertDismissTimer)
    alertDismissTimer = setTimeout(() => {
      if (latestAlert.value?.id === alert.id) {
        latestAlert.value = null
      }
    }, 7000)
  }
}

// Helper to write JSON envelopes to game server
function readOptionalYaw(value: unknown): number | null {
  if (value == null || value === '') return null
  const yaw = Number(value)
  return Number.isFinite(yaw) ? yaw : null
}

function readVector(value: any): SensorPosition | null {
  if (Array.isArray(value) && value.length >= 3) {
    return { x: Number(value[0] ?? 0), y: Number(value[1] ?? 0), z: Number(value[2] ?? 0) }
  }
  if (value && typeof value === 'object') {
    const x = value.x ?? value.X
    const y = value.y ?? value.Y
    const z = value.z ?? value.Z
    if (x != null || y != null || z != null) {
      return { x: Number(x ?? 0), y: Number(y ?? 0), z: Number(z ?? 0) }
    }
  }
  return null
}

function readSensorPosition(raw: any): SensorPosition {
  const pos = raw?.position ?? raw?.Position
  if (Array.isArray(pos)) {
    return {
      x: Number(pos[0] ?? 0),
      y: Number(pos[1] ?? 0),
      z: Number(pos[2] ?? 0)
    }
  }
  return {
    x: Number(pos?.x ?? pos?.X ?? 0),
    y: Number(pos?.y ?? pos?.Y ?? 0),
    z: Number(pos?.z ?? pos?.Z ?? 0)
  }
}

function readOptionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function interpretShieldFace(value: any, fallbackRaised: boolean): ShieldFaceState {
  if (typeof value === 'boolean') {
    return { pct: null, raised: value, destroyed: false }
  }
  if (typeof value === 'number') {
    if (value <= 0) return { pct: 0, raised: fallbackRaised, destroyed: false }
    if (value <= 100) return { pct: value, raised: fallbackRaised, destroyed: false }
    return { pct: null, raised: fallbackRaised, destroyed: false }
  }
  if (!value || typeof value !== 'object') {
    return { pct: null, raised: fallbackRaised, destroyed: false }
  }

  const destroyed = Boolean(value.destroyed ?? value.Destroyed ?? value.isDestroyed ?? value.IsDestroyed)
  const max = readOptionalNumber(value.max ?? value.Max)
  const current = readOptionalNumber(value.current ?? value.Current)
  const pctField = readOptionalNumber(value.pct ?? value.percentage ?? value.Percentage ?? value.percent ?? value.Percent)
  const raisedRaw = value.raised ?? value.isRaised ?? value.IsRaised
  const raised = raisedRaw == null ? fallbackRaised : Boolean(raisedRaw)
  if (destroyed || max === 0) return { pct: 0, raised, destroyed: true }

  let pct = pctField
  if (pct == null && current != null && max != null && max > 0) pct = (current / max) * 100
  if (pct == null && current != null && max == null && current <= 100) pct = current
  if (pct == null && current != null && current <= 0) pct = 0
  return { pct, raised, destroyed: false }
}

function readShieldFace(source: any, names: string[], fallbackRaised: boolean): ShieldFaceState | null {
  if (!source || typeof source !== 'object') return null
  for (const name of names) {
    if (source[name] != null) return interpretShieldFace(source[name], fallbackRaised)
  }
  return null
}

function readContactShields(raw: any, shieldsActive: boolean): ContactShields {
  const source = raw?.shields ?? raw?.Shields ?? raw?.shieldFacings ?? raw?.ShieldFacings
  const facings = source?.facings ?? source?.Facings ?? source
  const raisedFlag = source && typeof source === 'object' ? (source.isRaised ?? source.IsRaised ?? source.raised ?? source.Raised) : undefined
  const raised = raisedFlag == null ? shieldsActive : Boolean(raisedFlag)
  const fallback = { pct: raised ? null : 0, raised, destroyed: false }

  return {
    fore: readShieldFace(facings, ['fore', 'Fore'], raised) ?? fallback,
    aft: readShieldFace(facings, ['aft', 'Aft'], raised) ?? fallback,
    port: readShieldFace(facings, ['port', 'Port'], raised) ?? fallback,
    starboard: readShieldFace(facings, ['starboard', 'Starboard', 'stbd', 'Stbd'], raised) ?? fallback,
    up: readShieldFace(facings, ['up', 'Up', 'dorsal', 'Dorsal'], raised),
    down: readShieldFace(facings, ['down', 'Down', 'ventral', 'Ventral'], raised)
  }
}

function normalizeSensorContact(c: any): SensorContact {
  return {
    entityId: c.entityId || c.EntityId || '',
    name: c.name || c.Name || 'Unknown',
    type: c.type || c.Type || 'Ship',
    rangeSU: Number(c.rangeSU ?? c.RangeSU ?? 0),
    bearingYaw: Number(c.bearingYaw ?? c.BearingYaw ?? 0),
    bearingPitch: Number(c.bearingPitch ?? c.BearingPitch ?? 0),
    relativeBearing: Number(c.relativeBearing ?? c.RelativeBearing ?? 0),
    velocitySU: Number(c.velocitySU ?? c.VelocitySU ?? 0),
    shieldsActive: Boolean(c.shieldsActive ?? c.ShieldsActive),
    shields: readContactShields(c, Boolean(c.shieldsActive ?? c.ShieldsActive)),
    cloaked: Boolean(c.cloaked ?? c.Cloaked),
    position: readSensorPosition(c),
    velocity: readVector(c.velocityVector ?? c.VelocityVector ?? c.velocity ?? c.Velocity),
    headingYaw: readOptionalYaw(
      c.headingYaw ?? c.HeadingYaw ?? c.heading?.yaw ?? c.Heading?.Yaw ?? c.movement?.yaw ?? c.Movement?.Yaw
    ),
    headingPitch: readOptionalYaw(
      c.headingPitch ?? c.HeadingPitch ?? c.heading?.pitch ?? c.Heading?.Pitch ?? c.movement?.pitch ?? c.Movement?.Pitch
    ),
    radius: c.radius != null || c.Radius != null ? Number(c.radius ?? c.Radius) : null
  }
}

function normalizeWeapons(raw: any): SpaceWeapons {
  const beamsRaw = Array.isArray(raw?.beams) ? raw.beams : Array.isArray(raw?.Beams) ? raw.Beams : []
  const tubesRaw = Array.isArray(raw?.tubes) ? raw.tubes : Array.isArray(raw?.Tubes) ? raw.Tubes : []

  return {
    beams: beamsRaw.map((beam: any, i: number) => {
      const charge = Number(beam.charge ?? beam.chargePercentage ?? beam.ChargePercentage ?? 0)
      const readyFlag = beam.ready ?? beam.isReady ?? beam.IsReady
      return {
        index: Number(beam.index ?? beam.Index ?? i),
        name: beam.name || beam.Name || 'Beam',
        charge,
        ready: readyFlag === undefined ? charge >= 100 : Boolean(readyFlag),
        maxRange: Number(beam.maxRange ?? beam.MaxRange ?? 50)
      }
    }),
    tubes: tubesRaw.map((tube: any, i: number) => {
      const timeToReady = Number(tube.timeToReady ?? tube.TimeToReady ?? 0)
      const ammo = Number(tube.ammo ?? tube.ammoCount ?? tube.AmmoCount ?? 0)
      const readyFlag = tube.ready ?? tube.isReady ?? tube.IsReady
      return {
        index: Number(tube.index ?? tube.Index ?? i),
        name: tube.name || tube.Name || 'Torpedo Tube',
        ammo,
        timeToReady,
        reloadTime: Number(tube.reloadTime ?? tube.ReloadTime ?? 5),
        ready: readyFlag === undefined ? timeToReady <= 0 && ammo > 0 : Boolean(readyFlag),
        maxRange: Number(tube.maxRange ?? tube.MaxRange ?? 100)
      }
    })
  }
}

function markBeamFired(beamIndex: number) {
  const beam = telemetry.weapons.beams.find((item) => item.index === beamIndex)
  if (!beam) return
  beam.charge = 0
  beam.ready = false
}

function markTubeFired(tubeIndex: number) {
  const tube = telemetry.weapons.tubes.find((item) => item.index === tubeIndex)
  if (!tube) return
  tube.timeToReady = tube.reloadTime > 0 ? tube.reloadTime : 5
  tube.ready = false
  if (weaponsAuthoritative && tube.ammo > 0) tube.ammo -= 1
}

function advanceLocalWeapons(deltaSeconds: number) {
  if (weaponsAuthoritative || deltaSeconds <= 0) return

  const powerMultiplier = Math.min(2, Math.max(0.1, telemetry.power.weapons / 100))
  for (const beam of telemetry.weapons.beams) {
    if (beam.charge >= 100) {
      beam.charge = 100
      beam.ready = true
      continue
    }
    beam.charge = Math.min(100, beam.charge + BEAM_RECHARGE_PERCENT_PER_SECOND * powerMultiplier * deltaSeconds)
    beam.ready = beam.charge >= 100
  }

  for (const tube of telemetry.weapons.tubes) {
    if (tube.timeToReady > 0) {
      tube.timeToReady = Math.max(0, tube.timeToReady - deltaSeconds)
    }
    tube.ready = tube.timeToReady <= 0
  }
}

const weaponTickGlobal = globalThis as typeof globalThis & { __mujsWeaponTick?: number }
if (weaponTickGlobal.__mujsWeaponTick) {
  window.clearInterval(weaponTickGlobal.__mujsWeaponTick)
}
weaponTickGlobal.__mujsWeaponTick = window.setInterval(() => {
  const now = Date.now()
  const deltaSeconds = Math.min(1, (now - weaponTickAt) / 1000)
  weaponTickAt = now
  advanceLocalWeapons(deltaSeconds)
}, 200)

const LIGHT_SPEED_SU = 29.9792458
const FULL_IMPULSE_SU = 0.25 * LIGHT_SPEED_SU
const FALLBACK_ACCEL_SU = 1.2
const ALIGN_DEGREES = 10

type NavMode = 'approach' | 'intercept'

interface ApproachPlan {
  mode: NavMode
  targetId: string
  standoffSU: number
  estimatedRange: number
  sampleAt: number
  lastSpeed: number
  accelSU: number
}

const navOrder = ref<{ targetId: string; mode: NavMode } | null>(null)
let approachPlan: ApproachPlan | null = null
let approachTimer: ReturnType<typeof setInterval> | undefined
let commandedYaw: number | null = null
let commandedPitch: number | null = null
let commandedImpulse: number | null = null
let commandedWarp: number | null = null

function shortestAngle(from: number, to: number) {
  let delta = ((to - from) % 360 + 540) % 360 - 180
  return delta
}

function warpVelocitySU(warp: number) {
  if (warp <= 0) return 0
  if (warp >= 10) return 9999 * LIGHT_SPEED_SU
  return Math.pow(warp, 10 / 3) * LIGHT_SPEED_SU
}

function warpStopDistanceSU(warp: number) {
  if (warp <= 0) return 0
  return LIGHT_SPEED_SU * (3 / 13) * Math.pow(warp, 13 / 3)
}

function currentVelocitySU() {
  if (telemetry.speed.warp > 0.05) return warpVelocitySU(telemetry.speed.warp)
  return Math.max(0, telemetry.speed.current)
}

function stoppingDistanceSU(speed: number, accel: number) {
  return (speed * speed) / (2 * Math.max(accel, 0.2))
}

function readReportedAccel() {
  const raw = telemetry as SpaceTelemetry & { acceleration?: number; movement?: { acceleration?: number } }
  const value = Number(raw.acceleration ?? raw.movement?.acceleration)
  return Number.isFinite(value) && value > 0.05 ? value : FALLBACK_ACCEL_SU
}

function stopApproachTimer() {
  if (approachTimer) clearInterval(approachTimer)
  approachTimer = undefined
}

function cancelApproach() {
  approachPlan = null
  navOrder.value = null
  commandedYaw = null
  commandedPitch = null
  commandedImpulse = null
  commandedWarp = null
  stopApproachTimer()
}

function alongsideDistanceSU(contact: SensorContact) {
  const type = (contact.type || '').toLowerCase()
  if (type.includes('station') || type.includes('base')) return (contact.radius ?? 0.5) + 0.25
  if (type.includes('planet') || type.includes('moon')) return (contact.radius ?? 0.65) + 0.35
  return (contact.radius ?? 0) + 0.5
}

function contactVelocity(contact: SensorContact): SensorPosition | null {
  if (contact.velocity) return contact.velocity
  if (contact.velocitySU <= 0.05) return { x: 0, y: 0, z: 0 }
  return null
}

function commandHeading(yaw: number, pitch: number) {
  if (
    commandedYaw != null &&
    Math.abs(shortestAngle(commandedYaw, yaw)) < 1 &&
    commandedPitch != null &&
    Math.abs(commandedPitch - pitch) < 1
  ) {
    return
  }
  commandedYaw = yaw
  commandedPitch = pitch
  telemetry.heading.desiredYaw = yaw
  telemetry.heading.desiredPitch = pitch
  sendEnvelope('space.helm.set_heading', { yaw, pitch })
}

function commandImpulse(fraction: number) {
  const impulse = Math.max(0, Math.min(1, fraction))
  if (commandedImpulse != null && Math.abs(commandedImpulse - impulse) < 0.04 && commandedWarp === 0) return
  commandedImpulse = impulse
  commandedWarp = 0
  telemetry.speed.desired = impulse * FULL_IMPULSE_SU
  telemetry.speed.desiredWarp = 0
  telemetry.speed.isWarp = false
  sendEnvelope('space.helm.set_speed', { impulse })
}

function commandWarp(warp: number) {
  const factor = Math.max(0, warp)
  if (commandedWarp != null && Math.abs(commandedWarp - factor) < 0.05) return
  commandedWarp = factor
  commandedImpulse = null
  telemetry.speed.desiredWarp = factor
  telemetry.speed.desired = 0
  sendEnvelope('space.helm.set_warp', { warp: factor })
}

function noteApproachSample() {
  if (!approachPlan) return
  const contact = telemetry.contacts.find((item) => item.entityId === approachPlan?.targetId)
  if (!contact) return
  const now = Date.now()
  const dt = (now - approachPlan.sampleAt) / 1000
  const speed = currentVelocitySU()
  if (dt >= 0.2 && dt <= 3) {
    const changing = Math.abs(telemetry.speed.desired - approachPlan.lastSpeed) > 0.3 || telemetry.speed.desiredWarp > 0
    const dv = Math.abs(speed - approachPlan.lastSpeed)
    if (changing && dv > 0.05) {
      const measured = dv / dt
      if (measured >= 0.2 && measured <= 12) approachPlan.accelSU = measured
    }
  }
  approachPlan.estimatedRange = contact.rangeSU
  approachPlan.sampleAt = now
  approachPlan.lastSpeed = speed
}

function chooseWarp(distance: number) {
  let selected = 0
  for (const warp of [1, 1.5, 2, 2.5, 3, 4]) {
    if (warpStopDistanceSU(warp) * 2.5 < distance) selected = warp
  }
  return selected
}

function finishApproach() {
  commandImpulse(0)
  cancelApproach()
}

function tickIntercept(contact: SensorContact) {
  const speed = currentVelocitySU()
  const velocity = contactVelocity(contact)
  if (speed <= 0.05 || !velocity) return
  const course = solveIntercept(telemetry.position, contact.position, velocity, speed)
  if (!course) return
  commandHeading(course.yaw, course.pitch)
}

function tickApproach() {
  const plan = approachPlan
  if (!plan) return
  const contact = telemetry.contacts.find((item) => item.entityId === plan.targetId)
  if (!contact) {
    cancelApproach()
    return
  }
  if (plan.mode === 'intercept') {
    tickIntercept(contact)
    return
  }
  if (contact.velocitySU > 0.2) {
    cancelApproach()
    return
  }

  const yawError = Math.abs(shortestAngle(telemetry.heading.yaw, contact.bearingYaw))
  const pitchError = Math.abs(telemetry.heading.pitch - contact.bearingPitch)
  const aligned = yawError <= ALIGN_DEGREES && pitchError <= ALIGN_DEGREES

  const dt = Math.min(1.5, Math.max(0, (Date.now() - plan.sampleAt) / 1000))
  const speed = currentVelocitySU()
  let range = plan.estimatedRange
  if (aligned) range -= speed * dt
  const remaining = Math.max(0, range - plan.standoffSU)

  if (speed < 0.2 && remaining <= 0.5) {
    finishApproach()
    return
  }

  if (!aligned) {
    commandHeading(contact.bearingYaw, contact.bearingPitch)
    commandImpulse(0)
    return
  }

  const impulseBrake = stoppingDistanceSU(FULL_IMPULSE_SU, plan.accelSU)
  const warpNow = Math.max(telemetry.speed.warp, telemetry.speed.desiredWarp)
  if (warpNow > 0.05 && remaining <= warpStopDistanceSU(warpNow) * 1.25 + impulseBrake) {
    commandHeading(contact.bearingYaw, contact.bearingPitch)
    commandImpulse(0)
    return
  }

  if (remaining <= stoppingDistanceSU(speed, plan.accelSU) + 0.25) {
    finishApproach()
    return
  }

  commandHeading(contact.bearingYaw, contact.bearingPitch)

  if (remaining > 400) {
    const warp = chooseWarp(remaining)
    if (warp > 0 && remaining > warpStopDistanceSU(warp) * 1.25 + impulseBrake) {
      commandWarp(warp)
      return
    }
  }

  const allowable = Math.min(FULL_IMPULSE_SU, Math.sqrt(2 * plan.accelSU * remaining))
  commandImpulse(allowable / FULL_IMPULSE_SU)
}

function engageNav(mode: NavMode, targetId: string, standoffSU: number, rangeSU: number) {
  stopApproachTimer()
  approachPlan = {
    mode,
    targetId,
    standoffSU,
    estimatedRange: rangeSU,
    sampleAt: Date.now(),
    lastSpeed: currentVelocitySU(),
    accelSU: readReportedAccel()
  }
  navOrder.value = { targetId, mode }
  commandedYaw = null
  commandedPitch = null
  commandedImpulse = null
  commandedWarp = null
  approachTimer = setInterval(tickApproach, 200)
  tickApproach()
}

function startApproach(targetId: string) {
  if (navOrder.value?.mode === 'approach' && navOrder.value.targetId === targetId) {
    finishApproach()
    return
  }
  const contact = telemetry.contacts.find((item) => item.entityId === targetId)
  if (!contact) return
  engageNav('approach', targetId, alongsideDistanceSU(contact), contact.rangeSU)
}

function startIntercept(targetId: string) {
  if (navOrder.value?.mode === 'intercept' && navOrder.value.targetId === targetId) {
    cancelApproach()
    return
  }
  const contact = telemetry.contacts.find((item) => item.entityId === targetId)
  if (!contact) return
  const speed = currentVelocitySU()
  const velocity = contactVelocity(contact)
  if (speed <= 0.05 || !velocity) return
  if (!solveIntercept(telemetry.position, contact.position, velocity, speed)) return
  const replacingApproach = navOrder.value?.mode === 'approach'
  if (replacingApproach) {
    cancelApproach()
    commandImpulse(Math.min(1, speed / FULL_IMPULSE_SU))
  }
  engageNav('intercept', targetId, alongsideDistanceSU(contact), contact.rangeSU)
}

function sendEnvelope(type: string, payload: Record<string, any> = {}) {
  if (window.api && typeof window.api.write === 'function') {
    const envelope = {
      type,
      timestamp: Date.now(),
      payload: {
        shipId: telemetry.shipId || undefined,
        ...payload
      }
    }
    window.api.write(JSON.stringify(envelope) + '\n')
  }
}

export function useSpaceStore() {
  return {
    telemetry,
    berthed,
    navOrder,
    hasActiveTelemetry,
    hudVisible,
    activeStation,
    recentAlerts,
    latestAlert,
    dismissLatestAlert() {
      latestAlert.value = null
    },
    clearAlerts() {
      recentAlerts.value = []
      latestAlert.value = null
    },
    isWarp: computed(() => telemetry.speed.isWarp),
    isShieldsUp: computed(() => telemetry.shields.isRaised),
    lockedTarget: computed(() => {
      if (!telemetry.targetLock) return null
      return telemetry.contacts.find((c) => c.entityId === telemetry.targetLock?.targetId) || null
    }),

    // Commands / Dispatches
    subscribeConsole(station: string = 'all') {
      sendEnvelope('space.subscribe', { station })
    },

    dockWith(targetId: string) {
      berthed.value = { entityId: targetId, mode: 'docked' }
      sendEnvelope('space.helm.dock', { targetId })
    },

    landOn(targetId: string) {
      berthed.value = { entityId: targetId, mode: 'landed' }
      sendEnvelope('space.helm.land', { targetId })
    },

    departBerth() {
      const current = berthed.value
      if (!current) return
      berthed.value = null
      const type = current.mode === 'landed' ? 'space.helm.launch' : 'space.helm.undock'
      sendEnvelope(type, { targetId: current.entityId })
    },

    beginApproach(targetId: string) {
      startApproach(targetId)
    },

    beginIntercept(targetId: string) {
      startIntercept(targetId)
    },

    setHeading(yaw: number, pitch: number = 0) {
      cancelApproach()
      commandedYaw = null
      commandedPitch = null
      commandHeading(yaw, pitch)
    },

    intercept(targetId: string, yaw: number, pitch: number) {
      cancelApproach()
      commandedYaw = null
      commandedPitch = null
      commandHeading(yaw, pitch)
      sendEnvelope('space.helm.intercept', { targetId, yaw, pitch })
    },

    setImpulse(impulse: number) {
      if (navOrder.value?.mode === 'approach') cancelApproach()
      commandedImpulse = null
      commandedWarp = null
      commandImpulse(impulse)
    },

    setWarp(warp: number) {
      if (navOrder.value?.mode === 'approach') cancelApproach()
      commandedWarp = null
      commandedImpulse = null
      commandWarp(warp)
    },

    fullStop() {
      cancelApproach()
      commandedImpulse = null
      commandedWarp = null
      commandImpulse(0)
    },

    setShields(raised: boolean) {
      telemetry.shields.isRaised = raised
      sendEnvelope('space.tactical.set_shields', { raised })
    },

    toggleShields() {
      const nextRaised = !telemetry.shields.isRaised
      telemetry.shields.isRaised = nextRaised
      sendEnvelope('space.tactical.set_shields', { raised: nextRaised })
    },

    lockTarget(targetId: string) {
      sendEnvelope('space.tactical.lock_target', { targetId })
    },

    clearLock() {
      sendEnvelope('space.tactical.lock_target', { targetId: '' })
    },

    fireBeam(beamIndex: number = 0, targetId?: string) {
      const beam = telemetry.weapons.beams.find((item) => item.index === beamIndex)
      if (beam && !beam.ready) return
      markBeamFired(beamIndex)
      sendEnvelope('space.tactical.fire_beam', { beamIndex, targetId })
    },

    fireTorpedo(tubeIndex: number = 0, targetId?: string) {
      const tube = telemetry.weapons.tubes.find((item) => item.index === tubeIndex)
      if (tube && !tube.ready) return
      markTubeFired(tubeIndex)
      sendEnvelope('space.tactical.fire_torpedo', { tubeIndex, targetId })
    },

    allocatePower(channel: string, amount: number) {
      sendEnvelope('space.engineering.allocate', { channel, amount })
    },

    setAlertStatus(status: 'Green' | 'Yellow' | 'Red') {
      telemetry.alertStatus = status
      sendEnvelope('space.alert.set', { status })
    }
  }
}
