import { setTableTopMaterial } from './script.js'

const topMaterialButton = document.querySelector('#nav-content .nav-button:nth-child(1)')
const topMaterialSubtext = topMaterialButton.querySelector('.nav-option-subtext')

const materials = ["Glass", "Veneer Wood", "Plaster"]
const materialKeys = ["glass", "wood", "plaster"]
let currentIndex = 0

topMaterialButton.addEventListener('click', () => {
    topMaterialSubtext.style.opacity = 0

    setTimeout(() => {
        currentIndex = (currentIndex + 1) % materials.length
        topMaterialSubtext.textContent = materials[currentIndex]
        topMaterialSubtext.style.opacity = 1
        setTableTopMaterial(materialKeys[currentIndex])
    }, 150)
})
