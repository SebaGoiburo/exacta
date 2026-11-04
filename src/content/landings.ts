import type { Faq, Localized } from './types'

/*
 * Pages by solution and by industry, aimed at search and at campaigns.
 * Proof only points to real work: a case, a product of ours, or something a visitor can try.
 * An industry without any of those doesn't get a page.
 */

export type LandingKind = 'soluciones' | 'industrias'

export type Landing = {
  kind: LandingKind
  slug: string
  /** Short name, for links and breadcrumbs. */
  name: Localized
  metaTitle: Localized
  metaDescription: Localized
  title: Localized
  lead: Localized
  /** How the work goes today, and how it goes once it's ordered. */
  shift: { today: Localized; after: Localized }[]
  problems: { cost: Localized; title: Localized; body: Localized }[]
  buildTitle: Localized
  build: { title: Localized; body: Localized }[]
  /** The manual task the calculator asks about. */
  task: Localized
  proof: {
    caseSlug?: string
    productSlugs?: string[]
    /** Something of ours a visitor can try right now. */
    tryIt?: 'agent' | 'diagnostic'
  }
  faqs: Faq[]
}

const ask = {
  cost: {
    q: { es: '¿Cuánto cuesta y cuánto tarda?', en: 'How much does it cost and how long does it take?' },
    a: {
      es: 'Depende del alcance. Después del diagnóstico recibís una propuesta con alcance, plazos y costo, antes de empezar cualquier trabajo.',
      en: 'It depends on the scope. After the assessment you get a proposal with scope, timeline and cost, before any work starts.',
    },
  },
} satisfies Record<string, Faq>

