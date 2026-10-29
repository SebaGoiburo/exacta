import type { CaseStudy } from './types'

const placeholder = (n: number): CaseStudy => ({
  slug: `caso-${n}`,
  client: `Caso ${n}`,
  role: { es: 'Cliente a confirmar', en: 'Client to be confirmed' },
  placeholder: true,
  metric: {
    before: { es: '—', en: '—' },
    after: { es: '—', en: '—' },
    label: { es: 'Métrica antes y después', en: 'Before and after metric' },
  },
  challenge: {
    es: 'Acá va el desafío del cliente: cómo trabajaba antes, qué le costaba y por qué decidió cambiar.',
    en: "The client's challenge goes here: how they worked before, what it cost them and why they decided to change.",
  },
  solution: {
    es: 'Acá va la solución: qué construimos o integramos, y cómo cambió el día a día de su equipo.',
    en: 'The solution goes here: what we built or connected, and how it changed their team’s day-to-day work.',
  },
})

export const cases: CaseStudy[] = [
  {
    slug: 'soledad-greco',
    client: 'Lic. Soledad Greco',
    role: { es: 'Nutricionista', en: 'Nutritionist' },
    metric: {
      before: { es: '3 h', en: '3 h' },
      after: { es: '20 min', en: '20 min' },
      label: {
        es: 'de gestión manual a gestión automática',
        en: 'from manual admin to automated admin',
      },
    },
    challenge: {
      es: 'El consultorio gestionaba turnos, reprogramaciones, cancelaciones y tareas administrativas de forma 100% manual: horas de trabajo ajenas a la nutrición, ausentismo de pacientes, cobros manuales y margen de error.',
      en: 'The practice handled appointments, rescheduling, cancellations and admin work 100% by hand: hours spent on work unrelated to nutrition, patient no-shows, manual payments and room for error.',
    },
    solution: {
      es: 'Sobre un sitio web profesional montamos un sistema de turnos con pago online y notificaciones automáticas por email y WhatsApp. Hoy sus pacientes reservan, reciben recordatorios, cancelan o reprograman, y reciben su factura oficial de ARCA al momento de reservar.',
      en: 'On top of a professional website we set up a booking system with online payments and automatic email and WhatsApp notifications. Patients now book, get reminders, cancel or reschedule, and receive their official ARCA invoice as soon as they book.',
    },
    quote: {
      es: 'Cada turno, reprogramación y cancelación se llevaba buena parte del tiempo que hoy destino a atender a mis pacientes y a seguir capacitándome para estar a la vanguardia del conocimiento.',
      en: 'Every appointment, reschedule and cancellation took up much of the time I now spend seeing my patients and keeping my training at the forefront of my field.',
    },
    image: '/cases/soledad-greco.webp',
    links: [{ label: 'Instagram', href: 'https://www.instagram.com/licsoledadgreco/' }],
  },
  placeholder(2),
  placeholder(3),
  placeholder(4),
]
