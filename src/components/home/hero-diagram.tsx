'use client'

import { forwardRef, useId, useImperativeHandle, useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

/*
 * The hero's signature: a business operation drawn as a node diagram.
 * At progress 0 it is tangled (scattered nodes, duplicated links, noise);
 * at progress 1 every node snaps into a four-column flow and data pulses
 * through it. Progress is driven from outside (scroll or a timed tween).
 */

const W = 640
const H = 520

type NodeKey =
  | 'whatsapp'
  | 'web'
  | 'email'
  | 'calls'
  | 'crm'
  | 'bookings'
  | 'billing'
  | 'agent'
  | 'flows'
  | 'dashboard'

type NodeDef = { key: NodeKey; order: [number, number]; chaos: [number, number]; tilt: number; delay: number }

const COLS = [84, 250, 416, 566]

const NODES: NodeDef[] = [
  { key: 'whatsapp', order: [COLS[0], 180], chaos: [430, 140], tilt: -12, delay: 0.02 },
  { key: 'web', order: [COLS[0], 260], chaos: [128, 384], tilt: 9, delay: 0.1 },
  { key: 'email', order: [COLS[0], 340], chaos: [540, 420], tilt: -6, delay: 0.06 },
  { key: 'calls', order: [COLS[0], 420], chaos: [272, 128], tilt: 14, delay: 0.16 },
  { key: 'crm', order: [COLS[1], 220], chaos: [112, 200], tilt: 7, delay: 0.12 },
  { key: 'bookings', order: [COLS[1], 300], chaos: [486, 272], tilt: -10, delay: 0.2 },
  { key: 'billing', order: [COLS[1], 380], chaos: [300, 436], tilt: 5, delay: 0.08 },
  { key: 'agent', order: [COLS[2], 260], chaos: [196, 292], tilt: -14, delay: 0.24 },
  { key: 'flows', order: [COLS[2], 340], chaos: [566, 184], tilt: 11, delay: 0.18 },
  { key: 'dashboard', order: [COLS[3], 300], chaos: [372, 312], tilt: -4, delay: 0.28 },
]

// The flow that remains once things are in order.
const EDGES: [NodeKey, NodeKey][] = [
  ['whatsapp', 'crm'],
  ['whatsapp', 'bookings'],
  ['web', 'crm'],
  ['web', 'bookings'],
  ['email', 'crm'],
  ['calls', 'bookings'],
  ['calls', 'billing'],
  ['crm', 'agent'],
  ['bookings', 'agent'],
  ['bookings', 'flows'],
  ['billing', 'flows'],
  ['agent', 'dashboard'],
  ['flows', 'dashboard'],
]

// Duplicated, redundant links that only exist in the tangled state.
const TANGLE: [NodeKey, NodeKey][] = [
  ['whatsapp', 'billing'],
  ['calls', 'dashboard'],
  ['email', 'web'],
  ['web', 'flows'],
  ['agent', 'email'],
  ['crm', 'calls'],
]

// Noise: loose dots that disappear once the operation is ordered.
const NOISE: [number, number][] = [
  [60, 90], [180, 70], [356, 92], [604, 96], [612, 300], [520, 342], [404, 214], [150, 470],
  [52, 300], [236, 360], [452, 476], [598, 488], [330, 210], [76, 448],
]

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ease = gsap.parseEase('power3.inOut')

function curve(x1: number, y1: number, x2: number, y2: number) {
  const dx = (x2 - x1) / 2
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)} ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

export type HeroDiagramHandle = { state: { p: number } }

type Labels = {
  title: string
  before: string
  after: string
  order: string
  columns: string[]
  nodes: Record<NodeKey, string>
}

