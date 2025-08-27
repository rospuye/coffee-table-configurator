// three-scene.js
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

/* ========================================================
   Config / Constants
   ======================================================== */

const CANVAS_SELECTOR = 'canvas.webgl'

const DEFAULT_TOP_WIDTH = 1
const DEFAULT_BASE_HEIGHT = 0.8
const DEFAULT_BEVEL = 0.01
const DEFAULT_BEVEL_HEIGHT = 0.04

const SCALE_MIN = 0.5
const SCALE_MAX = 1.5

/* ========================================================
   Scene state
   ======================================================== */
const canvas = document.querySelector(CANVAS_SELECTOR)
if (!canvas) throw new Error(`Canvas element "${CANVAS_SELECTOR}" not found`)

const scene = new THREE.Scene()
const sizes = { width: window.innerWidth, height: window.innerHeight }
const clock = new THREE.Clock()

/* Camera */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(1, 1, 2)
scene.add(camera)

/* Renderer */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/* Controls */
const orbitControls = new OrbitControls(camera, canvas)
orbitControls.enableDamping = true

/* Transform controls (gizmo) */
const transformControls = new TransformControls(camera, renderer.domElement)
transformControls.setMode('scale')
transformControls.visible = false
transformControls.showX = true
transformControls.showY = false
transformControls.showZ = true
transformControls.setScaleSnap(0.1)

// prevent orbit controls when using transform controls
transformControls.addEventListener('mouseDown', function () {
    orbitControls.enabled = false
});
transformControls.addEventListener('mouseUp', function () {
    orbitControls.enabled = true
});

const transformControlsGizmo = transformControls.getHelper()
scene.add(transformControlsGizmo)

transformControls.setColors('#AEC3B0', '#000000', '#598392', '#EFF6E0', '#124559')

function clampScaleForObject(obj) {
    if (!obj || !obj.scale) return
    // enforce per-axis limits
    obj.scale.x = Math.min(SCALE_MAX, Math.max(SCALE_MIN, obj.scale.x))
    obj.scale.y = Math.min(SCALE_MAX, Math.max(SCALE_MIN, obj.scale.y))
    obj.scale.z = Math.min(SCALE_MAX, Math.max(SCALE_MIN, obj.scale.z))
    // ensure matrices are updated
    obj.updateMatrix()
    obj.updateMatrixWorld(true)
}

// keep the controls from ever exceeding the limits while user is interacting
transformControls.addEventListener('objectChange', () => {
    if (!transformControls.object) return
    if (transformControls.mode === 'scale') {
        clampScaleForObject(transformControls.object)

        // Lock X and Z for the circle tabletop
        if (activeTop && transformControls.object === activeTop && activeTop.name === 'tableTop_circle') {
            activeTop.scale.z = activeTop.scale.x
        }
    }
})


/* Raycaster */
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

/* Loading manager & loaders */
const manager = new THREE.LoadingManager()
const texLoader = new THREE.TextureLoader(manager)
const hdrLoader = new RGBELoader(manager)
const exrLoader = new EXRLoader(manager)

/* Scene objects */
const coffeeTable = new THREE.Group()
let tableTops = {}
let activeTop = null
let tableBase = null
let tableFooter = null

scene.add(coffeeTable)

/* Materials container (populated after loading) */
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

/* ========================================================
   Utility: promisify loaders
   ======================================================== */
function loadTextureAsync(url) {
    return new Promise((resolve, reject) => {
        texLoader.load(url, (tex) => resolve(tex), undefined, reject)
    })
}

function loadEXRAsync(url) {
    return new Promise((resolve, reject) => {
        exrLoader.load(url, (tex) => resolve(tex), undefined, reject)
    })
}

function loadHDRAsync(url) {
    return new Promise((resolve, reject) => {
        hdrLoader.load(url, (tex) => resolve(tex), undefined, reject)
    })
}

/* ========================================================
   PBR texture set loader
   - Returns an object with optional properties:
     { map, aoMap, displacementMap, armMap, normalMap, roughnessMap }
   ======================================================== */
