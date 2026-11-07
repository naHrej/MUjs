import type { SensorPosition } from '../../stores/useSpaceStore'

export interface InterceptCourse {
  yaw: number
  pitch: number
}

const LIGHT_SPEED_SU = 29.9792458

export function warpToVelocitySU(warpFactor: number): number {
  if (warpFactor <= 0) return 0
  if (warpFactor >= 10) return 9999 * LIGHT_SPEED_SU
  return Math.pow(warpFactor, 10 / 3) * LIGHT_SPEED_SU
}

export function bearingBetween(origin: SensorPosition, target: SensorPosition): InterceptCourse {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const dz = target.z - origin.z
  const distanceXY = Math.hypot(dx, dy)
  let yaw = (Math.atan2(dy, dx) * 180) / Math.PI
  if (yaw < 0) yaw += 360
  const pitch = (Math.atan2(dz, distanceXY) * 180) / Math.PI
  return { yaw, pitch }
}

/**
 * Constant-speed intercept. Returns the heading that reaches the target's
 * future position, or null when no positive-time solution exists.
 */
export function solveIntercept(
  origin: SensorPosition,
  target: SensorPosition,
  targetVelocity: SensorPosition,
  pursuerSpeed: number
): InterceptCourse | null {
  if (pursuerSpeed <= 0.05) return null

  const rx = target.x - origin.x
  const ry = target.y - origin.y
  const rz = target.z - origin.z
  const vx = targetVelocity.x
  const vy = targetVelocity.y
  const vz = targetVelocity.z

  const a = vx * vx + vy * vy + vz * vz - pursuerSpeed * pursuerSpeed
  const b = 2 * (rx * vx + ry * vy + rz * vz)
  const c = rx * rx + ry * ry + rz * rz

  let time: number | null = null
  if (Math.abs(a) < 1e-8) {
    if (Math.abs(b) < 1e-8) return null
    const root = -c / b
    if (root > 0.05) time = root
  } else {
    const discriminant = b * b - 4 * a * c
    if (discriminant < 0) return null
    const root = Math.sqrt(discriminant)
    const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)]
      .filter((value) => value > 0.05)
      .sort((left, right) => left - right)
    time = candidates[0] ?? null
  }

  if (time == null) return null

  return bearingBetween(origin, {
    x: target.x + vx * time,
    y: target.y + vy * time,
    z: target.z + vz * time
  })
}
