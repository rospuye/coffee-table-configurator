import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'

export function createLoaders(manager = undefined) {
    const managerLocal = manager || new THREE.LoadingManager()
    const texLoader = new THREE.TextureLoader(managerLocal)
    const hdrLoader = new RGBELoader(managerLocal)
    const exrLoader = new EXRLoader(managerLocal)

    function loadTextureAsync(url) {
        return new Promise((resolve, reject) => texLoader.load(url, tex => resolve(tex), undefined, reject))
    }

    function loadEXRAsync(url) {
        return new Promise((resolve, reject) => exrLoader.load(url, tex => resolve(tex), undefined, reject))
    }

    function loadHDRAsync(url) {
        return new Promise((resolve, reject) => hdrLoader.load(url, tex => resolve(tex), undefined, reject))
    }

    return { manager: managerLocal, loadTextureAsync, loadEXRAsync, loadHDRAsync }
}