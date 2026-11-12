import type { Area } from '../diagnostic/questions'

/*
 * The prospect formula. Six criteria are the same for every offer; what changes per offer is
 * which signals prove the need and how much each criterion weighs. That pair is an offer profile.
 */

export const DIMENSIONS = ['capacity', 'need', 'gap', 'demand', 'access', 'timing'] as const
export type Dimension = (typeof DIMENSIONS)[number]

export const DIMENSION_NAMES: Record<Dimension, string> = {
  capacity: 'Capacidad de compra',
  need: 'Necesidad',
  gap: 'Desventaja frente a la competencia',
  demand: 'Clientela',
  access: 'Acceso al que decide',
  timing: 'Momento',
}

export type Weights = Record<Dimension, number>

/** How sure we are of a criterion. Without data it counts as 50 and is flagged. */
export type Evidence = 'alta' | 'media' | 'sin_dato'

export type DimensionScore = { value: number; evidence: Evidence; why: string[] }
export type Scores = Record<Dimension, DimensionScore>

export const KNOCKOUTS = {
  cerrado: 'El comercio figura cerrado en Google',
  sin_contacto: 'No tiene teléfono ni sitio web',
  cliente: 'Ya es cliente',
  en_proceso: 'Ya está en otra tanda en curso',
  bloqueado: 'Se contactó en los últimos 90 días',
  capacidad_baja: 'La capacidad de compra no alcanza el mínimo de la oferta',
  sin_necesidad: 'No muestra la necesidad que resuelve la oferta',
  cadena: 'Es una cadena que decide en otra ciudad',
} as const
export type Knockout = keyof typeof KNOCKOUTS

/** Days a company stays out of every batch after it was contacted, lost or discarded. */
export const BLOCK_DAYS = 90

/** Signals we detect without AI, from Google Maps, the company's site and PageSpeed. */
export const AUTO_SIGNALS = {
  no_website: 'No tiene sitio web propio (solo redes o nada)',
  site_down: 'El sitio web no carga',
  slow_mobile: 'El sitio es lento en el celular (PageSpeed menor a 50)',
  not_mobile: 'El sitio no está preparado para celulares',
  no_https: 'El sitio no tiene conexión segura (HTTPS)',
  no_contact_cta: 'El sitio no tiene WhatsApp, formulario ni teléfono a la vista',
  old_site: 'El sitio parece desactualizado (año del pie de página viejo)',
  no_booking: 'No tiene reserva o turnos online',
  no_cart: 'No vende online (sin carrito)',
  no_tracking: 'No mide visitas ni anuncios (sin etiquetas de Google ni de Meta)',
  no_lead_capture: 'No guarda datos de quien consulta (sin formulario ni suscripción)',
  no_chat: 'No tiene chat ni WhatsApp para responder consultas',
  low_visibility: 'Buena calificación pero mal puesto en Google Maps',
  multi_branch: 'Tiene varias sucursales',
} as const
export type AutoSignal = keyof typeof AUTO_SIGNALS

export type ProfileSignal = {
  /** An AUTO_SIGNALS key, or `ia:<slug>` for one the AI judges from reviews and the web. */
  key: string
  label: string
  /** Points within the need criterion. */
  weight: number
  area: Area
}

export type ProfileDraft = {
  key: string
  name: string
  description: string
  parentKey?: string
  weights: Weights
  minCapacity: number
  signals: ProfileSignal[]
  /** Our real proof for this offer: cases, products, pages. The report and the AI may only cite this. */
  proof: string
  /** How to estimate the cost of the problem, as a formula the prospect can fill in. */
  costFormula: string
}

const w = (capacity: number, need: number, gap: number, demand: number, access: number, timing: number): Weights => ({
  capacity,
  need,
  gap,
  demand,
  access,
  timing,
})

const s = (key: string, weight: number, area: Area, label?: string): ProfileSignal => ({
  key,
  weight,
  area,
  label: label ?? AUTO_SIGNALS[key as AutoSignal] ?? key,
})

const SALUD_PROOF =
  'Caso Lic. Soledad Greco, nutricionista: turnos online con pago, recordatorios por WhatsApp y email, y factura de ARCA automática; la administración pasó de 3 horas a 20 minutos. Página: /industrias/salud.'

