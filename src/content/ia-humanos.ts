/*
 * The copy of the IA para Humanos landing, as approved. Date, seats and prices come from the masterclass in the
 * panel; everything said here is the same for every edition.
 */

export const hero = {
  title: 'En 2 h 30 salís usando la IA en tu trabajo',
  lead: 'Una masterclass en vivo para comerciantes, profesionales y emprendedores. No necesitás saber nada de tecnología: te vas con tu asistente personal armado, tus redes organizadas y tu primer video editado.',
}

export const problems = {
  title: '¿Te pasa esto?',
  items: [
    'Sabés que la IA te serviría, pero no sabés por dónde empezar.',
    'Probaste ChatGPT un par de veces y las respuestas no te sirvieron.',
    'Se te van horas en mensajes, mails y planillas que se repiten cada semana.',
  ],
  close: 'No es falta de capacidad: nadie te lo explicó en tu idioma. Para eso es esta clase.',
}

export const outcomes = {
  title: 'Lo que te llevás funcionando',
  note: 'Desde el día siguiente.',
  items: [
    {
      name: 'Tu asistente personal',
      where: 'Módulo 3',
      text: 'Ordena tu agenda, escribe con vos y convierte tus números en decisiones, sin planillas eternas.',
    },
    {
      name: 'Tus redes al día',
      where: 'Módulo 4',
      text: 'Te propone ideas, escribe tus posteos y arma el calendario del mes en una tarde.',
    },
    {
      name: 'Videos que parecen de un profesional',
      where: 'Módulo 5',
      text: 'Desde el celular: guion, edición, subtítulos y música.',
    },
    {
      name: 'Mails, presupuestos y propuestas en minutos',
      where: 'Módulo 3',
      text: 'Con tu estilo y tus datos, listos para mandar.',
    },
    {
      name: 'Respuestas para tus clientes',
      where: 'Módulo 2',
      text: 'Claras, para las consultas de siempre y en el tono de tu negocio.',
    },
  ],
  base: 'Y la base para todo lo demás: qué herramienta usar para cada cosa y cómo escribirle a la IA para que te responda bien.',
}

/** Each audience with one of the 50 instructions included in the class, ready to copy: the page's sample. */
export const audiences = {
  title: 'Para quién es',
  sample: 'Una de las 50 instrucciones que te llevás. Copiala y probala hoy:',
  notFor: 'Para quién no es: si ya programás o usás IA todos los días, esta clase te va a quedar corta.',
  items: [
    {
      key: 'comerciantes',
      name: 'Comerciantes',
      benefit: 'Publicaciones, promociones y respuestas a clientes sin depender de nadie.',
      photo: 'florista',
      photoAlt: 'Una comerciante trabaja en la computadora de su florería',
      instruction:
        'Actuá como encargado de las redes de mi comercio, [rubro y ciudad]. Escribime 5 posteos para Instagram de esta semana sobre [producto o promoción]. Cada uno con una primera línea que haga frenar a quien pasa, 3 líneas en tono cercano y una invitación a escribirnos por WhatsApp.',
    },
    {
      key: 'profesionales',
      name: 'Profesionales',
      benefit: 'Informes, mails y propuestas en una fracción del tiempo.',
      photo: 'notebook',
      photoAlt: 'Una profesional lee sus notas frente a la notebook',
      instruction:
        'Sos mi asistente. Te paso las notas desordenadas de una reunión con un cliente. Armame un resumen de 5 líneas, la lista de tareas con responsable y fecha, y un mail de seguimiento cordial y breve para mandarle hoy. Notas: [pegá tus notas]',
    },
    {
      key: 'emprendedores',
      name: 'Emprendedores',
      benefit: 'El trabajo de un equipo cuando todavía sos vos solo.',
      photo: 'video',
      photoAlt: 'Una emprendedora graba un video con el celular',
      instruction:
        'Tengo un emprendimiento de [qué vendés] y quiero vender más este mes. Haceme 10 preguntas, de a una, para entender mi negocio. Después proponeme un plan de 4 semanas con una acción por día que me lleve menos de 30 minutos.',
    },
    {
      key: 'administrativos',
      name: 'Administrativos',
      benefit: 'Planillas, resúmenes y tareas repetitivas resueltas en minutos.',
      photo: 'cafe',
      photoAlt: 'Una mujer revisa el celular con la notebook abierta',
      instruction:
        'Te pego una tabla con [ventas, gastos o stock] del mes. Decime en palabras simples qué subió, qué bajó, qué me tiene que preocupar y qué 3 decisiones tomarías. Sin fórmulas ni palabras técnicas. Tabla: [pegá acá]',
    },
  ],
}