async function loadPBRTextureSet(files = {}) {
    const maps = {}

    // Standard images (diffuse, ao, disp, arm)
    if (files.diff) {
        try {
            const tex = await loadTextureAsync(files.diff)
            tex.encoding = THREE.sRGBEncoding
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            maps.map = tex
        } catch (e) { /* ignore */ }
    }

    if (files.ao) {
        try {
            const tex = await loadTextureAsync(files.ao)
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            maps.aoMap = tex
        } catch (e) { /* ignore */ }
    }

    if (files.disp) {
        try {
            const tex = await loadTextureAsync(files.disp)
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            maps.displacementMap = tex
        } catch (e) { /* ignore */ }
    }

    if (files.arm) {
        try {
            const tex = await loadTextureAsync(files.arm)
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            maps.armMap = tex
        } catch (e) { /* ignore */ }
    }

    // EXR maps (normal + roughness)
    if (files.normalEXR) {
        try {
            const exr = await loadEXRAsync(files.normalEXR)
            exr.encoding = THREE.LinearEncoding
            exr.flipY = false
            maps.normalMap = exr
        } catch (e) { /* ignore */ }
    }

    if (files.roughEXR) {
        try {
            const exr = await loadEXRAsync(files.roughEXR)
            exr.encoding = THREE.LinearEncoding
            exr.flipY = false
            maps.roughnessMap = exr
        } catch (e) { /* ignore */ }
    }

    return maps
}

/* ========================================================
   Geometry helpers
   ======================================================== */
function ensureBufferGeometry(geom) {
    if (!geom) return geom
    if (geom.isBufferGeometry) return geom
    // fallback - if fromGeometry exists convert (older three.js)
    if (typeof THREE.BufferGeometry.prototype.fromGeometry === 'function' && geom.isGeometry) {
        return new THREE.BufferGeometry().fromGeometry(geom)
    }
    return geom
}

/**
 * Apply planar UVs projecting onto XZ plane (useful for tabletop)
 * mode: 'planar' | 'polarForCircle'
 */
function applyPlanarUVs(geom, { mode = 'planar', padding = 0 } = {}) {
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
            const angle = Math.atan2(z, x) // -PI..PI
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
    // copy uv -> uv2 for AO
    geom.setAttribute('uv2', new THREE.BufferAttribute(uv.slice(), 2))

    if (!geom.attributes.normal) geom.computeVertexNormals()
}

/* ========================================================
   Table creation (top, base, footer)
   ======================================================== */
function makeTableTopGeometry({ shape = 'circle', topWidth = DEFAULT_TOP_WIDTH, bevel = DEFAULT_BEVEL, bevelHeight = DEFAULT_BEVEL_HEIGHT } = {}) {
    let geom = null

    const centerExtrude = (geomIn, depth) => {
        // extrude produces depth along +Z; move and rotate to get thickness along Y
        geomIn.translate(0, 0, -depth / 2)
        geomIn.rotateX(-Math.PI / 2)
    }

    switch ((shape || 'circle').toLowerCase()) {
        case 'rectangle': {
            const side = topWidth * 2
            const shapePath = new THREE.Shape()
            shapePath.moveTo(-side / 2, -side / 2)
            shapePath.lineTo(side / 2, -side / 2)
            shapePath.lineTo(side / 2, side / 2)
            shapePath.lineTo(-side / 2, side / 2)
            shapePath.closePath()

            geom = new THREE.ExtrudeGeometry(shapePath, { depth: bevelHeight, bevelEnabled: false, curveSegments: 8 })
            centerExtrude(geom, bevelHeight)
            break
        }

        case 'ellipse': {
            const rx = topWidth * 1.6
            const ry = topWidth * 1.0
            const shapePath = new THREE.Shape()
            shapePath.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0)
            geom = new THREE.ExtrudeGeometry(shapePath, { depth: bevelHeight, bevelEnabled: false, curveSegments: 64 })
            centerExtrude(geom, bevelHeight)
            break
        }

        case 'circle':
        default: {
            geom = new THREE.CylinderGeometry(topWidth, topWidth - bevel, bevelHeight, 64)
            break
        }
    }

    geom = ensureBufferGeometry(geom)
    applyPlanarUVs(geom, { mode: 'planar' })
    return geom
}

