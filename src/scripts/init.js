import * as THREE from 'three'
import { createScene } from './scene.js'
import { createControls } from './controls.js'
import { createLoaders } from './loaders.js'
import { loadPBRTextureSet } from './pbr.js'
import { tableMaterials, buildMaterial } from './materials.js'
import { createTable, coffeeTable } from './table.js'
import { resetTransformControls } from './controls.js'

// UI
const loadingScreen = document.getElementById('loading-screen')

const manager = new THREE.LoadingManager()

// --- Progress tracker for operations that LoadingManager doesn't see ---
let trackedTotal = 0
let trackedDone = 0
let managerDone = false
let managerItemsLoaded = 0
let managerItemsTotal = 0
let trackedSchedulingFinished = false

function finishLoading() {
    loadingScreen.classList.add('hidden')
}

function checkFinishConditions() {
    if (!managerDone) return
    if (!trackedSchedulingFinished) return
    if (trackedDone >= trackedTotal) finishLoading()
}

function track(promise, label) {
    trackedTotal++
    return promise.finally(() => {
        trackedDone++
        checkFinishConditions()
    })
}

// Hook manager progress/load
manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    managerItemsLoaded = itemsLoaded
    managerItemsTotal = itemsTotal
}

manager.onLoad = () => {
    managerDone = true
    checkFinishConditions()
}


// Exports so other modules can access transform controls
let clock = null
let orbitControls = null
let renderer = null
let scene = null
let camera = null
export let transformControls = null
let transformHelper = null
let isShiftPressed = false

window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') isShiftPressed = true
    if (e.key === 'Escape') {
        if (transformControls && transformControls.object) transformControls.detach()
        if (transformControls) transformControls.visible = false
    }
})

window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') isShiftPressed = false
})

function fixTextureSampling(tex) {
    if (!tex) return;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.needsUpdate = true;
}


