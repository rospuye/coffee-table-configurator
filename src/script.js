import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

// --- loaders
const manager = new THREE.LoadingManager()
const texLoader = new THREE.TextureLoader(manager)
const exrLoader = new EXRLoader(manager)
const hdrLoader = new RGBELoader(manager)

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 1
camera.position.y = 1
camera.position.z = 2
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// add texture as scene background
const backgroundTexture = texLoader.load('textures/graph_paper.jpg')
scene.background = backgroundTexture
backgroundTexture.wrapS = THREE.RepeatWrapping
backgroundTexture.wrapT = THREE.RepeatWrapping
backgroundTexture.repeat.set(3, 3)

/**
 * Lighting
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
scene.add(ambientLight)

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3)
scene.add(hemisphereLight)

const directionalLight = new THREE.DirectionalLight(0xfff4c9, 0.5)
directionalLight.position.set(1, 1, 0)
scene.add(directionalLight)

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
directionalLight2.position.set(-1, -1, 0)
scene.add(directionalLight2)


// HDR texture
hdrLoader.load('textures/pine_attic_4k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.intensity = 0.5
    scene.environment = texture
})


/**
 * Coffee table
 */

const topWidth = 1
const baseHeight = 0.8
const baseTopWidth = 0.45
const baseBottomWidth = 0.7
const bevel = 0.01
const bevelHeight = 0.04

const coffeeTable = new THREE.Group()

const tableTopGeom = new THREE.CylinderGeometry(topWidth, topWidth - bevel, bevelHeight, 64)
const tableTopMat = new THREE.MeshStandardMaterial({ color: 0x7f7f7f, roughness: 0.5, metalness: 0.1 })
const tableTop = new THREE.Mesh(tableTopGeom, tableTopMat)
tableTop.name = "tableTop"
tableTop.position.y = (baseHeight + bevelHeight) / 2

const tableBaseGeom = new THREE.CylinderGeometry(baseTopWidth, baseBottomWidth, baseHeight, 64)
const tableBaseMat = new THREE.MeshStandardMaterial({ color: 0x7f7f7f, roughness: 0.5, metalness: 0.1 })
const tableBase = new THREE.Mesh(tableBaseGeom, tableBaseMat)

const tableFooterGeom = new THREE.CylinderGeometry(baseBottomWidth, baseBottomWidth - bevel, bevelHeight, 64)
const tableFooter = new THREE.Mesh(tableFooterGeom, tableBaseMat)
tableFooter.position.y = - (baseHeight + bevelHeight) / 2

coffeeTable.add(tableTop)
coffeeTable.add(tableBase)
coffeeTable.add(tableFooter)
scene.add(coffeeTable)


const makeTextureFiles = (basePath, baseName) => ({
    ao: `${basePath}${baseName}_ao_4k.jpg`,
    arm: `${basePath}${baseName}_arm_4k.jpg`,
    diff: `${basePath}${baseName}_diff_4k.jpg`,
    disp: `${basePath}${baseName}_disp_4k.png`,
    normalEXR: `${basePath}${baseName}_nor_gl_4k.exr`,
    roughEXR: `${basePath}${baseName}_rough_4k.exr`,
})

/**
 * Load PBR texture set (standard images via texLoader + EXR via exrLoader).
 * Returns an object that will be populated as textures load.
 */
function loadPBRTextureSet(files, { texLoader, exrLoader } = {}) {
    if (!texLoader || !exrLoader) {
        throw new Error('Both texLoader and exrLoader must be provided')
    }

    const maps = {}

    const repeat = THREE.RepeatWrapping

    // Standard (jpg/png) textures
    texLoader.load(files.diff, tex => {
        tex.encoding = THREE.sRGBEncoding
        tex.wrapS = tex.wrapT = repeat
        maps.map = tex
    })
    texLoader.load(files.ao, tex => {
        tex.wrapS = tex.wrapT = repeat
        maps.aoMap = tex
    })
    texLoader.load(files.disp, tex => {
        tex.wrapS = tex.wrapT = repeat
        maps.displacementMap = tex
    })
    // 'arm' in your original code — keep name but store as armMap for clarity
    texLoader.load(files.arm, tex => {
        tex.wrapS = tex.wrapT = repeat
        maps.armMap = tex
    })

    // EXR maps (linear encoding, no flip)
    exrLoader.load(files.normalEXR, tex => {
        tex.encoding = THREE.LinearEncoding
        tex.flipY = false
        maps.normalMap = tex
    })
    exrLoader.load(files.roughEXR, tex => {
        tex.encoding = THREE.LinearEncoding
        tex.flipY = false
        maps.roughnessMap = tex
    })

    return maps
}

