import * as THREE from 'three'

export const tableMaterials = {
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

export function buildMaterial(maps = {}) {
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