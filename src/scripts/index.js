import * as THREE from 'three'
import { init } from './init.js'
import { setTableTopShape, setTableTopMaterial, setBaseMaterial } from './table.js'

// expose some helpers to the global for quick dev testing
window.THREE = THREE
window.setTableTopShape = setTableTopShape
window.setTableTopMaterial = setTableTopMaterial
window.setBaseMaterial = setBaseMaterial

// Boot
init().catch(err => console.error('Init failed', err))