import * as THREE from 'three'
import { applyPlanarUVs, ensureBufferGeometry, clampScaleForObject } from './utils.js'
import { tableMaterials } from './materials.js'
import { transformControls } from './init.js'
import { resetTransformControls } from './controls.js'

export const coffeeTable = new THREE.Group()
export let tableTops = {}
export let activeTop = null
export const tableBase = new THREE.Group()
export let tableTrunk = null
export let tableFooter = null

const DEFAULT_TOP_WIDTH = 1
const DEFAULT_BASE_HEIGHT = 0.8
const DEFAULT_BEVEL = 0.01
const DEFAULT_BEVEL_HEIGHT = 0.04

export function makeTableTopGeometry({ shape = 'circle', topWidth = DEFAULT_TOP_WIDTH, bevel = DEFAULT_BEVEL, bevelHeight = DEFAULT_BEVEL_HEIGHT } = {}) {
    let geom = null

    const centerExtrude = (geomIn, depth) => {
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

export function createTable({ topWidth = DEFAULT_TOP_WIDTH, baseHeight = DEFAULT_BASE_HEIGHT, baseTopWidth = 0.45, baseBottomWidth = 0.7, bevel = DEFAULT_BEVEL, bevelHeight = DEFAULT_BEVEL_HEIGHT } = {}) {
    const defaultMaterial = tableMaterials.wood || new THREE.MeshStandardMaterial({ color: 0x7f7f7f })

    coffeeTable.clear()
    tableTops = {}

    const shapes = ['circle', 'ellipse', 'rectangle']
    shapes.forEach((shape) => {
        const geom = makeTableTopGeometry({ shape, topWidth, bevel, bevelHeight })
        const mesh = new THREE.Mesh(geom, defaultMaterial)
        mesh.name = `tableTop_${shape}`
        mesh.position.y = (baseHeight + bevelHeight) / 2
        mesh.visible = (shape === 'ellipse')
        tableTops[shape] = mesh
        coffeeTable.add(mesh)
    })
    activeTop = tableTops.ellipse

    const tableBaseGeom = new THREE.CylinderGeometry(baseTopWidth, baseBottomWidth, baseHeight, 64)
    applyPlanarUVs(tableBaseGeom)
    tableBaseGeom.computeVertexNormals()
    tableTrunk = new THREE.Mesh(tableBaseGeom, tableMaterials.plaster || defaultMaterial)

    const tableFooterGeom = new THREE.CylinderGeometry(baseBottomWidth, baseBottomWidth - bevel, bevelHeight, 64)
    applyPlanarUVs(tableFooterGeom)
    tableFooter = new THREE.Mesh(tableFooterGeom, tableTrunk.material)
    tableFooter.position.y = -(baseHeight + bevelHeight) / 2

    tableBase.clear()
    tableBase.add(tableTrunk)
    tableBase.add(tableFooter)
    tableBase.name = 'tableBase'

    coffeeTable.add(tableBase)
}

export function setTableTopShape(type) {
    if (!tableTops || !tableTops[type]) return
    Object.keys(tableTops).forEach(shape => {
        tableTops[shape].visible = (shape === type)
    })
    activeTop = tableTops[type]
    if (transformControls?.object?.name?.startsWith('tableTop_')) {
        resetTransformControls(transformControls, activeTop)
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
    if (!tableMaterials[type] || !tableTrunk || !tableFooter) return
    tableTrunk.material = tableMaterials[type]
    tableFooter.material = tableMaterials[type]
    tableTrunk.material.needsUpdate = true
    tableFooter.material.needsUpdate = true
}

// helper used by controls module to clamp scaling during transform
export function clampScaleForObjectPublic(obj) {
    clampScaleForObject(obj)
}