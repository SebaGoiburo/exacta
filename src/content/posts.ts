import type { Post } from './types'

// Sample articles so the blog can be designed at full density. n8n will create real drafts in the CMS.
export const posts: Post[] = [
  {
    slug: 'que-procesos-automatizar-primero',
    sample: true,
    date: '2026-10-20',
    readingMinutes: 5,
    title: {
      es: 'Qué procesos automatizar primero',
      en: 'Which processes to automate first',
    },
    excerpt: {
      es: 'No todo lo que se puede automatizar conviene automatizarlo ya. Un criterio simple para elegir por dónde empezar.',
      en: 'Not everything that can be automated should be automated right now. A simple way to choose where to start.',
    },
    body: {
      es: [
        'La tentación es automatizar lo más visible. Lo que conviene es automatizar lo más repetido.',
        'Hacé una lista de las tareas que tu equipo repite cada semana y anotá cuánto tiempo lleva cada una. Multiplicá: frecuencia por tiempo. Las tres tareas con el número más alto son tus candidatas.',
        'Después, mirá el riesgo de error. Una tarea repetida que además se equivoca seguido (cargar datos de un sistema a otro, por ejemplo) es la primera de la fila.',
      ],
      en: [
        'The temptation is to automate what is most visible. What pays off is automating what is most repeated.',
        'List the tasks your team repeats every week and note how long each one takes. Multiply frequency by time. The three tasks with the highest number are your candidates.',
        'Then look at the risk of error. A repeated task that also goes wrong often (copying data from one system to another, for example) goes first.',
      ],
    },
  },
  {
    slug: 'turnos-online-que-cambia',
    sample: true,
    date: '2026-10-06',
    readingMinutes: 4,
    title: {
      es: 'Turnos online: qué cambia cuando el paciente gestiona su agenda',
      en: 'Online booking: what changes when patients manage their own schedule',
    },
    excerpt: {
      es: 'Menos llamadas, menos ausentismo y cobros al momento. Lo que aprendimos implementando sistemas de turnos.',
      en: 'Fewer calls, fewer no-shows and payment up front. What we learned setting up booking systems.',
    },
    body: {
      es: [
        'Un sistema de turnos no es solo un calendario en la web. Es la decisión de que el paciente haga por su cuenta lo que antes hacía alguien del equipo.',
        'Cuando el pago y los recordatorios están conectados al turno, el ausentismo baja y la agenda deja de depender del teléfono.',
      ],
      en: [
        'A booking system is not just a calendar on a website. It is the decision to let patients do on their own what someone on the team used to do.',
        'When payment and reminders are tied to the booking, no-shows drop and the schedule stops depending on the phone.',
      ],
    },
  },
  {
    slug: 'conectar-crm-facturacion-stock',
    sample: true,
    date: '2026-09-22',
    readingMinutes: 6,
    title: {
      es: 'CRM, facturación y stock: por qué conectar tus sistemas',
      en: 'CRM, billing and inventory: why connect your systems',
    },
    excerpt: {
      es: 'Cada vez que alguien copia un dato de un sistema a otro, tu empresa paga dos veces. Cómo empezar a integrarlos.',
      en: 'Every time someone copies data from one system to another, your business pays twice. How to start connecting them.',
    },
    body: {
      es: [
        'Los sistemas que no se hablan generan trabajo invisible: alguien tiene que llevar los datos de uno al otro.',
        'Integrar no siempre significa cambiar de sistema. Muchas veces alcanza con conectar los que ya usás con automatizaciones que muevan los datos por vos.',
      ],
      en: [
        "Systems that don't talk to each other create invisible work: someone has to carry the data from one to the other.",
        "Integrating doesn't always mean switching systems. Often it is enough to connect the ones you already use with automations that move the data for you.",
      ],
    },
  },
]