export const landings: Landing[] = [
  {
    kind: 'soluciones',
    slug: 'software-a-medida',
    name: { es: 'Software a medida', en: 'Custom software' },
    metaTitle: { es: 'Software a medida para empresas', en: 'Custom software for businesses' },
    metaDescription: {
      es: 'Sistemas, sitios web y aplicaciones construidos sobre cómo trabaja tu empresa. Empezá con un diagnóstico gratuito y recibí una propuesta con alcance, plazos y costo.',
      en: 'Systems, websites and apps built around how your business works. Start with a free assessment and get a proposal with scope, timeline and cost.',
    },
    title: {
      es: 'Software a la medida de cómo trabaja tu empresa.',
      en: 'Software built around how your business works.',
    },
    lead: {
      es: 'Sistemas, sitios web y aplicaciones hechos sobre tu operación real, no al revés. Primero medimos cómo trabajás; después construimos lo que hace falta.',
      en: 'Systems, websites and apps built on your real operation, not the other way around. First we measure how you work; then we build what it takes.',
    },
    shift: [
      {
        today: { es: 'Planillas que nadie mantiene al día', en: 'Spreadsheets nobody keeps up to date' },
        after: { es: 'Un sistema con un solo dato vigente', en: 'One system with one current figure' },
      },
      {
        today: { es: 'El mismo dato cargado en tres lugares', en: 'The same data entered in three places' },
        after: { es: 'Sistemas conectados que lo comparten', en: 'Connected systems that share it' },
      },
      {
        today: { es: 'Un sistema genérico que te cambia el proceso', en: 'Generic software that bends your process' },
        after: { es: 'Una herramienta pensada para tu proceso', en: 'A tool designed for your process' },
      },
      {
        today: { es: 'Reportes armados a mano a fin de mes', en: 'Reports built by hand at month end' },
        after: { es: 'Un tablero con lo que hay que mirar', en: 'A dashboard with what matters' },
      },
    ],
    problems: [
      {
        cost: { es: 'horas', en: 'hours' },
        title: { es: 'La operación depende de planillas', en: 'Your operation runs on spreadsheets' },
        body: {
          es: 'Funcionó mientras eran pocos. Hoy tu equipo pierde horas copiando datos, buscando la última versión y corrigiendo lo que se rompió.',
          en: 'It worked while the team was small. Now people lose hours copying data, looking for the latest version and fixing what broke.',
        },
      },
      {
        cost: { es: 'errores', en: 'errors' },
        title: { es: 'Sistemas que no se hablan', en: "Systems that don't talk to each other" },
        body: {
          es: 'CRM, facturación y stock funcionan por separado. Cargás el mismo dato varias veces y algo siempre se pierde.',
          en: 'CRM, billing and stock run separately. You enter the same data several times and something always gets lost.',
        },
      },
      {
        cost: { es: 'presupuesto', en: 'budget' },
        title: { es: 'Pagás herramientas que usás a medias', en: 'You pay for tools you half use' },
        body: {
          es: 'Cada una resuelve una parte y ninguna se adapta del todo. El proceso termina dando vueltas alrededor de la herramienta.',
          en: 'Each one solves part of the problem and none fits fully. The process ends up working around the tool.',
        },
      },
    ],
    buildTitle: { es: 'Qué construimos', en: 'What we build' },
    build: [
      {
        title: { es: 'Sistemas internos', en: 'Internal systems' },
        body: {
          es: 'Las herramientas con las que tu equipo trabaja todos los días, con las reglas de tu negocio adentro.',
          en: 'The tools your team uses every day, with your business rules built in.',
        },
      },
      {
        title: { es: 'Integraciones entre sistemas', en: 'System integrations' },
        body: {
          es: 'Conectamos lo que ya usás para que el dato se cargue una sola vez. Es lo que hace nuestra integración entre Plex y WordPress.',
          en: 'We connect what you already use so data gets entered once. That is what our Plex and WordPress integration does.',
        },
      },
      {
        title: { es: 'Sitios web y aplicaciones', en: 'Websites and apps' },
        body: {
          es: 'Pensados para una acción concreta: reservar, comprar, consultar o pagar.',
          en: 'Designed for one concrete action: booking, buying, asking or paying.',
        },
      },
      {
        title: { es: 'Tableros', en: 'Dashboards' },
        body: {
          es: 'Los números de tu operación en un solo lugar, para decidir sin esperar el reporte de fin de mes.',
          en: 'Your operation’s numbers in one place, so decisions don’t wait for the month-end report.',
        },
      },
    ],
    task: { es: 'cargar, copiar y corregir datos a mano', en: 'entering, copying and fixing data by hand' },
    proof: { productSlugs: ['cuota-al-dia', 'restoup'] },
    faqs: [
      {
        q: { es: '¿Me conviene un software a medida o uno ya hecho?', en: 'Should I go custom or buy something ready-made?' },
        a: {
          es: 'Depende de tu proceso. Si una herramienta existente lo resuelve, te lo decimos: no te vendemos lo que no necesitás. A medida conviene cuando lo que te diferencia no entra en un sistema genérico.',
          en: "It depends on your process. If an existing tool solves it, we'll tell you: we won't sell you what you don't need. Custom makes sense when what sets you apart doesn't fit in generic software.",
        },
      },
      {
        q: { es: '¿Se puede hacer por etapas?', en: 'Can it be done in stages?' },
        a: {
          es: 'Sí. Los proyectos más grandes se planifican por etapas, para que veas resultados desde la primera.',
          en: 'Yes. Larger projects are planned in stages, so you see results from the first one.',
        },
      },
      {
        q: { es: '¿Se conecta con lo que ya uso?', en: 'Does it connect with what I already use?' },
        a: {
          es: 'Lo revisamos en el diagnóstico. La posibilidad de integrar depende de cada sistema, y te lo aclaramos antes de hacer la propuesta.',
          en: 'We check that in the assessment. Whether it can be integrated depends on each system, and we make that clear before the proposal.',
        },
      },
      ask.cost,
    ],
  },
  {
    kind: 'soluciones',
    slug: 'automatizacion-e-ia',
    name: { es: 'Automatización e IA', en: 'Automation and AI' },
    metaTitle: { es: 'Automatización y agentes de IA para empresas', en: 'Automation and AI agents for businesses' },
    metaDescription: {
      es: 'Agentes de IA con derivación a una persona, turnos online, cobros automáticos y flujos entre sistemas. Probá nuestro asistente por WhatsApp y hacé el diagnóstico gratuito.',
      en: 'AI agents that hand off to a person, online bookings, automatic payments and flows between systems. Try our WhatsApp assistant and take the free assessment.',
    },
    title: {
      es: 'Automatización e IA para que tu empresa no frene.',
      en: 'Automation and AI that keep your business moving.',
    },
    lead: {
      es: 'Agentes que atienden consultas, turnos online y cobros automáticos, todo conectado entre sí y con una persona lista para tomar el control.',
      en: 'Agents that answer questions, online bookings and automatic payments, all connected and with a person ready to take over.',
    },
    shift: [
      {
        today: { es: 'Consultas fuera de horario sin respuesta', en: 'Questions unanswered after hours' },
        after: { es: 'Un agente que responde y toma los datos', en: 'An agent that answers and takes the details' },
      },
      {
        today: { es: 'Turnos y cambios resueltos por teléfono', en: 'Bookings and changes handled by phone' },
        after: { es: 'Reservas online con recordatorios', en: 'Online bookings with reminders' },
      },
      {
        today: { es: 'Cobros y comprobantes hechos a mano', en: 'Payments and receipts done by hand' },
        after: { es: 'Pago online y comprobante automático', en: 'Online payment and automatic receipt' },
      },
      {
        today: { es: 'Datos copiados de un sistema a otro', en: 'Data copied from one system to another' },
        after: { es: 'Flujos que los mueven solos', en: 'Flows that move it on their own' },
      },
    ],
    problems: [
      {
        cost: { es: 'clientes', en: 'customers' },
        title: { es: 'Las consultas esperan demasiado', en: 'Questions wait too long' },
        body: {
          es: 'Quien escribe de noche o un fin de semana no siempre vuelve. Y tu equipo responde todos los días lo mismo.',
          en: "People who write at night or on a weekend don't always come back. And your team answers the same things every day.",
        },
      },
      {
        cost: { es: 'horas', en: 'hours' },
        title: { es: 'Tareas repetitivas ocupan el día', en: 'Repetitive tasks fill the day' },
        body: {
          es: 'Agendar, recordar, cobrar, pasar datos. Son tareas necesarias que hoy se pueden automatizar.',
          en: 'Scheduling, reminding, charging, moving data. These tasks are necessary, and today they can be automated.',
        },
      },
      {
        cost: { es: 'errores', en: 'errors' },
        title: { es: 'Lo manual falla sin avisar', en: 'Manual work fails silently' },
        body: {
          es: 'Un turno mal anotado o un cobro sin registrar aparecen cuando ya es tarde. Un flujo automático deja registro de cada paso.',
          en: 'A misrecorded booking or an unlogged payment shows up when it’s too late. An automated flow keeps a record of each step.',
        },
      },
    ],
    buildTitle: { es: 'Qué automatizamos', en: 'What we automate' },
    build: [
      {
        title: { es: 'Agentes de IA con derivación a una persona', en: 'AI agents that hand off to a person' },
        body: {
          es: 'Responden con la información que les das, piden los datos de contacto y le pasan la conversación a tu equipo, que la sigue desde un panel.',
          en: 'They answer with the information you give them, ask for contact details and pass the conversation to your team, who pick it up from a panel.',
        },
      },
      {
        title: { es: 'Turnos y reservas online', en: 'Online bookings' },
        body: {
          es: 'Tus clientes reservan, cancelan o reprograman solos, y reciben recordatorios por email y WhatsApp.',
          en: 'Your customers book, cancel or reschedule on their own, and get reminders by email and WhatsApp.',
        },
      },
      {
        title: { es: 'Cobros automáticos', en: 'Automatic payments' },
        body: {
          es: 'Pago online conectado a la reserva o a la cuota, con su comprobante.',
          en: 'Online payment tied to the booking or the membership fee, with its receipt.',
        },
      },
      {
        title: { es: 'Flujos entre sistemas', en: 'Flows between systems' },
        body: {
          es: 'Lo que entra por un canal llega a donde tiene que llegar, sin que nadie lo copie.',
          en: 'What comes in through one channel reaches where it needs to go, without anyone copying it.',
        },
      },
    ],
    task: { es: 'responder lo mismo, agendar y pasar datos', en: 'answering the same questions, scheduling and moving data' },
    proof: { caseSlug: 'soledad-greco', tryIt: 'agent', productSlugs: ['restoup'] },
    faqs: [
      {
        q: { es: '¿El agente puede inventar respuestas?', en: 'Can the agent make up answers?' },
        a: {
          es: 'Lo configuramos para responder solo con la información que le das, y para decir que no lo sabe y derivar cuando no la tiene. Antes de publicarlo lo probamos con casos reales. Podés ver cómo se comporta escribiéndole al de nuestro WhatsApp.',
          en: "We set it up to answer only with the information you give it, and to say it doesn't know and hand off when it can't. We test it with real cases before going live. You can see how it behaves by writing to the one on our WhatsApp.",
        },
      },
      {
        q: { es: '¿Una persona puede intervenir?', en: 'Can a person step in?' },
        a: {
          es: 'Sí. Desde el panel tu equipo ve las conversaciones, toma el control cuando hace falta y la devuelve al agente al terminar.',
          en: 'Yes. From the panel your team sees conversations, takes over when needed and hands them back to the agent when done.',
        },
      },
      {
        q: { es: '¿Qué conviene automatizar primero?', en: 'What should be automated first?' },
        a: {
          es: 'Lo que es repetitivo, frecuente y hoy le quita más horas a tu equipo. Para eso sirve el diagnóstico: medir antes de decidir.',
          en: "What is repetitive, frequent and takes the most hours from your team today. That's what the assessment is for: measuring before deciding.",
        },
      },
      ask.cost,
    ],
  },
  {
    kind: 'soluciones',
    slug: 'captacion-de-clientes',
    name: { es: 'Captación de clientes', en: 'Customer acquisition' },
    metaTitle: { es: 'Campañas y embudos de venta medibles para empresas', en: 'Measurable campaigns and sales funnels for businesses' },
    metaDescription: {
      es: 'Campañas en Meta, Google, LinkedIn y TikTok conectadas a embudos de venta que podés medir de punta a punta. Empezá con un diagnóstico gratuito.',
      en: 'Campaigns on Meta, Google, LinkedIn and TikTok connected to sales funnels you can measure end to end. Start with a free assessment.',
    },
    title: {
      es: 'Más clientes calificados, medidos de punta a punta.',
      en: 'More qualified customers, measured end to end.',
    },
    lead: {
      es: 'Campañas en Meta, Google, LinkedIn y TikTok conectadas a embudos de venta. Sabés qué campaña trajo cada consulta y cómo sigue.',
      en: 'Campaigns on Meta, Google, LinkedIn and TikTok connected to sales funnels. You know which campaign brought each inquiry and what happened next.',
    },
    shift: [
      {
        today: { es: 'Anuncios sin saber qué venta trajeron', en: 'Ads with no idea which sale they brought' },
        after: { es: 'Cada consulta registra su campaña', en: 'Every inquiry records its campaign' },
      },
      {
        today: { es: 'Consultas que llegan y nadie sigue', en: 'Inquiries that nobody follows up' },
        after: { es: 'Un pipeline con cada oportunidad', en: 'A pipeline with every opportunity' },
      },
      {
        today: { es: 'El mismo trato para todas las consultas', en: 'The same treatment for every inquiry' },
        after: { es: 'Un filtro que prioriza a quien encaja', en: 'A filter that prioritizes the right fit' },
      },
      {
        today: { es: 'Un sitio que informa y no convierte', en: "A site that informs but doesn't convert" },
        after: { es: 'Páginas pensadas para una acción', en: 'Pages designed for one action' },
      },
    ],
    problems: [
      {
        cost: { es: 'presupuesto', en: 'budget' },
        title: { es: 'No sabés qué te devuelve la inversión', en: "You don't know what your spend returns" },
        body: {
          es: 'La plataforma muestra clics y alcance. Lo que necesitás saber es qué campañas terminan en oportunidades reales.',
          en: 'The platform shows clicks and reach. What you need to know is which campaigns end in real opportunities.',
        },
      },
      {
        cost: { es: 'clientes', en: 'customers' },
        title: { es: 'Las consultas se enfrían', en: 'Inquiries go cold' },
        body: {
          es: 'Sin un proceso de seguimiento, las oportunidades quedan repartidas entre chats, emails y la memoria de alguien.',
          en: "Without a follow-up process, opportunities stay scattered across chats, emails and someone's memory.",
        },
      },
      {
        cost: { es: 'horas', en: 'hours' },
        title: { es: 'Tu equipo atiende a quien no va a comprar', en: "Your team serves people who won't buy" },
        body: {
          es: 'Cuando nada filtra, las mismas horas se reparten entre las buenas oportunidades y las que nunca iban a avanzar.',
          en: 'When nothing filters, the same hours get split between good opportunities and those that were never going to move forward.',
        },
      },
    ],
    buildTitle: { es: 'Qué ponemos en marcha', en: 'What we set up' },
    build: [
      {
        title: { es: 'Campañas', en: 'Campaigns' },
        body: {
          es: 'En Meta, Google, LinkedIn y TikTok, según dónde esté la persona que te interesa.',
          en: 'On Meta, Google, LinkedIn and TikTok, depending on where the people you want to reach are.',
        },
      },
      {
        title: { es: 'Embudos de venta', en: 'Sales funnels' },
        body: {
          es: 'Páginas, formularios y herramientas como un diagnóstico, que llevan a cada persona hacia una conversación con tu equipo.',
          en: 'Pages, forms and tools like an assessment, which lead each person toward a conversation with your team.',
        },
      },
      {
        title: { es: 'Medición de punta a punta', en: 'End-to-end measurement' },
        body: {
          es: 'Cada consulta guarda de qué campaña o página llegó, con el consentimiento de cada visitante.',
          en: 'Each inquiry keeps which campaign or page it came from, with each visitor’s consent.',
        },
      },
      {
        title: { es: 'Seguimiento comercial', en: 'Sales follow-up' },
        body: {
          es: 'Avisos automáticos y un pipeline para saber en qué etapa está cada oportunidad.',
          en: 'Automatic notices and a pipeline to know what stage each opportunity is at.',
        },
      },
    ],
    task: { es: 'responder y seguir consultas a mano', en: 'answering and following up inquiries by hand' },
    proof: { tryIt: 'diagnostic' },
    faqs: [
      {
        q: { es: '¿Garantizan una cantidad de clientes?', en: 'Do you guarantee a number of customers?' },
        a: {
          es: 'No. Nadie puede garantizarlo con honestidad. Lo que acordamos desde el diagnóstico son las métricas, y las medimos contra el punto de partida.',
          en: 'No. Nobody can honestly guarantee that. What we agree on from the assessment are the metrics, and we measure them against the starting point.',
        },
      },
      {
        q: { es: '¿Cuánto hay que invertir en publicidad?', en: 'How much should I spend on ads?' },
        a: {
          es: 'Depende de tu rubro, tu mercado y tu objetivo. Lo definimos en la propuesta, antes de empezar.',
          en: 'It depends on your industry, market and goal. We define it in the proposal, before starting.',
        },
      },
      {
        q: { es: '¿Qué plataformas usan?', en: 'Which platforms do you use?' },
        a: {
          es: 'Meta, Google, LinkedIn y TikTok. Elegimos según dónde esté la persona que te interesa, no todas por igual.',
          en: 'Meta, Google, LinkedIn and TikTok. We choose based on where the people you want to reach are, not all of them equally.',
        },
      },
      ask.cost,
    ],
  },
  {
    kind: 'soluciones',
    slug: 'consultoria',
    name: { es: 'Consultoría', en: 'Consulting' },
    metaTitle: { es: 'Consultoría en transformación digital para empresas', en: 'Digital transformation consulting for businesses' },
    metaDescription: {
      es: 'Te ayudamos a definir prioridades y a elegir proveedores de tecnología, sin venderte lo que no necesitás. Empezá con un diagnóstico gratuito.',
      en: "We help you set priorities and choose technology vendors, without selling you what you don't need. Start with a free assessment.",
    },
    title: {
      es: 'Qué hacer primero, antes de gastar en tecnología.',
      en: 'What to do first, before you spend on technology.',
    },
    lead: {
      es: 'Sabés que necesitás tecnología, pero no por dónde empezar. Definimos prioridades y te ayudamos a elegir proveedores, sin venderte lo que no necesitás.',
      en: "You know you need technology, but not where to start. We set priorities and help you choose vendors, without selling you what you don't need.",
    },
    shift: [
      {
        today: { es: 'Muchas ideas, ninguna prioridad', en: 'Many ideas, no priorities' },
        after: { es: 'Un orden de lo que conviene hacer', en: 'A clear order of what to do' },
      },
      {
        today: { es: 'Presupuestos imposibles de comparar', en: 'Quotes you can’t compare' },
        after: { es: 'Criterios claros para elegir', en: 'Clear criteria to choose' },
      },
      {
        today: { es: 'Herramientas compradas por recomendación', en: 'Tools bought on recommendation' },
        after: { es: 'Decisiones atadas a un objetivo', en: 'Decisions tied to a goal' },
      },
      {
        today: { es: 'Proyectos sin forma de medirlos', en: 'Projects with no way to measure them' },
        after: { es: 'Métricas acordadas desde el inicio', en: 'Metrics agreed from the start' },
      },
    ],
    problems: [
      {
        cost: { es: 'presupuesto', en: 'budget' },
        title: { es: 'Probaste tecnología que no rindió', en: "You tried technology that didn't deliver" },
        body: {
          es: 'Pagás herramientas y servicios, pero no sabés con certeza qué te devuelven.',
          en: "You pay for tools and services, but you don't know for sure what they return.",
        },
      },
      {
        cost: { es: 'tiempo', en: 'time' },
        title: { es: 'Las decisiones se postergan', en: 'Decisions keep getting postponed' },
        body: {
          es: 'Sin alguien que ordene las opciones, elegir un proveedor o un sistema queda siempre para el mes que viene.',
          en: 'Without someone to sort the options, choosing a vendor or a system always waits until next month.',
        },
      },
      {
        cost: { es: 'clientes', en: 'customers' },
        title: { es: 'Tu competencia se mueve', en: 'Your competitors are moving' },
        body: {
          es: 'Mientras tanto, otros se digitalizan. El problema no es la falta de tecnología: es la falta de una estrategia que la ordene.',
          en: "Meanwhile, others go digital. The problem isn't a lack of technology: it's the lack of a strategy to order it.",
        },
      },
    ],
    buildTitle: { es: 'En qué te ayudamos', en: 'How we help' },
    build: [
      {
        title: { es: 'Diagnóstico de la operación', en: 'Operations assessment' },
        body: {
          es: 'Analizamos cómo trabajás, identificamos los cuellos de botella y cuantificamos el impacto posible antes de proponer nada.',
          en: 'We look at how you work, find the bottlenecks and quantify the possible impact before proposing anything.',
        },
      },
      {
        title: { es: 'Plan de prioridades', en: 'Priority plan' },
        body: {
          es: 'Qué resolver primero y por qué, con cada decisión atada a un objetivo de negocio.',
          en: 'What to solve first and why, with each decision tied to a business goal.',
        },
      },
      {
        title: { es: 'Selección de proveedores', en: 'Vendor selection' },
        body: {
          es: 'Te ayudamos a comparar opciones y a elegir con criterios claros.',
          en: 'We help you compare options and choose with clear criteria.',
        },
      },
      {
        title: { es: 'Definición de métricas', en: 'Metrics definition' },
        body: {
          es: 'Costos, tiempos y errores, acordados desde el principio para medir el antes y el después.',
          en: 'Costs, times and errors, agreed from the start to measure before and after.',
        },
      },
    ],
    task: { es: 'resolver a mano lo que podría estar ordenado', en: 'handling by hand what could be in order' },
    proof: { tryIt: 'diagnostic' },
    faqs: [
      {
        q: { es: '¿Tengo que contratarles el desarrollo?', en: 'Do I have to hire you for the development?' },
        a: {
          es: 'No. Parte de la consultoría es ayudarte a elegir proveedores, sin venderte lo que no necesitás.',
          en: "No. Part of the consulting is helping you choose vendors, without selling you what you don't need.",
        },
      },
      {
        q: { es: '¿Con qué empiezo si no sé qué necesito?', en: "Where do I start if I don't know what I need?" },
        a: {
          es: 'Con el diagnóstico online: 13 preguntas, unos 3 minutos y sin costo. Si hay una oportunidad clara, lo revisamos juntos en una reunión de 45 minutos.',
          en: 'With the online assessment: 13 questions, about 3 minutes and no cost. If there is a clear opportunity, we go over it together in a 45-minute meeting.',
        },
      },
      {
        q: { es: '¿Sirve para una empresa chica?', en: 'Does it work for a small business?' },
        a: {
          es: 'Sí. Trabajamos con profesionales independientes, pymes, empresas y organismos públicos, y ajustamos el alcance a cada operación.',
          en: 'Yes. We work with independent professionals, small and mid-sized businesses, larger companies and public bodies, and fit the scope to each operation.',
        },
      },
      {
        q: { es: '¿Trabajan con organismos públicos?', en: 'Do you work with public bodies?' },
        a: {
          es: 'Sí. La Municipalidad de Santa Rosa es cliente nuestro: desarrollamos sus sitios web y una aplicación, y la acompañamos con soporte, mantenimiento y asesoramiento en transformación digital.',
          en: 'Yes. The Municipality of Santa Rosa is a current client: we built its websites and an application, and we support it with maintenance, support and digital transformation advice.',
        },
      },
      ask.cost,
    ],
  },
  {
    kind: 'industrias',
    slug: 'salud',
    name: { es: 'Salud y consultorios', en: 'Healthcare and practices' },
    metaTitle: { es: 'Turnos online y automatización para consultorios', en: 'Online bookings and automation for healthcare practices' },
    metaDescription: {
      es: 'Turnos con pago online, recordatorios por email y WhatsApp, y factura al reservar. Mirá cómo lo resolvimos en un consultorio y hacé el diagnóstico gratuito.',
      en: 'Bookings with online payment, email and WhatsApp reminders, and an invoice at booking. See how we solved it for one practice and take the free assessment.',
    },
    title: {
      es: 'Menos gestión de turnos, más tiempo con pacientes.',
      en: 'Less booking admin, more time with patients.',
    },
    lead: {
      es: 'Turnos online con pago, recordatorios automáticos y comprobante al reservar. Tu paciente se organiza solo y tu consultorio deja de depender del teléfono.',
      en: 'Online bookings with payment, automatic reminders and a receipt at booking. Patients organize themselves and your practice stops depending on the phone.',
    },
    shift: [
      {
        today: { es: 'Turnos y cambios resueltos a mano', en: 'Bookings and changes handled by hand' },
        after: { es: 'El paciente reserva o reprograma solo', en: 'Patients book or reschedule on their own' },
      },
      {
        today: { es: 'Ausentes sin aviso', en: 'No-shows without notice' },
        after: { es: 'Recordatorios por email y WhatsApp', en: 'Email and WhatsApp reminders' },
      },
      {
        today: { es: 'Cobros manuales', en: 'Manual payments' },
        after: { es: 'Pago online al reservar', en: 'Online payment at booking' },
      },
      {
        today: { es: 'Facturas hechas una por una', en: 'Invoices done one by one' },
        after: { es: 'Factura al momento de reservar', en: 'Invoice as soon as they book' },
      },
    ],
    problems: [
      {
        cost: { es: 'horas', en: 'hours' },
        title: { es: 'La agenda ocupa el día', en: 'The calendar takes over the day' },
        body: {
          es: 'Cada turno, reprogramación y cancelación se lleva tiempo que podría ir a atender pacientes.',
          en: 'Every booking, reschedule and cancellation takes time that could go to seeing patients.',
        },
      },
      {
        cost: { es: 'ingresos', en: 'income' },
        title: { es: 'El ausentismo deja huecos', en: 'No-shows leave gaps' },
        body: {
          es: 'Un turno sin cubrir es tiempo que no vuelve. Sin recordatorios ni pago previo, es difícil evitarlo.',
          en: "An empty slot is time you don't get back. Without reminders or prepayment, it's hard to avoid.",
        },
      },
      {
        cost: { es: 'errores', en: 'errors' },
        title: { es: 'Demasiados pasos a mano', en: 'Too many manual steps' },
        body: {
          es: 'Agenda, cobro y factura separados dejan margen de error en cada paso.',
          en: 'A separate calendar, payment and invoice leave room for error at each step.',
        },
      },
    ],
    buildTitle: { es: 'Qué ponemos en marcha', en: 'What we set up' },
    build: [
      {
        title: { es: 'Sitio web profesional', en: 'Professional website' },
        body: {
          es: 'Tu consultorio presentado con claridad, con la reserva a un paso.',
          en: 'Your practice clearly presented, with booking one step away.',
        },
      },
      {
        title: { es: 'Turnos online con pago', en: 'Online bookings with payment' },
        body: {
          es: 'El paciente elige horario, paga y puede cancelar o reprogramar.',
          en: 'Patients choose a time, pay, and can cancel or reschedule.',
        },
      },
      {
        title: { es: 'Avisos automáticos', en: 'Automatic notices' },
        body: {
          es: 'Confirmaciones y recordatorios por email y WhatsApp.',
          en: 'Confirmations and reminders by email and WhatsApp.',
        },
      },
      {
        title: { es: 'Factura al reservar', en: 'Invoice at booking' },
        body: {
          es: 'En nuestro caso de consultorio, el paciente recibe su factura oficial de ARCA en el momento.',
          en: 'In our practice case, patients get their official ARCA invoice right away.',
        },
      },
    ],
    task: { es: 'gestionar turnos, cambios y cobros', en: 'managing bookings, changes and payments' },
    proof: { caseSlug: 'soledad-greco' },
    faqs: [
      {
        q: { es: '¿Sirve para un consultorio chico?', en: 'Does it work for a small practice?' },
        a: {
          es: 'Sí. Nuestro caso de referencia es el consultorio de una profesional independiente. Ajustamos el alcance a cada operación.',
          en: 'Yes. Our reference case is an independent professional’s practice. We fit the scope to each operation.',
        },
      },
      {
        q: { es: '¿El paciente puede cancelar o reprogramar solo?', en: 'Can patients cancel or reschedule on their own?' },
        a: {
          es: 'Sí, ese es uno de los objetivos: que esos cambios dejen de pasar por vos.',
          en: "Yes, that's one of the goals: those changes no longer have to go through you.",
        },
      },
      {
        q: { es: '¿Trabajan con clínicas y empresas de salud?', en: 'Do you work with clinics and healthcare companies?' },
        a: {
          es: 'Sí, a ellas apuntamos. Hicimos numerosos sitios web para el sector y hoy tenemos como clientes activos a profesionales de la salud. Cada empresa tiene otros procesos y otros sistemas, así que el alcance se define en el diagnóstico.',
          en: 'Yes, that is who we aim to serve. We have built many healthcare websites and currently have healthcare professionals as active clients. Each company has different processes and systems, so the scope is defined in the assessment.',
        },
      },
      ask.cost,
    ],
  },
  {
    kind: 'industrias',
    slug: 'gastronomia',
    name: { es: 'Gastronomía', en: 'Restaurants' },
    metaTitle: { es: 'Reservas online y agente de IA para restaurantes', en: 'Online bookings and AI agent for restaurants' },
    metaDescription: {
      es: 'Sitio, menú online, reservas sin sobreventa y un agente de IA que responde las 24 horas, con RestoUp, nuestro producto para gastronomía.',
      en: 'Website, online menu, bookings with no overbooking and an AI agent that answers 24/7, with RestoUp, our product for restaurants.',
    },
    title: {
      es: 'Reservas y consultas resueltas, sin frenar el servicio.',
      en: 'Bookings and questions handled, without slowing service.',
    },
    lead: {
      es: 'Un sitio con menú, reservas online sin sobreventa y un agente de IA que responde y toma reservas las 24 horas. Tu equipo se queda en el salón.',
      en: 'A website with a menu, online bookings with no overbooking and an AI agent that answers and takes reservations 24/7. Your team stays on the floor.',
    },
    shift: [
      {
        today: { es: 'Reservas por chat, teléfono y cuaderno', en: 'Bookings by chat, phone and notebook' },
        after: { es: 'Reservas online en un solo lugar', en: 'Online bookings in one place' },
      },
      {
        today: { es: 'Mesas prometidas dos veces', en: 'Tables promised twice' },
        after: { es: 'Reservas sin sobreventa', en: 'Bookings with no overbooking' },
      },
      {
        today: { es: 'Las mismas preguntas durante el servicio', en: 'The same questions during service' },
        after: { es: 'Un agente que responde las 24 horas', en: 'An agent that answers 24/7' },
      },
      {
        today: { es: 'Un menú en PDF desactualizado', en: 'An outdated PDF menu' },
        after: { es: 'Un menú online que editás vos', en: 'An online menu you can edit' },
      },
    ],
    problems: [
      {
        cost: { es: 'clientes', en: 'customers' },
        title: { es: 'Mensajes sin responder en pleno servicio', en: 'Messages unanswered mid-service' },
        body: {
          es: 'Cuando hay más trabajo es cuando más consultas llegan, y una reserva que espera se va a otro lado.',
          en: 'The busiest moments are when the most questions arrive, and a booking left waiting goes somewhere else.',
        },
      },
      {
        cost: { es: 'errores', en: 'errors' },
        title: { es: 'Reservas repartidas', en: 'Scattered bookings' },
        body: {
          es: 'Entre el chat, el teléfono y el cuaderno, es fácil cruzar mesas o perder una reserva.',
          en: 'Between chat, phone and notebook, it’s easy to mix up tables or lose a booking.',
        },
      },
      {
        cost: { es: 'horas', en: 'hours' },
        title: { es: 'Siempre las mismas respuestas', en: 'Always the same answers' },
        body: {
          es: 'Horarios, ubicación, menú. Alguien de tu equipo lo repite todos los días en lugar de atender a quien ya está sentado.',
          en: 'Hours, location, menu. Someone on your team repeats it every day instead of serving those already seated.',
        },
      },
    ],
    buildTitle: { es: 'Qué incluye RestoUp', en: 'What RestoUp includes' },
    build: [
      {
        title: { es: 'Sitio web gastronómico', en: 'Restaurant website' },
        body: {
          es: 'Tu local, tu propuesta y la reserva a un paso.',
          en: 'Your place, your concept and booking one step away.',
        },
      },
      {
        title: { es: 'Menú online editable', en: 'Editable online menu' },
        body: {
          es: 'Lo cambiás cuando cambia la carta, sin depender de nadie.',
          en: 'Change it when the menu changes, without depending on anyone.',
        },
      },
      {
        title: { es: 'Reservas sin sobreventa', en: 'Bookings with no overbooking' },
        body: {
          es: 'Las reservas online se ordenan en un solo lugar.',
          en: 'Online bookings stay organized in one place.',
        },
      },
      {
        title: { es: 'Agente de IA con inbox humano', en: 'AI agent with a human inbox' },
        body: {
          es: 'Responde consultas y toma reservas las 24 horas, y tu equipo puede intervenir.',
          en: 'It answers questions and takes reservations 24/7, and your team can step in.',
        },
      },
    ],
    task: { es: 'responder consultas y tomar reservas', en: 'answering questions and taking bookings' },
    proof: { productSlugs: ['restoup'] },
    faqs: [
      {
        q: { es: '¿RestoUp o un desarrollo a medida?', en: 'RestoUp or custom development?' },
        a: {
          es: 'RestoUp ya incluye sitio, menú online, reservas y agente de IA. Si tu operación necesita algo más, lo vemos en el diagnóstico.',
          en: 'RestoUp already includes a website, online menu, bookings and an AI agent. If your operation needs something more, we look at it in the assessment.',
        },
      },
      {
        q: { es: '¿El agente toma reservas solo?', en: 'Does the agent take bookings on its own?' },
        a: {
          es: 'Sí, responde consultas y toma reservas las 24 horas. Tu equipo ve las conversaciones y puede intervenir.',
          en: 'Yes, it answers questions and takes reservations 24/7. Your team sees the conversations and can step in.',
        },
      },
      {
        q: { es: '¿Dónde veo más detalles?', en: 'Where can I see more details?' },
        a: {
          es: 'En restoup.com.ar, el sitio del producto, o escribiéndonos por WhatsApp.',
          en: 'At restoup.com.ar, the product site, or by writing to us on WhatsApp.',
        },
      },
    ],
  },
  {
    kind: 'industrias',
    slug: 'farmacias',
    name: { es: 'Farmacias', en: 'Pharmacies' },
    metaTitle: { es: 'Integración de Plex con tu tienda online para farmacias', en: 'Plex integration with your online store for pharmacies' },
    metaDescription: {
      es: 'Catálogo, precios y stock de Plex actualizados solos en tu tienda de WordPress y WooCommerce, sin carga doble. Conocé Plex-WordPress.',
      en: 'Plex catalog, prices and stock updated automatically in your WordPress and WooCommerce store, with no double entry. Meet Plex-WordPress.',
    },
    title: {
      es: 'Tu farmacia en Plex, tu tienda online al día.',
      en: 'Your pharmacy in Plex, your online store up to date.',
    },
    lead: {
      es: 'Integramos Plex con WordPress y WooCommerce: catálogo, precios y stock se actualizan solos en la tienda, sin cargar nada dos veces.',
      en: 'We connect Plex with WordPress and WooCommerce: catalog, prices and stock update themselves in the store, with nothing entered twice.',
    },
    shift: [
      {
        today: { es: 'Productos cargados dos veces', en: 'Products entered twice' },
        after: { es: 'Un catálogo sincronizado', en: 'A synced catalog' },
      },
      {
        today: { es: 'Precios viejos en la tienda', en: 'Old prices in the store' },
        after: { es: 'Precios al día', en: 'Up-to-date prices' },
      },
      {
        today: { es: 'Ventas de lo que no hay', en: 'Selling what you don’t have' },
        after: { es: 'Stock actualizado en la tienda', en: 'Stock updated in the store' },
      },
      {
        today: { es: 'Alguien dedicado a actualizar la web', en: 'Someone assigned to update the site' },
        after: { es: 'Una actualización que corre sola', en: 'Updates that run on their own' },
      },
    ],
    problems: [
      {
        cost: { es: 'horas', en: 'hours' },
        title: { es: 'Mantener la tienda es otro trabajo', en: 'Keeping the store is another job' },
        body: {
          es: 'Cada cambio de precio o de stock en Plex hay que repetirlo a mano en la web.',
          en: 'Every price or stock change in Plex has to be repeated by hand on the site.',
        },
      },
      {
        cost: { es: 'clientes', en: 'customers' },
        title: { es: 'Una tienda desactualizada no da confianza', en: "An outdated store doesn't build trust" },
        body: {
          es: 'Un precio distinto o un producto sin stock se transforman en un reclamo o en una venta perdida.',
          en: 'A wrong price or an out-of-stock product becomes a complaint or a lost sale.',
        },
      },
      {
        cost: { es: 'errores', en: 'errors' },
        title: { es: 'La carga doble se equivoca', en: 'Double entry makes mistakes' },
        body: {
          es: 'Cuanto más grande es el catálogo, más fácil es que algo quede mal cargado.',
          en: 'The larger the catalog, the easier it is for something to be entered wrong.',
        },
      },
    ],
    buildTitle: { es: 'Qué incluye Plex-WordPress', en: 'What Plex-WordPress includes' },
    build: [
      {
        title: { es: 'Catálogo sincronizado', en: 'Synced catalog' },
        body: {
          es: 'Los productos de Plex llegan a tu tienda.',
          en: 'Products from Plex reach your store.',
        },
      },
      {
        title: { es: 'Precios y stock al día', en: 'Up-to-date prices and stock' },
        body: {
          es: 'Se actualizan solos, sin intervención de tu equipo.',
          en: 'They update themselves, without your team stepping in.',
        },
      },
      {
        title: { es: 'Tienda WooCommerce', en: 'WooCommerce store' },
        body: {
          es: 'Sobre WordPress y WooCommerce.',
          en: 'Built on WordPress and WooCommerce.',
        },
      },
      {
        title: { es: 'Sin carga doble', en: 'No double entry' },
        body: {
          es: 'Seguís trabajando en Plex como siempre.',
          en: 'You keep working in Plex as usual.',
        },
      },
    ],
    task: { es: 'actualizar productos, precios y stock en la web', en: 'updating products, prices and stock on the site' },
    proof: { productSlugs: ['plex-wordpress'] },
    faqs: [
      {
        q: { es: '¿Tengo que dejar de usar Plex?', en: 'Do I have to stop using Plex?' },
        a: {
          es: 'No. La integración toma los datos de Plex: seguís trabajando igual.',
          en: 'No. The integration takes the data from Plex: you keep working the same way.',
        },
      },
      {
        q: { es: '¿Qué necesito para empezar?', en: 'What do I need to start?' },
        a: {
          es: 'Que tu farmacia use Plex. Si ya tenés tienda en WordPress, lo revisamos; si no, lo vemos en la primera conversación.',
          en: 'Your pharmacy needs to run Plex. If you already have a WordPress store, we review it; if not, we discuss it in the first conversation.',
        },
      },
      ask.cost,
    ],
  },
  {
    kind: 'industrias',
    slug: 'organizaciones',
    name: { es: 'Clubes y organizaciones', en: 'Clubs and organizations' },
    metaTitle: { es: 'Gestión y cobro de cuotas para clubes y asociaciones', en: 'Fee management and collection for clubs and associations' },
    metaDescription: {
      es: 'Vencimientos, pagos online y presenciales, recordatorios por WhatsApp y recaudación en un solo lugar, con Cuota Al Día, nuestro producto para organizaciones.',
      en: 'Due dates, online and in-person payments, WhatsApp reminders and collections in one place, with Cuota Al Día, our product for organizations.',
    },
    title: {
      es: 'Sabé quién pagó y cuánto falta cobrar.',
      en: 'Know who paid and how much is left to collect.',
    },
    lead: {
      es: 'Cuotas, vencimientos, pagos y recordatorios en un solo lugar, para clubes, bibliotecas populares, bomberos voluntarios y asociaciones.',
      en: 'Fees, due dates, payments and reminders in one place, for clubs, community libraries, volunteer fire brigades and associations.',
    },
    shift: [
      {
        today: { es: 'Cuadernos y planillas de socios', en: 'Member notebooks and spreadsheets' },
        after: { es: 'Cuotas y vencimientos organizados', en: 'Organized dues and due dates' },
      },
      {
        today: { es: 'Avisos uno por uno', en: 'Reminders one by one' },
        after: { es: 'Recordatorios por WhatsApp', en: 'WhatsApp reminders' },
      },
      {
        today: { es: 'Efectivo y transferencias sin registro claro', en: 'Cash and transfers with no clear record' },
        after: { es: 'Mercado Pago, efectivo y transferencia juntos', en: 'Mercado Pago, cash and transfer together' },
      },
      {
        today: { es: 'Nadie sabe bien cuánto se recaudó', en: 'Nobody quite knows what was collected' },
        after: { es: 'Recaudación al día', en: 'Collections at a glance' },
      },
    ],
    problems: [
      {
        cost: { es: 'ingresos', en: 'income' },
        title: { es: 'Las cuotas se atrasan', en: 'Fees fall behind' },
        body: {
          es: 'Sin avisos regulares, los pagos se postergan y la organización pierde previsibilidad.',
          en: 'Without regular reminders, payments get postponed and the organization loses predictability.',
        },
      },
      {
        cost: { es: 'horas', en: 'hours' },
        title: { es: 'Cobrar lleva demasiado tiempo', en: 'Collecting takes too long' },
        body: {
          es: 'Muchas organizaciones funcionan con voluntarios: ese tiempo debería ir a la actividad, no a perseguir pagos.',
          en: 'Many organizations run on volunteers: that time should go to the activity, not to chasing payments.',
        },
      },
      {
        cost: { es: 'errores', en: 'errors' },
        title: { es: 'Las cuentas no cierran', en: "The numbers don't add up" },
        body: {
          es: 'Con pagos por varios medios y registros separados, saber quién debe se vuelve una discusión.',
          en: 'With payments through several channels and separate records, knowing who owes becomes an argument.',
        },
      },
    ],
    buildTitle: { es: 'Qué incluye Cuota Al Día', en: 'What Cuota Al Día includes' },
    build: [
      {
        title: { es: 'Cuotas y vencimientos', en: 'Dues and due dates' },
        body: {
          es: 'Todo organizado, para saber qué corresponde a cada persona.',
          en: 'All organized, so you know what applies to each person.',
        },
      },
      {
        title: { es: 'Pagos online y presenciales', en: 'Online and in-person payments' },
        body: {
          es: 'Mercado Pago, efectivo y transferencia.',
          en: 'Mercado Pago, cash and bank transfer.',
        },
      },
      {
        title: { es: 'Recordatorios por WhatsApp', en: 'WhatsApp reminders' },
        body: {
          es: 'Avisos para que los pagos no dependan de la memoria.',
          en: "Notices so payments don't depend on memory.",
        },
      },
      {
        title: { es: 'Recaudación al día', en: 'Collections at a glance' },
        body: {
          es: 'Quién pagó, quién debe y cuánto falta cobrar, en un solo lugar.',
          en: 'Who paid, who owes and how much is left to collect, in one place.',
        },
      },
    ],
    task: { es: 'registrar pagos y avisar vencimientos', en: 'recording payments and sending due-date reminders' },
    proof: { productSlugs: ['cuota-al-dia'] },
    faqs: [
      {
        q: { es: '¿Para qué organizaciones sirve?', en: 'What organizations is it for?' },
        a: {
          es: 'Clubes, bibliotecas populares, bomberos voluntarios y asociaciones que cobran cuotas.',
          en: 'Clubs, community libraries, volunteer fire brigades and associations that collect fees.',
        },
      },
      {
        q: { es: '¿Se puede seguir cobrando en efectivo?', en: 'Can we still collect cash?' },
        a: {
          es: 'Sí. Cuota Al Día contempla Mercado Pago, efectivo y transferencia.',
          en: 'Yes. Cuota Al Día handles Mercado Pago, cash and bank transfer.',
        },
      },
      {
        q: { es: '¿Trabajan también con organismos públicos?', en: 'Do you also work with public bodies?' },
        a: {
          es: 'Sí. Trabajamos con profesionales, pymes, empresas y organismos públicos, y el alcance se define en el diagnóstico.',
          en: 'Yes. We work with professionals, small and mid-sized businesses, larger companies and public bodies, and the scope is defined in the assessment.',
        },
      },
    ],
  },
]

export const landingsOf = (kind: LandingKind) => landings.filter((l) => l.kind === kind)

export const getLanding = (kind: LandingKind, slug: string) => landings.find((l) => l.kind === kind && l.slug === slug)

export const landingPath = (l: Pick<Landing, 'kind' | 'slug'>) => `/${l.kind}/${l.slug}`

/** Home service rows, in the order of the "services.items" messages. */
export const SERVICE_LANDINGS = ['software-a-medida', 'captacion-de-clientes', 'automatizacion-e-ia', 'consultoria'] as const
