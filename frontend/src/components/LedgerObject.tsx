import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

type LedgerScene = import('./ledgerThreeScene').LedgerScene
type LedgerSceneVariant = import('./ledgerThreeScene').LedgerSceneVariant

export function LedgerObject({ variant = 'dashboard', className = '' }: { variant?: LedgerSceneVariant; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    setCanvasReady(false)
    const container = containerRef.current
    if (!container || reduceMotion !== false || window.matchMedia('(pointer: coarse)').matches) return

    let cancelled = false
    let inViewport = false
    let visible = !document.hidden
    let contextLost = false
    let initialized = false
    let frameId = 0
    let ledgerScene: LedgerScene | undefined
    let observer: IntersectionObserver | undefined
    let resizeObserver: ResizeObserver | undefined
    let resizeHandler: (() => void) | undefined
    let pointerX = 0
    let pointerY = 0
    let targetX = 0
    let targetY = 0
    let startedAt = 0
    let canvas: HTMLCanvasElement | undefined
    const horizontalRotationLimit = 8 * Math.PI / 180
    const verticalRotationLimit = 6 * Math.PI / 180

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !container) return
      const bounds = container.getBoundingClientRect()
      const relativeX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(bounds.width, 1)))
      const relativeY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / Math.max(bounds.height, 1)))
      targetY = (relativeX - 0.5) * horizontalRotationLimit
      targetX = (relativeY - 0.5) * -verticalRotationLimit
    }
    const onPointerLeave = () => {
      targetX = 0
      targetY = 0
    }
    const onDocumentVisibilityChange = () => {
      visible = inViewport && !document.hidden
      if (visible) start()
      else stop()
    }
    const onContextLost = (event: Event) => {
      event.preventDefault()
      contextLost = true
      visible = false
      if (frameId) cancelAnimationFrame(frameId)
      frameId = 0
      setCanvasReady(false)
    }

    const start = () => {
      if (cancelled || contextLost || !visible || frameId || !ledgerScene) return
      const render = (time: number) => {
        const activeScene = ledgerScene
        if (cancelled || !visible || !activeScene) {
          frameId = 0
          return
        }
        if (!startedAt) startedAt = time
        const elapsed = (time - startedAt) / 1000
        pointerX += (targetX - pointerX) * 0.1
        pointerY += (targetY - pointerY) * 0.1
        activeScene.root.rotation.x = -0.12 + pointerX + Math.sin(elapsed * 0.35) * 0.018
        activeScene.root.rotation.y = elapsed * 0.045 + pointerY
        activeScene.root.rotation.z = 0.1 + Math.sin(elapsed * 0.28) * 0.012
        activeScene.renderer.render(activeScene.scene, activeScene.camera)
        frameId = requestAnimationFrame(render)
      }
      frameId = requestAnimationFrame(render)
    }

    const stop = () => {
      if (frameId) cancelAnimationFrame(frameId)
      frameId = 0
    }

    const initialize = async () => {
      try {
        const { createLedgerScene } = await import('./ledgerThreeScene')
        if (cancelled) return

        ledgerScene = createLedgerScene(container, variant)
        const rendererCanvas = ledgerScene.renderer.domElement
        canvas = rendererCanvas
        rendererCanvas.setAttribute('aria-hidden', 'true')
        rendererCanvas.className = 'ledger-object-canvas'
        rendererCanvas.addEventListener('webglcontextlost', onContextLost)
        container.appendChild(rendererCanvas)

        const resize = () => {
          if (!ledgerScene || !container) return
          const nextWidth = Math.max(container.clientWidth, 1)
          const nextHeight = Math.max(container.clientHeight, 1)
          ledgerScene.renderer.setSize(nextWidth, nextHeight)
          ledgerScene.camera.aspect = nextWidth / nextHeight
          ledgerScene.camera.updateProjectionMatrix()
        }
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(resize)
          resizeObserver.observe(container)
        } else {
          resizeHandler = resize
          window.addEventListener('resize', resize)
        }

        document.addEventListener('visibilitychange', onDocumentVisibilityChange)
        container.addEventListener('pointermove', onPointerMove, { passive: true })
        container.addEventListener('pointerleave', onPointerLeave, { passive: true })
        setCanvasReady(true)
        start()
      } catch (error) {
        stop()
        observer?.disconnect()
        resizeObserver?.disconnect()
        document.removeEventListener('visibilitychange', onDocumentVisibilityChange)
        if (resizeHandler) window.removeEventListener('resize', resizeHandler)
        container.removeEventListener('pointermove', onPointerMove)
        container.removeEventListener('pointerleave', onPointerLeave)
        if (canvas) {
          canvas.removeEventListener('webglcontextlost', onContextLost)
          canvas.remove()
        }
        ledgerScene?.dispose()
        ledgerScene?.renderer.dispose()
        ledgerScene?.renderer.forceContextLoss()
        ledgerScene = undefined
        canvas = undefined
        console.warn('LedgerGuard 3D artwork is unavailable; showing the static illustration instead.', error)
        if (!cancelled) setCanvasReady(false)
      }
    }

    if (typeof IntersectionObserver !== 'undefined') {
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        inViewport = entry.isIntersecting
        visible = inViewport && !document.hidden
        if (visible && !initialized) {
          initialized = true
          void initialize()
        } else if (visible) start()
        else stop()
      }, { rootMargin: '80px' })
      observer = visibilityObserver
      visibilityObserver.observe(container)
    } else {
      inViewport = true
      initialized = true
      void initialize()
    }

    return () => {
      cancelled = true
      stop()
      observer?.disconnect()
      resizeObserver?.disconnect()
      document.removeEventListener('visibilitychange', onDocumentVisibilityChange)
      if (resizeHandler) window.removeEventListener('resize', resizeHandler)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', onContextLost)
        canvas.remove()
      }
      ledgerScene?.dispose()
      ledgerScene?.renderer.dispose()
      ledgerScene?.renderer.forceContextLoss()
    }
  }, [reduceMotion, variant])

  return <div
    ref={containerRef}
    className={`ledger-object${className ? ` ${className}` : ''}${canvasReady ? ' canvas-ready' : ''}`}
    data-variant={variant}
    aria-hidden="true"
  >
    <div className="ledger-object-fallback" aria-hidden="true">
      <span className="ledger-object-ring ledger-object-ring-outer" />
      <span className="ledger-object-ring ledger-object-ring-middle" />
      <span className="ledger-object-ring ledger-object-ring-inner" />
      <span className="ledger-object-core" />
    </div>
  </div>
}
