import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'

export function createControls(camera, rendererDomElement, canvas) {
    const orbitControls = new OrbitControls(camera, canvas)
    orbitControls.enableDamping = true
    orbitControls.minDistance = 2;
    orbitControls.maxDistance = 15;

    const transformControls = new TransformControls(camera, rendererDomElement)
    transformControls.setMode('scale')
    transformControls.visible = false
    transformControls.showX = true
    transformControls.showY = false
    transformControls.showZ = true
    transformControls.setScaleSnap(0.1)

    // prevent orbit controls when transforming
    transformControls.addEventListener('mouseDown', () => { orbitControls.enabled = false })
    transformControls.addEventListener('mouseUp', () => { orbitControls.enabled = true })

    transformControls.setColors('#AEC3B0', '#000000', '#598392', '#EFF6E0', '#124559')

    const helper = transformControls.getHelper()

    return { orbitControls, transformControls, transformHelper: helper }
}

export function resetTransformControls(transformControls, newObject) {
    transformControls.detach()
    transformControls.attach(newObject)
    transformControls.setMode('scale')

    if (transformControls.object.name === 'tableTop_circle' || transformControls.object.name === 'tableBase') {
        transformControls.showX = true
        transformControls.showY = false
        transformControls.showZ = false
    } else {
        transformControls.showX = true
        transformControls.showY = false
        transformControls.showZ = true
    }

    transformControls.visible = true
}
