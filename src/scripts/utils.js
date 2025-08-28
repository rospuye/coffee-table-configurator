import * as THREE from 'three'

export function ensureBufferGeometry(geom) {
    if (!geom) return geom
    if (geom.isBufferGeometry) return geom
    if (typeof THREE.BufferGeometry.prototype.fromGeometry === 'function' && geom.isGeometry) {
        return new THREE.BufferGeometry().fromGeometry(geom)
    }
    return geom
}

export function applyPlanarUVs(geom, { mode = 'planar', padding = 0 } = {}) {
    geom = ensureBufferGeometry(geom)
    const pos = geom.attributes.position
    if (!pos) return

    geom.computeBoundingBox()
    const bbox = geom.boundingBox
    const minX = bbox.min.x
    const maxX = bbox.max.x
    const minZ = bbox.min.z
    const maxZ = bbox.max.z
    const spanX = Math.max(maxX - minX, 1e-6)
    const spanZ = Math.max(maxZ - minZ, 1e-6)

    let maxRadius = 0
    if (mode === 'polarForCircle') {
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i)
            const z = pos.getZ(i)
            const r = Math.sqrt(x * x + z * z)
            if (r > maxRadius) maxRadius = r
        }
        maxRadius = Math.max(maxRadius, 1e-6)
    }

    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const z = pos.getZ(i)

        if (mode === 'polarForCircle') {
            const angle = Math.atan2(z, x)
            const u = 0.5 + (angle / (2 * Math.PI))
            const r = Math.sqrt(x * x + z * z) / maxRadius
            const v = r
            uv[i * 2] = (u - 0.5) * (1 - padding) + 0.5
            uv[i * 2 + 1] = v * (1 - padding) + padding * 0.5
        } else {
            const u = (x - minX) / spanX
            const v = (z - minZ) / spanZ
            uv[i * 2] = u * (1 - padding) + padding * 0.5
            uv[i * 2 + 1] = v * (1 - padding) + padding * 0.5
        }
    }

    geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    geom.setAttribute('uv2', new THREE.BufferAttribute(uv.slice(), 2))

    if (!geom.attributes.normal) geom.computeVertexNormals()
}

// clamp scale (original logic kept)
export function clampScaleForObject(obj) {
    if (!obj || !obj.scale) return

    const TOP_SCALE_MIN = 0.6
    const TOP_SCALE_MAX = 1.5
    const BASE_SCALE_MIN = 0.8
    const BASE_SCALE_MAX = 1.2

    obj.scale.x = Math.min((obj.name && obj.name.startsWith('tableTop_') ? TOP_SCALE_MAX : BASE_SCALE_MAX),
        Math.max((obj.name && obj.name.startsWith('tableTop_') ? TOP_SCALE_MIN : BASE_SCALE_MIN), obj.scale.x))
    obj.scale.y = Math.min((obj.name && obj.name.startsWith('tableTop_') ? TOP_SCALE_MAX : BASE_SCALE_MAX),
        Math.max((obj.name && obj.name.startsWith('tableTop_') ? TOP_SCALE_MIN : BASE_SCALE_MIN), obj.scale.y))
    obj.scale.z = Math.min((obj.name && obj.name.startsWith('tableTop_') ? TOP_SCALE_MAX : BASE_SCALE_MAX),
        Math.max((obj.name && obj.name.startsWith('tableTop_') ? TOP_SCALE_MIN : BASE_SCALE_MIN), obj.scale.z))

    obj.updateMatrix()
    obj.updateMatrixWorld(true)
}