export async function init() {
    const scenePack = createScene('canvas.webgl')
    scene = scenePack.scene
    camera = scenePack.camera
    renderer = scenePack.renderer
    const canvas = scenePack.canvas

    clock = new THREE.Clock()

    // controls
    const ctrl = createControls(camera, renderer.domElement, canvas)
    orbitControls = ctrl.orbitControls
    transformControls = ctrl.transformControls
    transformHelper = ctrl.transformHelper

    // add transform helper to scene
    scene.add(transformHelper)

    // create loaders bound to the manager
    const { loadTextureAsync, loadHDRAsync, loadEXRAsync } = createLoaders(manager)

    // background (track this load because we want to wait for decoding & texture setup)
    try {
        const bgPromise = loadTextureAsync('textures/graph_paper.jpg')
        const bg = await track(bgPromise, 'bgTexture')
        bg.wrapS = bg.wrapT = THREE.RepeatWrapping
        bg.repeat.set(3, 3)
        scene.background = bg
    } catch (e) {
        console.warn('Failed to load background texture', e)
    }

    // lights
    const ambient = new THREE.AmbientLight(0xffffff, 1)
    scene.add(ambient)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1)
    scene.add(hemi)
    const dir1 = new THREE.DirectionalLight(0xfff4c9, 0.5)
    dir1.position.set(1, 1, 0)
    scene.add(dir1)
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.5)
    dir2.position.set(-1, -1, 0)
    scene.add(dir2)

    // HDR environment (track to ensure decoding finishes before hiding the loading UI)
    try {
        const hdrPromise = loadHDRAsync('textures/pine_attic_4k.hdr')
        const hdrTex = await track(hdrPromise, 'hdrEnv')
        hdrTex.mapping = THREE.EquirectangularReflectionMapping
        scene.environment = hdrTex
        scene.environmentIntensity = 0.4;
    } catch (e) {
        console.warn('Failed to load HDR environment', e)
    }

    // --- PBR texture sets ---
    const makeTextureFiles = (basePath, baseName) => ({
        ao: `${basePath}${baseName}_ao_1k.jpg`,
        arm: `${basePath}${baseName}_arm_1k.jpg`,
        diff: `${basePath}${baseName}_diff_1k.jpg`,
        disp: `${basePath}${baseName}_disp_1k.png`,
        normalEXR: `${basePath}${baseName}_nor_gl_1k.exr`,
        roughEXR: `${basePath}${baseName}_rough_1k.exr`,
    })

    const textureDefinitions = {
        wood: { basePath: '/textures/wood_table/', baseName: 'wood_table_001' },
        plaster: { basePath: '/textures/plastered_wall/', baseName: 'plastered_wall_03' }
    }

    const woodFiles = makeTextureFiles(textureDefinitions.wood.basePath, textureDefinitions.wood.baseName)
    const plasterFiles = makeTextureFiles(textureDefinitions.plaster.basePath, textureDefinitions.plaster.baseName)

    const woodPbrPromise = loadPBRTextureSet(woodFiles, loadTextureAsync, loadEXRAsync, manager)
    const plasterPbrPromise = loadPBRTextureSet(plasterFiles, loadTextureAsync, loadEXRAsync, manager)

    const [woodMapsRes, plasterMapsRes] = await Promise.allSettled([
        track(woodPbrPromise, 'woodPBR'),
        track(plasterPbrPromise, 'plasterPBR')
    ])

    // tableMaterials.wood = buildMaterial(woodMapsRes.status === 'fulfilled' ? woodMapsRes.value : {})
    // tableMaterials.plaster = buildMaterial(plasterMapsRes.status === 'fulfilled' ? plasterMapsRes.value : {})

    const woodMaps = woodMapsRes.status === 'fulfilled' ? woodMapsRes.value : {}
    const plasterMaps = plasterMapsRes.status === 'fulfilled' ? plasterMapsRes.value : {}

    // apply sampling fixes BEFORE building materials
    Object.entries(woodMaps).forEach(([k, tex]) => fixTextureSampling(tex, k))
    Object.entries(plasterMaps).forEach(([k, tex]) => fixTextureSampling(tex, k))

    tableMaterials.wood = buildMaterial(woodMaps)
    tableMaterials.plaster = buildMaterial(plasterMaps)

    // create table and add to scene
    createTable()
    scene.add(coffeeTable)

    // apply initial materials
    if (tableMaterials.wood) {
        Object.values(coffeeTable.children).forEach(child => {
            if (child.name && child.name.startsWith('tableTop_') && child.isMesh) {
                child.material = tableMaterials.wood
                child.material.needsUpdate = true
            }
        })
    }

    if (tableMaterials.plaster) {
        coffeeTable.traverse((c) => {
            if ((c.name === 'tableBase' || c.parent?.name === 'tableBase') && c.isMesh) {
                c.material = tableMaterials.plaster
                c.material.needsUpdate = true
            }
        })
    }

    // interaction: picking + transform attach/detach
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    let pointerDownTime = 0
    let pointerDownPos = { x: 0, y: 0 }

    canvas.addEventListener('pointerdown', (ev) => {
        pointerDownTime = performance.now()
        pointerDownPos = { x: ev.clientX, y: ev.clientY }
    })

    canvas.addEventListener('pointerup', (ev) => {
        const pointerUpTime = performance.now()
        const dt = pointerUpTime - pointerDownTime
        const dx = ev.clientX - pointerDownPos.x
        const dy = ev.clientY - pointerDownPos.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (dt >= 200 || distance >= 6) return

        const rect = canvas.getBoundingClientRect()
        pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
        pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1

        const activeTop = coffeeTable.children.find(c => c.name && c.name.startsWith('tableTop_') && c.visible)
        raycaster.setFromCamera(pointer, camera)

        const intersect = raycaster.intersectObjects([activeTop, coffeeTable.getObjectByName('tableBase')].filter(Boolean), true)
        if (intersect.length > 0) {
            let target = intersect[0].object
            const targetNames = ['tableBase', 'tableTop_circle', 'tableTop_rectangle', 'tableTop_ellipse']
            while (target && target.parent) {
                if (targetNames.includes(target.name)) break
                target = target.parent
            }
            if (target && targetNames.includes(target.name)) {
                resetTransformControls(transformControls, target)
            }
        } else {
            if (!transformControls.dragging) {
                if (transformControls.object) transformControls.detach()
                transformControls.visible = false
            }
        }
    })

    // keep transform within limits while changing
    transformControls.addEventListener('objectChange', () => {
        if (!transformControls.object) return
        if (transformControls.mode === 'scale') {
            const obj = transformControls.object
            if (obj && obj.scale) {
                const isTop = obj.name && obj.name.startsWith('tableTop_')
                const TOP_SCALE_MIN = 0.6
                const TOP_SCALE_MAX = 1.5
                const BASE_SCALE_MIN = 0.8
                const BASE_SCALE_MAX = 1.2

                obj.scale.x = Math.min((isTop ? TOP_SCALE_MAX : BASE_SCALE_MAX), Math.max((isTop ? TOP_SCALE_MIN : BASE_SCALE_MIN), obj.scale.x))
                obj.scale.y = Math.min((isTop ? TOP_SCALE_MAX : BASE_SCALE_MAX), Math.max((isTop ? TOP_SCALE_MIN : BASE_SCALE_MIN), obj.scale.y))
                obj.scale.z = Math.min((isTop ? TOP_SCALE_MAX : BASE_SCALE_MAX), Math.max((isTop ? TOP_SCALE_MIN : BASE_SCALE_MIN), obj.scale.z))

                obj.updateMatrix()
                obj.updateMatrixWorld(true)

                if (obj.name === 'tableTop_circle' || obj.name === 'tableBase' || isShiftPressed) {
                    const axis = transformControls.axis
                    if (axis === 'X') obj.scale.z = obj.scale.x
                    else if (axis === 'Z') obj.scale.x = obj.scale.z
                    else if (axis === 'XZ') obj.scale.x = obj.scale.z = Math.max(obj.scale.x, obj.scale.z)
                }
            }
        }
    })

    trackedSchedulingFinished = true
    checkFinishConditions()

    // render loop
    function tick() {
        orbitControls.update()
        renderer.render(scene, camera)
        window.requestAnimationFrame(tick)
    }
    tick()
}