function createTable({ topWidth = DEFAULT_TOP_WIDTH, baseHeight = DEFAULT_BASE_HEIGHT, baseTopWidth = 0.45, baseBottomWidth = 0.7, bevel = DEFAULT_BEVEL, bevelHeight = DEFAULT_BEVEL_HEIGHT } = {}) {
    const defaultMaterial = tableMaterials.wood || new THREE.MeshStandardMaterial({ color: 0x7f7f7f })

    coffeeTable.clear()
    tableTops = {}

    const shapes = ['circle', 'ellipse', 'rectangle']
    shapes.forEach((shape) => {
        const geom = makeTableTopGeometry({ shape, topWidth, bevel, bevelHeight })
        const mesh = new THREE.Mesh(geom, defaultMaterial)
        mesh.name = `tableTop_${shape}`
        mesh.position.y = (baseHeight + bevelHeight) / 2
        mesh.visible = (shape === 'ellipse') // default visible
        tableTops[shape] = mesh
        coffeeTable.add(mesh)
    })
    activeTop = tableTops.ellipse

    const tableBaseGeom = new THREE.CylinderGeometry(baseTopWidth, baseBottomWidth, baseHeight, 64)
    tableBaseGeom.computeVertexNormals()
    tableBase = new THREE.Mesh(tableBaseGeom, tableMaterials.plaster || defaultMaterial)

    const tableFooterGeom = new THREE.CylinderGeometry(baseBottomWidth, baseBottomWidth - bevel, bevelHeight, 64)
    tableFooter = new THREE.Mesh(tableFooterGeom, tableBase.material)
    tableFooter.position.y = -(baseHeight + bevelHeight) / 2

    coffeeTable.add(tableBase)
    coffeeTable.add(tableFooter)
}


/* ========================================================
   Event listeners: resize, pointer/pick, keyboard
   ======================================================== */
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

let pointerDownTime = 0
let pointerDownPos = { x: 0, y: 0 }

canvas.addEventListener('pointerdown', (ev) => {
    pointerDownTime = performance.now()
    pointerDownPos = { x: ev.clientX, y: ev.clientY }
})

canvas.addEventListener('pointerup', (ev) => {
    // small click threshold to avoid drag selections
    const pointerUpTime = performance.now()
    const dt = pointerUpTime - pointerDownTime
    const dx = ev.clientX - pointerDownPos.x
    const dy = ev.clientY - pointerDownPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (dt >= 200 || distance >= 6) return

    // compute normalized pointer coords relative to canvas
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1

    // pick only tableTop (if present)
    if (!activeTop) {
        // nothing to pick
        if (!transformControls.dragging) detachTransform()
        return
    }

    raycaster.setFromCamera(pointer, camera)

    const intersect = raycaster.intersectObject(activeTop, true)
    if (intersect.length > 0) {
        attachToObject(intersect[0].object)
    } else {
        if (!transformControls.dragging) detachTransform()
    }
})

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') detachTransform()
})

/* ========================================================
   Transform helpers
   ======================================================== */
function attachToObject(object) {
    transformControls.attach(object)
    transformControls.setMode('scale')

    // If it's the circle tabletop: show only X axis (but sync Z)
    if (activeTop && object === activeTop && activeTop.name === 'tableTop_circle') {
        transformControls.showX = true
        transformControls.showY = false
        transformControls.showZ = false
    } else {
        // For other shapes, default X/Z
        transformControls.showX = true
        transformControls.showY = false
        transformControls.showZ = true
    }

    transformControls.visible = true
}


function detachTransform() {
    if (transformControls.object) transformControls.detach()
    transformControls.visible = false
}

/* ========================================================
   Lighting & background
   ======================================================== */
function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.3)
    scene.add(ambient)

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3)
    scene.add(hemi)

    const dir1 = new THREE.DirectionalLight(0xfff4c9, 0.5)
    dir1.position.set(1, 1, 0)
    scene.add(dir1)

    const dir2 = new THREE.DirectionalLight(0xffffff, 0.5)
    dir2.position.set(-1, -1, 0)
    scene.add(dir2)
}

/* ========================================================
   Public API functions (exports)
   - setTableTopShape(shape)
   - setTableTopMaterial(type)
   - setBaseMaterial(type)
   ======================================================== */
export function setTableTopShape(type) {
    if (!tableTops || !tableTops[type]) return
    Object.keys(tableTops).forEach(shape => {
        tableTops[shape].visible = (shape === type)
    })
    activeTop = tableTops[type]

    // detach and re-attach transform controls
    if (transformControls.object) {
        detachTransform()
        attachToObject(activeTop)
    }
}

