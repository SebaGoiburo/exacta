'use client'

import { useLayoutEffect, type RefObject } from 'react'
import type { gsap as Gsap } from 'gsap'
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger'

/*
 * GSAP is loaded after the page is usable, never during hydration, so content
 * paints first and the main thread stays free. Nothing may depend on it to
 * become visible: if it fails to load the page simply has no extra motion.
 */

export type Motion = { gsap: typeof Gsap; ScrollTrigger: typeof ScrollTriggerType }

let loading: Promise<Motion> | undefined

export function loadMotion(): Promise<Motion> {
  loading ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
    gsap.registerPlugin(ScrollTrigger)
    return { gsap, ScrollTrigger }
  })
  return loading
}

/** Runs after the load event, once the main thread is free. Returns a cancel function. */
export function whenIdle(run: () => void): () => void {
  let cancelTask = () => {}
  const schedule = () => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 1500 })
      cancelTask = () => window.cancelIdleCallback(id)
    } else {
      const id = setTimeout(run, 300)
      cancelTask = () => clearTimeout(id)
    }
  }

  if (document.readyState === 'complete') {
    schedule()
    return () => cancelTask()
  }
  window.addEventListener('load', schedule, { once: true })
  return () => {
    window.removeEventListener('load', schedule)
    cancelTask()
  }
}

let refreshQueued = false
let heldAnchor: { element: Element; top: number } | null = null

// Pins add height above whatever follows them. A page opened at an anchor reaches it
// before they exist, so remember where the anchor sits to put it back afterwards.
function holdAnchor() {
  if (heldAnchor || !window.location.hash) return
  const element = document.getElementById(window.location.hash.slice(1))
  if (!element) return
  const top = element.getBoundingClientRect().top
  const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0
  if (Math.abs(top - margin) <= 2) heldAnchor = { element, top }
}

// Triggers can be created in any order here, but pins must be measured top to bottom.
function queueRefresh({ gsap, ScrollTrigger }: Motion) {
  if (refreshQueued) return
  refreshQueued = true
  gsap.delayedCall(0.05, () => {
    refreshQueued = false
    ScrollTrigger.sort()
    ScrollTrigger.refresh()

    const anchor = heldAnchor
    heldAnchor = null
    if (!anchor?.element.isConnected) return
    window.scrollBy({ top: anchor.element.getBoundingClientRect().top - anchor.top, behavior: 'instant' })
    ScrollTrigger.update()
  })
}

type Options = {
  /** Selectors in `setup` resolve inside this element. */
  scope?: RefObject<Element | null>
  /** Load GSAP only while this media query matches. */
  media?: string
  /** Wait until `scope` is within half a screen of the viewport. Not for pinned sections. */
  near?: boolean
}

/** Sets up GSAP animations without blocking the first paint. `setup` may return a cleanup. */
export function useDeferredMotion(setup: (motion: Motion) => void | (() => void), options: Options = {}) {
  const { scope, media, near } = options

  // A pin moves its section into a spacer React doesn't know about. Only a layout
  // effect's cleanup runs before React removes the section, so it can undo that first.
  useLayoutEffect(() => {
    let stopped = false
    const cleanups: Array<() => void> = []

    const start = () => {
      cleanups.push(
        whenIdle(() => {
          loadMotion()
            .then((motion) => {
              if (stopped) return
              holdAnchor()
              let dispose: void | (() => void)
              const context = motion.gsap.context(() => {
                dispose = setup(motion)
              }, scope?.current ?? undefined)
              cleanups.push(() => {
                dispose?.()
                context.revert()
              })
              queueRefresh(motion)
            })
            .catch(() => {})
        }),
      )
    }

    const startWhenNear = () => {
      const element = scope?.current
      if (!near || !element) return start()
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return
          observer.disconnect()
          start()
        },
        { rootMargin: '50% 0px' },
      )
      observer.observe(element)
      cleanups.push(() => observer.disconnect())
    }

    const query = media ? window.matchMedia(media) : null
    if (!query || query.matches) {
      startWhenNear()
    } else {
      const onChange = () => {
        if (!query.matches) return
        query.removeEventListener('change', onChange)
        startWhenNear()
      }
      query.addEventListener('change', onChange)
      cleanups.push(() => query.removeEventListener('change', onChange))
    }

    return () => {
      stopped = true
      cleanups.forEach((cleanup) => cleanup())
    }
    // Runs once per mount, as every setup only reads refs and stable values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
