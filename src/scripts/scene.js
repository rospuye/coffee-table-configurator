import * as THREE from 'three'

export function createScene(canvasSelector = 'canvas.webgl') {
    const canvas = document.querySelector(canvasSelector)
    if (!canvas) throw new Error(`Canvas element "${canvasSelector}" not found`)

    const scene = new THREE.Scene()
    const sizes = { width: window.innerWidth, height: window.innerHeight }

    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
    camera.position.set(1, 1, 2)
    scene.add(camera)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // resize handler
    window.addEventListener('resize', () => {
        sizes.width = window.innerWidth
        sizes.height = window.innerHeight

        camera.aspect = sizes.width / sizes.height
        camera.updateProjectionMatrix()

        renderer.setSize(sizes.width, sizes.height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })

    return { canvas, scene, camera, renderer, sizes }
}