export function setTableTopMaterial(type) {
    if (!tableMaterials[type] || !tableTops) return
    Object.values(tableTops).forEach(mesh => {
        mesh.material = tableMaterials[type]
        mesh.material.needsUpdate = true
    })
}


export function setBaseMaterial(type) {
    if (!tableMaterials[type] || !tableBase || !tableFooter) return
    tableBase.material = tableMaterials[type]
    tableBase.material.needsUpdate = true
    tableFooter.material = tableMaterials[type]
    tableFooter.material.needsUpdate = true
}

/* ========================================================
   Init: load assets, create materials, set up scene
   ======================================================== */
export async function init() {

    // background texture
    try {
        const bg = await loadTextureAsync('textures/graph_paper.jpg')
        bg.wrapS = bg.wrapT = THREE.RepeatWrapping
        bg.repeat.set(3, 3)
        scene.background = bg
    } catch (e) {
        // ignore missing background
    }

    setupLights()

    // HDR environment
    try {
        const hdrTex = await loadHDRAsync('textures/pine_attic_4k.hdr')
        hdrTex.mapping = THREE.EquirectangularReflectionMapping
        hdrTex.intensity = 0.5
        scene.environment = hdrTex
    } catch (e) {
        // ignore if missing
    }

    // ---- Prepare texture sets (wood + plaster)
    const makeTextureFiles = (basePath, baseName) => ({
        ao: `${basePath}${baseName}_ao_4k.jpg`,
        arm: `${basePath}${baseName}_arm_4k.jpg`,
        diff: `${basePath}${baseName}_diff_4k.jpg`,
        disp: `${basePath}${baseName}_disp_4k.png`,
        normalEXR: `${basePath}${baseName}_nor_gl_4k.exr`,
        roughEXR: `${basePath}${baseName}_rough_4k.exr`,
    })

    const textureDefinitions = {
        wood: { basePath: '/textures/wood_table/', baseName: 'wood_table_001' },
        plaster: { basePath: '/textures/plaster_wall/', baseName: 'painted_plaster_wall' }
    }

    // load both sets in parallel, but tolerate failures
    const woodFiles = makeTextureFiles(textureDefinitions.wood.basePath, textureDefinitions.wood.baseName)
    const plasterFiles = makeTextureFiles(textureDefinitions.plaster.basePath, textureDefinitions.plaster.baseName)

    const [woodMaps, plasterMaps] = await Promise.allSettled([
        loadPBRTextureSet(woodFiles),
        loadPBRTextureSet(plasterFiles)
    ])

    // Construct materials using loaded maps (fallbacks if missing)
    const buildMaterial = (maps = {}) => {
        const mat = new THREE.MeshStandardMaterial({
            map: maps.map || null,
            aoMap: maps.aoMap || maps.armMap || null,
            normalMap: maps.normalMap || null,
            roughnessMap: maps.roughnessMap || null,
            displacementMap: maps.displacementMap || null,
            metalness: 0.0,
            roughness: 1.0,
            displacementScale: 0,
            aoMapIntensity: 1.0
        })
        if (mat.map) mat.map.encoding = THREE.sRGBEncoding
        if (mat.normalMap) mat.normalMap.flipY = false
        return mat
    }

    tableMaterials.wood = buildMaterial(woodMaps.status === 'fulfilled' ? woodMaps.value : {})
    tableMaterials.plaster = buildMaterial(plasterMaps.status === 'fulfilled' ? plasterMaps.value : {})

    // create initial table
    createTable()

    // apply initial default materials if available
    if (tableMaterials.wood) {
        // iterate all tops
        Object.values(tableTops).forEach(mesh => {
            mesh.material = tableMaterials.wood
            mesh.material.needsUpdate = true
        })
        // tableTop.material = tableMaterials.wood
        // tableTop.material.needsUpdate = true
    }
    if (tableMaterials.plaster) {
        tableBase.material = tableMaterials.plaster
        tableFooter.material = tableMaterials.plaster
        tableBase.material.needsUpdate = true
        tableFooter.material.needsUpdate = true
    }

    // Start render loop
    tick()
}

/* ========================================================
   Animation
   ======================================================== */
function tick() {
    const elapsed = clock.getElapsedTime()
    orbitControls.update()
    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

/* ========================================================
   Run init automatically
   ======================================================== */
init().catch((err) => {
    // non-fatal in dev: log but continue
    console.error('Initialization error:', err)
})
