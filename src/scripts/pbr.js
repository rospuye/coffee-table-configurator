import * as THREE from 'three'
import { createLoaders } from './loaders.js'

const { loadTextureAsync, loadEXRAsync } = createLoaders()

export async function loadPBRTextureSet(files = {}) {
    const maps = {}

    if (files.diff) {
        try {
            const tex = await loadTextureAsync(files.diff)
            tex.encoding = THREE.sRGBEncoding
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            maps.map = tex
        } catch (e) { }
    }

    if (files.ao) {
        try {
            const tex = await loadTextureAsync(files.ao)
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            maps.aoMap = tex
        } catch (e) { }
    }

    if (files.disp) {
        try {
            const tex = await loadTextureAsync(files.disp)
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            maps.displacementMap = tex
        } catch (e) { }
    }

    if (files.arm) {
        try {
            const tex = await loadTextureAsync(files.arm)
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            maps.armMap = tex
        } catch (e) { }
    }

    if (files.normalEXR) {
        try {
            const exr = await loadEXRAsync(files.normalEXR)
            exr.encoding = THREE.LinearEncoding
            exr.flipY = false
            maps.normalMap = exr
        } catch (e) { }
    }

    if (files.roughEXR) {
        try {
            const exr = await loadEXRAsync(files.roughEXR)
            exr.encoding = THREE.LinearEncoding
            exr.flipY = false
            maps.roughnessMap = exr
        } catch (e) { }
    }

    return maps
}