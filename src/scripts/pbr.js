import * as THREE from 'three'

/**
 * Load a set of PBR textures.
 *
 * @param {Object} files - a map of file paths (diff, ao, disp, arm, normalEXR, roughEXR)
 * @param {Function} loadTextureAsync - async loader function for regular textures (returns a Promise<Texture>)
 * @param {Function} loadEXRAsync - async loader function for EXR textures (returns a Promise<Texture>)
 * @param {THREE.LoadingManager|null} [manager=null] - optional LoadingManager to register itemStart/itemEnd
 * @returns {Promise<Object>} maps - map of textures keyed for use in a material
 */
export async function loadPBRTextureSet(files = {}, loadTextureAsync, loadEXRAsync, manager = null) {
    const maps = {}

    const safeStart = (label) => {
        if (!manager) return
        try { manager.itemStart(label) } catch (e) { }
    }
    const safeEnd = (label) => {
        if (!manager) return
        try { manager.itemEnd(label) } catch (e) { }
    }
    const safeError = (label) => {
        if (!manager) return
        try { manager.itemError(label) } catch (e) { }
    }

    const tasks = []

    if (files.diff) {
        const label = `pbr:diff:${files.diff}`
        safeStart(label)
        const p = Promise.resolve()
            .then(() => loadTextureAsync(files.diff))
            .then((tex) => {
                if (!tex) return
                tex.encoding = THREE.sRGBEncoding
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping
                maps.map = tex
                safeEnd(label)
            })
            .catch((err) => {
                console.error('Failed to load diff:', files.diff, err)
                safeError(label)
            })
        tasks.push(p)
    }

    if (files.ao) {
        const label = `pbr:ao:${files.ao}`
        safeStart(label)
        const p = Promise.resolve()
            .then(() => loadTextureAsync(files.ao))
            .then((tex) => {
                if (!tex) return
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping
                maps.aoMap = tex
                safeEnd(label)
            })
            .catch((err) => {
                console.error('Failed to load ao:', files.ao, err)
                safeError(label)
            })
        tasks.push(p)
    }

    if (files.disp) {
        const label = `pbr:disp:${files.disp}`
        safeStart(label)
        const p = Promise.resolve()
            .then(() => loadTextureAsync(files.disp))
            .then((tex) => {
                if (!tex) return
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping
                maps.displacementMap = tex
                safeEnd(label)
            })
            .catch((err) => {
                console.error('Failed to load disp:', files.disp, err)
                safeError(label)
            })
        tasks.push(p)
    }

    if (files.arm) {
        const label = `pbr:arm:${files.arm}`
        safeStart(label)
        const p = Promise.resolve()
            .then(() => loadTextureAsync(files.arm))
            .then((tex) => {
                if (!tex) return
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping
                maps.armMap = tex
                safeEnd(label)
            })
            .catch((err) => {
                console.error('Failed to load arm:', files.arm, err)
                safeError(label)
            })
        tasks.push(p)
    }

    if (files.normalEXR) {
        const label = `pbr:normal:${files.normalEXR}`
        safeStart(label)
        const p = Promise.resolve()
            .then(() => loadEXRAsync(files.normalEXR))
            .then((exr) => {
                if (!exr) return
                exr.encoding = THREE.LinearEncoding
                // most EXR loaders return textures that already are suitable as normal maps,
                // ensure no flip on Y if loader preserved orientation
                exr.flipY = false
                // If you need to set mapping/mode, do it here
                maps.normalMap = exr
                safeEnd(label)
            })
            .catch((err) => {
                console.error('Failed to load normal EXR:', files.normalEXR, err)
                safeError(label)
            })
        tasks.push(p)
    }

    if (files.roughEXR) {
        const label = `pbr:rough:${files.roughEXR}`
        safeStart(label)
        const p = Promise.resolve()
            .then(() => loadEXRAsync(files.roughEXR))
            .then((exr) => {
                if (!exr) return
                exr.encoding = THREE.LinearEncoding
                exr.flipY = false
                maps.roughnessMap = exr
                safeEnd(label)
            })
            .catch((err) => {
                console.error('Failed to load rough EXR:', files.roughEXR, err)
                safeError(label)
            })
        tasks.push(p)
    }

    // Wait for all loads to settle (we intentionally do not throw on single failures)
    await Promise.allSettled(tasks)

    return maps
}
