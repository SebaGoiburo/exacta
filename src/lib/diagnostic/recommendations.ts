import type { Localized } from '@/content/types'
import type { Area } from './questions'
import type { Band } from './scoring'

export const AREA_NAMES: Record<Area, Localized> = {
  processes: { es: 'Procesos', en: 'Processes' },
  systems: { es: 'Sistemas', en: 'Systems' },
  data: { es: 'Datos', en: 'Data' },
  customers: { es: 'Clientes y ventas', en: 'Customers and sales' },
  ai: { es: 'Inteligencia artificial', en: 'Artificial intelligence' },
}

export const OVERALL: Record<Band, Localized<{ title: string; body: string }>> = {
  low: {
    es: {
      title: 'Tu operación depende de las personas, no de un sistema',
      body: 'El trabajo sale porque tu equipo lo sostiene a mano. Es el punto donde ordenar un par de procesos clave se nota más rápido.',
    },
    en: {
      title: 'Your operation depends on people, not on a system',
      body: 'Work gets done because your team holds it together by hand. This is where putting a couple of key processes in order pays off fastest.',
    },
  },
  mid: {
    es: {
      title: 'Tenés las piezas, pero todavía no trabajan juntas',
      body: 'Ya usás herramientas digitales, aunque buena parte del valor se pierde en los pasos manuales entre una y otra.',
    },
    en: {
      title: 'You have the pieces, but they don’t work together yet',
      body: 'You already use digital tools, though much of their value is lost in the manual steps between them.',
    },
  },
  high: {
    es: {
      title: 'Tu operación ya tiene una base sólida',
      body: 'Lo que queda es menos obvio: conectar los últimos procesos y usar lo que ya medís para decidir antes.',
    },
    en: {
      title: 'Your operation already has a solid base',
      body: 'What’s left is less obvious: connecting the last processes and using what you already measure to decide sooner.',
    },
  },
}

export const RECOMMENDATIONS: Record<Area, Record<Band, Localized>> = {
  processes: {
    low: {
      es: 'Elegí las dos tareas que más horas consumen, documentá cómo se hacen hoy y automatizá primero la que tenga menos excepciones.',
      en: 'Pick the two tasks that take the most hours, document how they’re done today and automate first the one with the fewest exceptions.',
    },
    mid: {
      es: 'Ya hay pasos definidos: el siguiente salto es sacar a las personas del medio en la carga y dejarlas solo en los controles que requieren criterio.',
      en: 'Steps are already defined: the next leap is taking people out of data entry and leaving them only the checks that require judgment.',
    },
    high: {
      es: 'Medí cuántas excepciones generan tus automatizaciones. Ahí suele estar la próxima mejora, más que en automatizar procesos nuevos.',
      en: 'Measure how many exceptions your automations produce. That’s usually where the next improvement is, more than in automating new processes.',
    },
  },
  systems: {
    low: {
      es: 'Identificá el dato que más veces se vuelve a escribir, como un pedido o un cliente, e integrá ese recorrido antes de cambiar cualquier sistema.',
      en: 'Find the piece of data that gets retyped most often, like an order or a customer, and integrate that path before replacing any system.',
    },
    mid: {
      es: 'Reemplazá los intercambios de archivos más frecuentes por integraciones directas y definí qué sistema manda sobre cada dato.',
      en: 'Replace the most frequent file exchanges with direct integrations and decide which system owns each piece of data.',
    },
    high: {
      es: 'Revisá qué pasa cuando una integración falla. Con muchos sistemas conectados, detectar el error a tiempo vale más que sumar otra conexión.',
      en: 'Check what happens when an integration fails. With many connected systems, catching errors in time is worth more than adding another connection.',
    },
  },
  data: {
    low: {
      es: 'Definí tres o cuatro números que importen de verdad y una sola fuente para cada uno. Un tablero sirve recién después de eso.',
      en: 'Define three or four numbers that truly matter and a single source for each. A dashboard only helps after that.',
    },
    mid: {
      es: 'Automatizá el armado de los reportes que hoy llevan días. La información que llega tarde no cambia ninguna decisión.',
      en: 'Automate the reports that take days to build today. Information that arrives late doesn’t change any decision.',
    },
    high: {
      es: 'Con datos al día, el paso siguiente son las alertas: que el sistema avise cuando un número se desvía, sin esperar a que alguien mire el tablero.',
      en: 'With up-to-date data, the next step is alerts: let the system flag a number that drifts, without waiting for someone to check the dashboard.',
    },
  },
  customers: {
    low: {
      es: 'Registrá cada consulta en un solo lugar, con responsable y próximo paso. Solo con eso dejás de perder oportunidades que ya pagaste por conseguir.',
      en: 'Log every inquiry in one place, with an owner and a next step. That alone stops you losing opportunities you already paid to get.',
    },
    mid: {
      es: 'Sumá seguimientos automáticos para quienes dejan de responder y medí en qué etapa se cae cada venta.',
      en: 'Add automated follow-ups for people who stop replying and measure the stage where each sale drops off.',
    },
    high: {
      es: 'Cruzá los datos de ventas con los de marketing para saber qué canal trae a los clientes que después compran, no solo a los que consultan.',
      en: 'Cross sales data with marketing data to learn which channel brings the customers who end up buying, not just the ones who ask.',
    },
  },
  ai: {
    low: {
      es: 'Empezá con un caso acotado y medible, como responder consultas frecuentes o resumir documentos. La IA rinde más sobre procesos que ya están ordenados.',
      en: 'Start with a narrow, measurable case, like answering common questions or summarizing documents. AI pays off more on processes already in order.',
    },
    mid: {
      es: 'Pasá del uso individual a uno acordado: definí qué tareas se hacen con IA, con qué datos y quién revisa el resultado.',
      en: 'Move from individual use to an agreed one: define which tasks use AI, with what data and who reviews the result.',
    },
    high: {
      es: 'Con casos ya funcionando, sumá agentes conectados a tus sistemas, siempre con derivación a una persona cuando la IA no tiene la respuesta.',
      en: 'With working cases in place, add agents connected to your systems, always handing off to a person when the AI doesn’t have the answer.',
    },
  },
}