/** The profiles the panel starts with. They can be edited from the panel; these are only the seed. */
export const DEFAULT_PROFILES: ProfileDraft[] = [
  {
    key: 'sitio-web',
    name: 'Sitio web',
    description: 'Sitio web profesional, rápido y pensado para celulares, que convierte visitas en consultas.',
    weights: w(15, 35, 20, 10, 10, 10),
    minCapacity: 25,
    signals: [
      s('no_website', 30, 'customers'),
      s('site_down', 20, 'customers'),
      s('slow_mobile', 15, 'systems'),
      s('not_mobile', 10, 'systems'),
      s('no_contact_cta', 10, 'customers'),
      s('no_https', 5, 'systems'),
      s('old_site', 10, 'customers'),
    ],
    proof: 'Páginas /soluciones/captacion-de-clientes y /soluciones/software-a-medida.',
    costFormula: 'Consultas que hoy se pierden por mes × porcentaje que se vuelve cliente × valor promedio de un cliente.',
  },
  {
    key: 'turnos-online',
    name: 'Sitio web con turnos online y recordatorios por WhatsApp',
    description:
      'Sitio con reserva de turnos online, pago al reservar y recordatorios automáticos por WhatsApp para bajar el ausentismo y captar pacientes nuevos.',
    parentKey: 'sitio-web',
    weights: w(15, 35, 20, 10, 10, 10),
    minCapacity: 25,
    signals: [
      s('no_booking', 25, 'processes'),
      s('no_website', 15, 'customers'),
      s('slow_mobile', 10, 'systems'),
      s('no_contact_cta', 10, 'customers'),
      s('ia:turnos-manuales', 20, 'processes', 'Da los turnos por teléfono o WhatsApp, a mano'),
      s('ia:quejas-turnos', 15, 'customers', 'Reseñas que se quejan de lo difícil que es conseguir turno o de que no atienden'),
      s('ia:ausentismo', 5, 'processes', 'Señales de ausentismo o de turnos perdidos'),
    ],
    proof: SALUD_PROOF,
    costFormula:
      'Turnos por mes a los que el paciente no vino y que no se pudieron volver a dar × valor de la consulta, más horas por semana dedicadas a dar, confirmar y mover turnos × 4 × valor de la hora.',
  },
  {
    key: 'ecommerce',
    name: 'Ecommerce',
    description: 'Tienda online integrada con stock, cobros y envíos.',
    weights: w(20, 30, 15, 15, 10, 10),
    minCapacity: 35,
    signals: [
      s('no_cart', 35, 'customers'),
      s('no_website', 10, 'customers'),
      s('slow_mobile', 10, 'systems'),
      s('ia:vende-por-mensajes', 25, 'processes', 'Vende por Instagram o WhatsApp, con catálogo en PDF o fotos'),
      s('ia:piden-envios', 20, 'customers', 'Reseñas o comentarios que piden comprar online o envíos'),
    ],
    proof: 'Producto Plex-WordPress: catálogo, precios y stock de farmacias sincronizados con WooCommerce. Página /productos/plex-wordpress.',
    costFormula: 'Pedidos por mes que llegan fuera de horario o se pierden por demora × ticket promedio × margen.',
  },
  {
    key: 'publicidad-digital',
    name: 'Publicidad digital',
    description: 'Campañas en Google y Meta con medición de resultados.',
    weights: w(20, 25, 20, 20, 10, 5),
    minCapacity: 40,
    signals: [
      s('no_tracking', 35, 'data'),
      s('low_visibility', 30, 'customers'),
      s('ia:competencia-pauta', 20, 'customers', 'Sus competidores directos tienen anuncios activos'),
      s('ia:sin-pauta', 15, 'customers', 'No se ven anuncios propios activos'),
    ],
    proof: 'Página /soluciones/captacion-de-clientes.',
    costFormula: 'Búsquedas por mes del rubro en la zona × porcentaje que hoy se lleva la competencia × valor de un cliente.',
  },
  {
    key: 'embudo-automatizado',
    name: 'Embudo de conversión automatizado',
    description: 'Captura de consultas, seguimiento automático por email y WhatsApp, y CRM.',
    weights: w(20, 30, 10, 20, 10, 10),
    minCapacity: 35,
    signals: [
      s('no_lead_capture', 30, 'customers'),
      s('no_contact_cta', 15, 'customers'),
      s('ia:tiene-trafico', 25, 'customers', 'Invierte en publicidad o tiene mucho movimiento en redes'),
      s('ia:respuesta-lenta', 30, 'processes', 'Reseñas o comentarios sobre respuestas lentas o consultas sin contestar'),
    ],
    proof: 'Página /soluciones/captacion-de-clientes y /soluciones/automatizacion-e-ia.',
    costFormula: 'Consultas por mes sin seguimiento × porcentaje que compraría con seguimiento × valor de un cliente.',
  },
  {
    key: 'agentes-ia',
    name: 'Agentes de IA',
    description: 'Asistentes que responden consultas por WhatsApp y web a toda hora, y derivan a una persona.',
    weights: w(20, 30, 10, 20, 10, 10),
    minCapacity: 40,
    signals: [
      s('no_chat', 20, 'ai'),
      s('ia:muchas-consultas', 25, 'customers', 'Recibe muchas consultas repetidas (precios, horarios, disponibilidad)'),
      s('ia:no-contestan', 35, 'customers', 'Reseñas del tipo "no contestan" o "nunca atienden"'),
      s('ia:horario-corto', 20, 'processes', 'Atiende en un horario corto frente a la demanda'),
    ],
    proof: 'Agente de WhatsApp propio de Exacta en producción. Página /soluciones/automatizacion-e-ia.',
    costFormula: 'Consultas por día × minutos por respuesta × 30 ÷ 60 × valor de la hora, más consultas fuera de horario que se pierden × valor de un cliente.',
  },
  {
    key: 'software-a-medida',
    name: 'Aplicación o software a medida',
    description: 'Sistemas a medida e integraciones entre gestión, facturación, stock y ventas.',
    weights: w(35, 30, 5, 10, 10, 10),
    minCapacity: 55,
    signals: [
      s('multi_branch', 25, 'systems'),
      s('ia:errores-operativos', 30, 'processes', 'Reseñas sobre errores en pedidos, facturas, stock o turnos'),
      s('ia:busca-administrativos', 20, 'processes', 'Busca personal administrativo o de carga de datos'),
      s('ia:sistemas-sueltos', 25, 'systems', 'Usa varios sistemas o planillas que no se conectan'),
    ],
    proof:
      'Productos RestoUp (gastronomía), Cuota Al Día (clubes y organizaciones) y Plex-WordPress (farmacias). Página /soluciones/software-a-medida.',
    costFormula: 'Horas por mes de carga doble y controles manuales × valor de la hora, más errores por mes × costo de corregir cada uno.',
  },
]

/** Base weights for a free-text offer, before the AI proposes its own. */
export const BASE_WEIGHTS = w(20, 30, 15, 10, 15, 10)

export const isAutoSignal = (key: string): key is AutoSignal => key in AUTO_SIGNALS