export const program = {
  title: '150 minutos, 70% práctica',
  lead: '105 de los 150 minutos los pasás haciendo, no mirando.',
  modules: [
    {
      name: 'Cómo piensa la IA',
      text: 'Y por qué a veces responde mal. Lo justo para usarla con criterio.',
      minutes: 15,
      kind: 'concepto',
    },
    {
      name: 'Escribirle a la IA para que te entienda',
      text: 'La fórmula de 4 partes que cambia las respuestas que recibís.',
      minutes: 20,
      kind: 'practica',
    },
    { name: 'Tu asistente personal', text: 'Agenda, mails y números que se vuelven decisiones.', minutes: 30, kind: 'practica' },
    { name: 'Tus redes en una tarde', text: 'Ideas, posteos y el calendario del mes completo.', minutes: 25, kind: 'practica' },
    {
      name: 'Video profesional desde el celular',
      text: 'Guion, edición y subtítulos con IA, sin programas complicados.',
      minutes: 25,
      kind: 'practica',
    },
    {
      name: 'El mapa de herramientas',
      text: 'Cuál usar para cada cosa, y cuándo conviene pagar.',
      minutes: 10,
      kind: 'concepto',
    },
    {
      name: 'Tu plan de 7 días y preguntas en vivo',
      text: 'Salís con lo que vas a hacer cada día de la semana siguiente.',
      minutes: 25,
      kind: 'practica',
    },
  ] as const,
}

export const teacher = {
  title: 'Quién enseña',
  name: 'Sebastián Goiburo',
  role: 'Cofundador de Exacta',
  letter: [
    'Hace años que programo, automatizo procesos y hago marketing digital para negocios reales. Y en todo ese tiempo vi siempre lo mismo: quien más aprovecharía la tecnología es quien menos tiempo tiene para aprenderla.',
    'Por eso armé esta clase como me hubiera gustado que me la explicaran: sin palabras raras, con ejemplos de comercios, consultorios y oficinas, y con tiempo para que lo hagas a la par mío.',
    'No vas a salir sabiendo todo sobre inteligencia artificial. Vas a salir usándola en tu trabajo, que es lo que importa.',
  ],
  facts: [
    { big: 'Full stack', text: 'Programador y especialista en automatización.' },
    { big: 'Marketing y TV', text: 'Líder de marketing digital y comunicador con experiencia en televisión.' },
    { big: 'RestoUp y CuotaAlDía', text: 'Creador de las dos plataformas, que hoy usan negocios reales.' },
    { big: '20.300', text: 'personas lo siguen en Instagram.' },
    { big: '3 h → 20 min', text: 'Con Exacta, un consultorio pasó de 3 horas a 20 minutos por día de trabajo administrativo.' },
  ],
}

export const includes = {
  title: 'Qué incluye tu entrada',
  items: [
    { name: 'Clase en vivo de 2 h 30 por Google Meet', value: 45000 },
    { name: 'Grabación con acceso ilimitado', value: 15000 },
    { name: 'Guía de herramientas: cuál usar para cada tarea, gratis y pagas', value: 12000 },
    { name: '50 instrucciones listas para copiar', value: 18000 },
    { name: 'Plan de 7 días para empezar', value: 8000 },
    { name: 'Certificado de Exacta', value: 0 },
  ],
  guarantee: 'Si en los primeros 30 minutos sentís que no es para vos, te devolvemos todo. Sin preguntas.',
  payment: 'Pagás con Mercado Pago: crédito en cuotas, débito o dinero en cuenta. Emitimos factura C.',
  companies: '¿Querés capacitar a tu equipo? Hasta 30% de descuento para empresas.',
}

export const faqs = {
  title: 'Preguntas frecuentes',
  items: [
    { tab: 'Tecnología', q: '¿Necesito saber de tecnología?', a: 'No. Si usás WhatsApp, podés hacerla.' },
    {
      tab: 'Herramientas',
      q: '¿Las herramientas son pagas?',
      a: 'Trabajamos con versiones gratuitas y te mostramos cuándo conviene pagar y cuándo no.',
    },
    {
      tab: 'Celular',
      q: '¿Puedo seguirla desde el celular?',
      a: 'Sí, pero con computadora vas a poder practicar a la par.',
    },
    { tab: 'Grabación', q: '¿Y si no puedo ir en vivo?', a: 'Queda grabada y la ves cuando quieras, sin vencimiento.' },
    {
      tab: 'Acceso',
      q: '¿Cómo accedo?',
      a: 'Después de pagar te llega un mail con el enlace de Meet y la invitación para tu calendario. Te recordamos 24 horas y 1 hora antes.',
    },
    { tab: 'Factura', q: '¿Emiten factura?', a: 'Sí, factura C.' },
    {
      tab: 'Empresas',
      q: '¿Hay precio para empresas?',
      a: 'Sí, hasta 30% para equipos. Escribinos por WhatsApp y te armamos la propuesta.',
    },
  ],
}

export const closing = {
  title: 'Salís usando IA, no solo entendiéndola.',
  text: 'Una clase, dos horas y media, y la semana siguiente ya trabajás distinto.',
}

/** The photographs found in open collections, with the credit their licence asks for. */
export const photoCredits = [
  {
    who: 'Shixart1985',
    licence: 'CC BY 2.0',
    url: 'https://commons.wikimedia.org/wiki/File:Woman_reading_and_working_on_laptop_at_home.jpg',
  },
  { who: 'Carlos Ebert', licence: 'CC BY 2.0', url: 'https://www.flickr.com/photos/42042512@N00/8127414041' },
  { who: 'TanvirSdq', licence: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/Special:Redirect/page/203322430' },
]
