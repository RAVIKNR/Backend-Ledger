import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  PointLight,
  Scene,
  Shape,
  SRGBColorSpace,
  TorusGeometry,
  WebGLRenderer
} from 'three'

export type LedgerScene = {
  camera: PerspectiveCamera
  dispose: () => void
  renderer: WebGLRenderer
  root: Group
  scene: Scene
}

export type LedgerSceneVariant = 'dashboard' | 'login' | 'register' | 'success' | 'failure' | 'pending'

function disposeSceneResources(scene: Scene | undefined) {
  if (!scene) return
  const geometries = new Set<Mesh['geometry']>()
  const materials = new Set<Material>()
  scene.traverse((object) => {
    if (!(object instanceof Mesh) && !(object instanceof LineSegments)) return
    geometries.add(object.geometry)
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
    objectMaterials.forEach((material) => materials.add(material))
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  scene.clear()
}

export function createLedgerScene(container: HTMLElement, variant: LedgerSceneVariant = 'dashboard'): LedgerScene {
  const width = Math.max(container.clientWidth, 1)
  const height = Math.max(container.clientHeight, 1)
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  let scene: Scene | undefined

  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setSize(width, height)
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05

    scene = new Scene()
    const camera = new PerspectiveCamera(34, width / height, 0.1, 100)
    camera.position.set(0, 0, 6.2)
    const root = new Group()
    scene.add(root)

    scene.add(new AmbientLight(0xd8f3e4, 1.8))
    const keyLight = new DirectionalLight(0xffffff, 3)
    keyLight.position.set(-3, 4, 5)
    scene.add(keyLight)
    const edgeLight = new PointLight(0x55d6a0, 10, 9)
    edgeLight.position.set(2, -1, 3)
    scene.add(edgeLight)

    const ringMaterials = [
      new MeshStandardMaterial({ color: 0x91a99b, metalness: 0.88, roughness: 0.24 }),
      new MeshStandardMaterial({ color: 0x55d6a0, metalness: 0.55, roughness: 0.2, transparent: true, opacity: 0.74 }),
      new MeshStandardMaterial({ color: 0xd9e8de, metalness: 0.92, roughness: 0.18 })
    ]
    const isAuthScene = variant === 'login' || variant === 'register'
    const resultScene = variant === 'success' || variant === 'failure' || variant === 'pending'
    const registerScene = variant === 'register'
    const ringConfigs = isAuthScene
      ? [
          { radius: registerScene ? 1.2 : 1.35, tube: 0.035, rotation: [0.8, 0.2, 0.12] },
          { radius: registerScene ? 0.96 : 1.08, tube: 0.024, rotation: [0.3, 0.9, 0.55] },
          { radius: registerScene ? 0.74 : 0.86, tube: 0.04, rotation: [1.15, 0.25, 0.85] }
        ] as const
      : [
          { radius: 1.32, tube: 0.035, rotation: [0.9, 0.15, 0.1] },
          { radius: 1.08, tube: 0.024, rotation: [0.3, 0.9, 0.55] },
          { radius: 0.83, tube: 0.045, rotation: [1.15, 0.25, 0.85] }
        ] as const
    ringConfigs.forEach((config, index) => {
      const ring = new Mesh(new TorusGeometry(config.radius, config.tube, 10, 112), ringMaterials[index])
      ring.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2])
      root.add(ring)
    })

    if (isAuthScene) {
      const shieldShape = new Shape()
      shieldShape.moveTo(0, 1.12)
      shieldShape.bezierCurveTo(0.38, 0.82, 0.7, 0.72, 0.94, 0.56)
      shieldShape.lineTo(0.84, -0.18)
      shieldShape.bezierCurveTo(0.75, -0.64, 0.38, -1.02, 0, -1.2)
      shieldShape.bezierCurveTo(-0.38, -1.02, -0.75, -0.64, -0.84, -0.18)
      shieldShape.lineTo(-0.94, 0.56)
      shieldShape.bezierCurveTo(-0.7, 0.72, -0.38, 0.82, 0, 1.12)

      const shieldGeometry = new ExtrudeGeometry(shieldShape, {
        depth: 0.14,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.035,
        bevelThickness: 0.035,
        curveSegments: 16
      })
      const shield = new Mesh(
        shieldGeometry,
        new MeshPhysicalMaterial({
          color: 0x5fc99a,
          metalness: 0.3,
          roughness: 0.2,
          transparent: true,
          opacity: 0.36,
          clearcoat: 0.9,
          clearcoatRoughness: 0.16
        })
      )
      shield.scale.setScalar(registerScene ? 0.74 : 0.82)
      shield.position.z = 0.06
      root.add(shield)

      const edge = new LineSegments(
        new EdgesGeometry(shieldGeometry, 24),
        new LineBasicMaterial({ color: 0x8ce8bc, transparent: true, opacity: 0.48 })
      )
      edge.scale.copy(shield.scale)
      edge.position.copy(shield.position)
      root.add(edge)

      const accentsGeometry = new OctahedronGeometry(0.075, 0)
      const accentMaterial = new MeshStandardMaterial({ color: 0x9ad7b9, metalness: 0.8, roughness: 0.24 })
      const accentPositions = registerScene
        ? [[-1.36, 0.78, 0.25], [1.18, -0.72, -0.1], [1.42, 0.52, -0.32]]
        : [[-1.42, -0.68, 0.2], [1.34, 0.74, -0.2], [1.48, -0.4, 0.35]]
      accentPositions.forEach(([x, y, z], index) => {
        const accent = new Mesh(accentsGeometry, accentMaterial)
        accent.position.set(x, y, z)
        accent.scale.setScalar(index === 1 ? 0.72 : 1)
        root.add(accent)
      })
    } else if (resultScene) {
      const resultColor = variant === 'success' ? 0x55d6a0 : variant === 'failure' ? 0xd99180 : 0x9bb2a3
      const core = new Mesh(
        new OctahedronGeometry(variant === 'pending' ? 0.48 : 0.56, 1),
        new MeshPhysicalMaterial({ color: resultColor, metalness: 0.65, roughness: 0.2, emissive: resultColor, emissiveIntensity: 0.18, clearcoat: 0.8 })
      )
      core.rotation.set(0.3, 0.25, 0.1)
      root.add(core)
      const orbit = new Mesh(new TorusGeometry(0.9, 0.035, 10, 96), new MeshStandardMaterial({ color: resultColor, metalness: 0.5, roughness: 0.24 }))
      orbit.rotation.set(0.8, 0.2, 0.3)
      root.add(orbit)
    } else {
      const core = new Mesh(
        new OctahedronGeometry(0.42, 0),
        new MeshStandardMaterial({ color: 0xc5d8cc, metalness: 0.82, roughness: 0.2 })
      )
      core.rotation.set(0.3, 0.25, 0.1)
      root.add(core)
    }

    const dispose = () => {
      disposeSceneResources(scene)
    }

    return { camera, dispose, renderer, root, scene }
  } catch (error) {
    disposeSceneResources(scene)
    renderer.dispose()
    renderer.forceContextLoss()
    throw error
  }
}