// --- Define the two sets (wood + plaster)
const textureDefinitions = {
    wood: {
        basePath: '/textures/wood_table/',
        baseName: 'wood_table_001'
    },
    plaster: {
        basePath: '/textures/plaster_wall/',
        baseName: 'painted_plaster_wall'
    }
}

// Load both sets and keep references to the map objects
const woodTextureFiles = makeTextureFiles(textureDefinitions.wood.basePath, textureDefinitions.wood.baseName)
const plasterTextureFiles = makeTextureFiles(textureDefinitions.plaster.basePath, textureDefinitions.plaster.baseName)

const woodTextureMaps = loadPBRTextureSet(woodTextureFiles, { texLoader, exrLoader })
const plasterTextureMaps = loadPBRTextureSet(plasterTextureFiles, { texLoader, exrLoader })

const tableMaterials = {
    glass: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        roughness: 0.1,
        metalness: 0.1
    }),
    wood: null,
    plaster: null
}

// when all loaded, create material and assign it
manager.onLoad = () => {
    const geom = tableTop.geometry
    if (!geom.attributes.uv2) {
        geom.setAttribute('uv2', new THREE.BufferAttribute(geom.attributes.uv.array.slice(), 2))
    }

    const woodMaterial = new THREE.MeshStandardMaterial({
        map: woodTextureMaps.map || null,
        aoMap: woodTextureMaps.aoMap || woodTextureMaps.arm || null,
        normalMap: woodTextureMaps.normalMap || null,
        roughnessMap: woodTextureMaps.roughnessMap || woodTextureMaps.arm || null,
        displacementMap: woodTextureMaps.displacementMap || null,
        metalness: 0.0,
        roughness: 1.0,
        displacementScale: 0,
        aoMapIntensity: 1.0
    })

    const plasterMaterial = new THREE.MeshStandardMaterial({
        map: plasterTextureMaps.map || null,
        aoMap: plasterTextureMaps.aoMap || plasterTextureMaps.arm || null,
        normalMap: plasterTextureMaps.normalMap || null,
        roughnessMap: plasterTextureMaps.roughnessMap || plasterTextureMaps.arm || null,
        displacementMap: plasterTextureMaps.displacementMap || null,
        metalness: 0.0,
        roughness: 1.0,
        displacementScale: 0,
        aoMapIntensity: 1.0
    })

    if (woodMaterial.map) woodMaterial.map.encoding = THREE.sRGBEncoding
    if (woodMaterial.normalMap) woodMaterial.normalMap.flipY = false

    if (plasterMaterial.map) plasterMaterial.map.encoding = THREE.sRGBEncoding
    if (plasterMaterial.normalMap) plasterMaterial.normalMap.flipY = false


    tableMaterials.wood = woodMaterial
    tableMaterials.plaster = plasterMaterial

    tableTop.material = tableMaterials.wood
    tableTop.material.needsUpdate = true

    tableBase.material = plasterMaterial
    tableBase.material.needsUpdate = true

    tableFooter.material = plasterMaterial
    tableFooter.material.needsUpdate = true
}

export function setTableTopMaterial(type) {
    if (!tableMaterials[type]) return
    tableTop.material = tableMaterials[type]
    tableTop.material.needsUpdate = true
}

export function setBaseMaterial(type) {
    if (!tableMaterials[type]) return
    tableBase.material = tableMaterials[type]
    tableBase.material.needsUpdate = true
    tableFooter.material = tableMaterials[type]
    tableFooter.material.needsUpdate = true
}

// helper: ensure we are working with a BufferGeometry
function ensureBufferGeometry(geom) {
    if (!geom) return geom
    if (geom.isBufferGeometry) return geom
    // older three.js had Geometry -> convert if available
    if (typeof THREE.BufferGeometry.prototype.fromGeometry === 'function' && geom.isGeometry) {
        return new THREE.BufferGeometry().fromGeometry(geom)
    }
    return geom
}

/**
 * Apply planar UVs by projecting onto the XZ plane.
 * - geom: BufferGeometry (or Geometry)
 * - options:
 *     mode: 'planar' (default) | 'polarForCircle'  // polar useful for circle shape
 *     padding: number (optional, leave 0)
 */