export const HeroDiagram = forwardRef<HeroDiagramHandle, { labels: Labels }>(function HeroDiagram({ labels }, ref) {
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const state = useRef({ p: 0 }).current
  useImperativeHandle(ref, () => ({ state }), [state])

  useGSAP(
    () => {
      const svg = svgRef.current
      if (!svg) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) state.p = 1

      const q = <T extends Element>(sel: string) => Array.from(svg.querySelectorAll<T>(sel))
      const nodeEls = q<SVGGElement>('[data-node]')
      const labelEls = q<SVGTextElement>('[data-node-label]')
      const coreEls = q<SVGCircleElement>('[data-node-core]')
      const edgeEls = q<SVGPathElement>('[data-edge]')
      const tangleEls = q<SVGPathElement>('[data-tangle]')
      const noiseEls = q<SVGCircleElement>('[data-noise]')
      const colEls = q<SVGTextElement>('[data-col]')
      const beforeEl = svg.querySelector<SVGTextElement>('[data-before]')!
      const afterEl = svg.querySelector<SVGTextElement>('[data-after]')!
      const readout = svg.querySelector<SVGTextElement>('[data-readout]')!
      const pulses = svg.querySelector<SVGGElement>('[data-pulses]')!

      const pos: Record<string, [number, number]> = {}

      const render = (time: number) => {
        const p = state.p
        const calm = reduce ? 0 : 1

        NODES.forEach((n, i) => {
          const local = ease(clamp((p - n.delay) / 0.7))
          const wob = (1 - local) * calm
          const jx = Math.sin(time * 0.9 + i * 1.7) * 6 * wob
          const jy = Math.cos(time * 0.7 + i * 2.3) * 6 * wob
          const x = n.chaos[0] + (n.order[0] - n.chaos[0]) * local + jx
          const y = n.chaos[1] + (n.order[1] - n.chaos[1]) * local + jy
          pos[n.key] = [x, y]
          nodeEls[i].setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`)
          labelEls[i].setAttribute('transform', `rotate(${(n.tilt * (1 - local)).toFixed(2)})`)
          labelEls[i].style.opacity = String(0.55 + 0.45 * local)
          const mix = Math.round(local * 100)
          const target = n.key === 'dashboard' ? 'var(--gold)' : 'var(--brand)'
          coreEls[i].style.fill = `color-mix(in oklab, ${target} ${mix}%, var(--ink-mute))`
        })

        EDGES.forEach(([a, b], i) => {
          const [x1, y1] = pos[a]
          const [x2, y2] = pos[b]
          edgeEls[i].setAttribute('d', curve(x1, y1, x2, y2))
          edgeEls[i].setAttribute('stroke-dasharray', `3 ${(4 * (1 - p)).toFixed(2)}`)
        })

        TANGLE.forEach(([a, b], i) => {
          const [x1, y1] = pos[a]
          const [x2, y2] = pos[b]
          tangleEls[i].setAttribute('d', curve(x1, y1, x2, y2))
          tangleEls[i].style.opacity = String(clamp(1 - p * 1.8))
        })

        noiseEls.forEach((el, i) => {
          const k = clamp(1 - p * 1.6)
          el.setAttribute('r', (2.2 * k).toFixed(2))
          el.setAttribute(
            'transform',
            `translate(${(Math.sin(time * 0.6 + i) * 5 * calm).toFixed(1)} ${(Math.cos(time * 0.5 + i * 1.3) * 5 * calm).toFixed(1)})`,
          )
        })

        const cols = clamp((p - 0.6) / 0.3)
        colEls.forEach((el) => (el.style.opacity = String(cols)))
        beforeEl.style.opacity = String(clamp(1 - p * 2))
        afterEl.style.opacity = String(clamp(p * 2 - 1))
        pulses.style.opacity = String(clamp((p - 0.92) / 0.08))
        // Order readout: starts at the share of links already in place (none) plus a baseline.
        readout.textContent = `${labels.order} ${String(Math.round(12 + 88 * p)).padStart(3, ' ')}%`
      }

      const tick = (time: number) => render(time)
      gsap.ticker.add(tick)
      render(0)

      // Crosshair with coordinate readout (precision instrument), pointer devices only.
      const cross = svg.querySelector<SVGGElement>('[data-cross]')!
      const cx = svg.querySelector<SVGLineElement>('[data-cross-x]')!
      const cy = svg.querySelector<SVGLineElement>('[data-cross-y]')!
      const ct = svg.querySelector<SVGTextElement>('[data-cross-t]')!
      const canHover = window.matchMedia('(hover: hover)').matches
      const pt = svg.createSVGPoint()
      const move = (e: PointerEvent) => {
        const m = svg.getScreenCTM()
        if (!m) return
        pt.x = e.clientX
        pt.y = e.clientY
        const { x, y } = pt.matrixTransform(m.inverse())
        cx.setAttribute('y1', String(y))
        cx.setAttribute('y2', String(y))
        cy.setAttribute('x1', String(x))
        cy.setAttribute('x2', String(x))
        ct.setAttribute('x', String(Math.min(x + 10, W - 96)))
        ct.setAttribute('y', String(Math.max(y - 10, 34)))
        ct.textContent = `X ${Math.round(x).toString().padStart(3, '0')}  Y ${Math.round(y).toString().padStart(3, '0')}`
        cross.style.opacity = '1'
      }
      const leave = () => (cross.style.opacity = '0')
      if (canHover) {
        svg.addEventListener('pointermove', move)
        svg.addEventListener('pointerleave', leave)
      }

      return () => {
        gsap.ticker.remove(tick)
        svg.removeEventListener('pointermove', move)
        svg.removeEventListener('pointerleave', leave)
      }
    },
    { scope: svgRef },
  )

  const ticksX = Array.from({ length: W / 16 + 1 }, (_, i) => i * 16)
  const ticksY = Array.from({ length: Math.floor(H / 16) + 1 }, (_, i) => i * 16)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={labels.title}
      data-diagram
      className="h-auto w-full select-none overflow-visible"
    >
      {/* Frame and rulers */}
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} fill="var(--bg-elev)" fillOpacity="0.55" stroke="var(--line-strong)" />
      <g stroke="var(--line-strong)" strokeWidth="1">
        {ticksX.map((x) => (
          <line key={`tx${x}`} x1={x} y1={0} x2={x} y2={x % 80 === 0 ? 9 : 4} />
        ))}
        {ticksY.map((y) => (
          <line key={`ty${y}`} x1={0} y1={y} x2={y % 80 === 0 ? 9 : 4} y2={y} />
        ))}
      </g>
      <g className="max-sm:hidden" fill="var(--ink-mute)" fontFamily="var(--font-mono)" fontSize="7" letterSpacing="0.5">
        {ticksX
          .filter((x) => x % 160 === 0 && x > 0 && x < W)
          .map((x) => (
            <text key={`nx${x}`} x={x + 3} y={16}>
              {x}
            </text>
          ))}
      </g>

      {/* State label, swaps once ordered */}
      <g fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1.2">
        <text data-before x={28} y={44} fill="var(--ink-soft)">
          {labels.before.toUpperCase()}
        </text>
        <text data-after x={28} y={44} fill="var(--ink)" style={{ opacity: 0 }}>
          {labels.after.toUpperCase()}
        </text>
      </g>

      {/* Column headers, only meaningful in the ordered state */}
      <g data-cols fontFamily="var(--font-mono)" fontSize="8.5" letterSpacing="1" fill="var(--ink-mute)" textAnchor="middle">
        {labels.columns.map((c, i) => (
          <text key={c} data-col x={COLS[i]} y={124} style={{ opacity: 0 }}>
            {c.toUpperCase()}
          </text>
        ))}
      </g>

      {/* Links */}
      <g fill="none" strokeLinecap="round">
        {TANGLE.map(([a, b]) => (
          <path key={`t-${a}-${b}`} data-tangle stroke="var(--ink-mute)" strokeOpacity="0.5" strokeDasharray="2 5" />
        ))}
        {EDGES.map(([a, b], i) => (
          <path key={`e-${a}-${b}`} id={`${uid}-e${i}`} data-edge stroke="var(--line-strong)" strokeWidth="1.25" />
        ))}
      </g>

      {/* Data pulses travelling along the ordered flow */}
      <g data-pulses style={{ opacity: 0 }} fill="var(--brand)">
        {EDGES.map((_, i) => (
          <circle key={`p${i}`} r="2.6">
            <animateMotion dur={`${2.4 + (i % 4) * 0.35}s`} begin={`${(i * 0.37).toFixed(2)}s`} repeatCount="indefinite">
              <mpath href={`#${uid}-e${i}`} />
            </animateMotion>
          </circle>
        ))}
      </g>

      {/* Noise */}
      <g fill="var(--ink-mute)">
        {NOISE.map(([x, y], i) => (
          <g key={`n${i}`} transform={`translate(${x} ${y})`}>
            <circle data-noise r="2.2" />
          </g>
        ))}
      </g>

      {/* Nodes */}
      <g>
        {NODES.map((n) => (
          <g key={n.key} data-node transform={`translate(${n.chaos[0]} ${n.chaos[1]})`}>
            <circle r="10" fill="var(--bg-elev)" stroke="var(--line-strong)" />
            <circle data-node-core r="4.5" fill="var(--ink-mute)" />
            <g data-node-label transform={`rotate(${n.tilt})`}>
              <text
                data-lbl
                y="27"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="9.5"
                letterSpacing="0.4"
                fill="var(--ink)"
              >
                {labels.nodes[n.key]}
              </text>
            </g>
          </g>
        ))}
      </g>

      {/* Readout */}
      <text
        data-readout
        x={W - 24}
        y={H - 22}
        textAnchor="end"
        fontFamily="var(--font-mono)"
        fontSize="11"
        letterSpacing="1"
        fill="var(--gold)"
      >
        {`${labels.order}   12%`}
      </text>

      {/* Crosshair */}
      <g data-cross style={{ opacity: 0, transition: 'opacity .25s' }} pointerEvents="none">
        <line data-cross-x x1={0} x2={W} stroke="var(--gold)" strokeOpacity="0.45" strokeDasharray="2 3" />
        <line data-cross-y y1={0} y2={H} stroke="var(--gold)" strokeOpacity="0.45" strokeDasharray="2 3" />
        <text data-cross-t fontFamily="var(--font-mono)" fontSize="8.5" letterSpacing="0.6" fill="var(--gold)" />
      </g>
    </svg>
  )
})