function applyPlanarUVs(geom, { mode = 'planar', padding = 0 } = {}) {
    geom = ensureBufferGeometry(geom)
    const pos = geom.attributes.position
    if (!pos) return

    // ensure bounding box
    geom.computeBoundingBox()
    const bbox = geom.boundingBox

    // we'll project onto XZ plane (Y is thickness)
    const minX = bbox.min.x
    const maxX = bbox.max.x
    const minZ = bbox.min.z
    const maxZ = bbox.max.z
    const spanX = Math.max(maxX - minX, 1e-6)
    const spanZ = Math.max(maxZ - minZ, 1e-6)

    // For polar mode we need the max radius
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
            // angle -> u, radius -> v
            const angle = Math.atan2(z, x) // -PI..PI
            const u = 0.5 + (angle / (2 * Math.PI)) // 0..1 wrapped by angle
            const r = Math.sqrt(x * x + z * z) / maxRadius // 0..1 radius
            const v = r
            // add optional padding by scaling towards 0.5
            uv[i * 2] = (u - 0.5) * (1 - padding) + 0.5
            uv[i * 2 + 1] = v * (1 - padding) + padding * 0.5
        } else {
            // planar projection XZ -> (u,v)
            const u = (x - minX) / spanX
            const v = (z - minZ) / spanZ
            uv[i * 2] = u * (1 - padding) + padding * 0.5
            uv[i * 2 + 1] = v * (1 - padding) + padding * 0.5
        }
    }

    geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    // copy uv -> uv2 for AO maps
    geom.setAttribute('uv2', new THREE.BufferAttribute(uv.slice(), 2))

    // ensure normals are present
    if (!geom.attributes.normal) geom.computeVertexNormals()
}

/**
 * Set the table top shape and correctly generate UVs so materials look right.
 * shapes: 'circle' (default), 'square', 'oval'
 */
export function setTableTopShape(type) {
    const oldGeom = tableTop.geometry
    const currentMaterial = tableTop.material
    const savedName = tableTop.name
    const savedPos = tableTop.position.clone()
    const savedRot = tableTop.rotation.clone()
    const savedScale = tableTop.scale.clone()

    let newGeom

    // helper used earlier: align extruded z-depth to Y axis
    const centerExtrude = (geom, depth) => {
        // extrude produces depth along +Z; move and rotate to get thickness along Y
        geom.translate(0, 0, -depth / 2)
        geom.rotateX(-Math.PI / 2)
    }

    switch ((type || 'circle').toLowerCase()) {
        case 'square': {
            const side = topWidth * 2
            const w = side, h = side
            const shape = new THREE.Shape()
            shape.moveTo(-w / 2, -h / 2)
            shape.lineTo(w / 2, -h / 2)
            shape.lineTo(w / 2, h / 2)
            shape.lineTo(-w / 2, h / 2)
            shape.closePath()

            const extrudeSettings = { depth: bevelHeight, bevelEnabled: false, curveSegments: 8 }
            newGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings)
            centerExtrude(newGeom, bevelHeight)
            break
        }
        case 'oval': {
            // create ellipse shape (XZ radii)
            const rx = topWidth * 1.6
            const ry = topWidth * 1.0
            const shape = new THREE.Shape()
            shape.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0)

            const extrudeSettings = { depth: bevelHeight, bevelEnabled: false, curveSegments: 64 }
            newGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings)
            centerExtrude(newGeom, bevelHeight)
            break
        }
        case 'circle':
        default: {
            newGeom = new THREE.CylinderGeometry(topWidth, topWidth - bevel, bevelHeight, 64)
            break
        }
    }

    if (!newGeom) return

    // convert to BufferGeometry if necessary
    newGeom = ensureBufferGeometry(newGeom)

    // Apply UV mapping: use planar XZ projection so textures align predictably
    applyPlanarUVs(newGeom, { mode: 'planar' })

    // ensure normals
    if (!newGeom.attributes.normal) newGeom.computeVertexNormals()

    // replace geometry and reapply material
    tableTop.geometry = newGeom
    tableTop.material = currentMaterial
    tableTop.material.needsUpdate = true

    // restore transforms/properties
    tableTop.name = savedName
    tableTop.position.copy(savedPos)
    tableTop.rotation.copy(savedRot)
    tableTop.scale.copy(savedScale)

    // dispose old geometry to avoid leaks
    try { if (oldGeom) oldGeom.dispose() } catch (e) { /* ignore */ }
}


/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()