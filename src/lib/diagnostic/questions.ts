import type { Localized } from '@/content/types'

export type Area = 'processes' | 'systems' | 'data' | 'customers' | 'ai'

export type Option = {
  id: string
  label: Localized
  /** Points toward "this company is a good fit". Never shown to the person answering. */
  fit?: number
  /** Maturity level from 0 (manual) to 3 (measured and automated). */
  level?: number
}

export type Question = {
  id: string
  /** Maturity questions feed the visible result. Profile questions only qualify the lead. */
  area?: Area
  title: Localized
  options: Option[]
}

const level = (es: string, en: string, value: number): Option => ({
  id: `l${value}`,
  label: { es, en },
  level: value,
})

export const QUESTIONS: Question[] = [
  {
    id: 'size',
    title: { es: '¿Cuántas personas trabajan en tu empresa?', en: 'How many people work at your company?' },
    options: [
      { id: 'xs', label: { es: '1 a 5', en: '1 to 5' }, fit: 0 },
      { id: 's', label: { es: '6 a 20', en: '6 to 20' }, fit: 10 },
      { id: 'm', label: { es: '21 a 50', en: '21 to 50' }, fit: 20 },
      { id: 'l', label: { es: '51 a 200', en: '51 to 200' }, fit: 28 },
      { id: 'xl', label: { es: 'Más de 200', en: 'More than 200' }, fit: 30 },
    ],
  },
  {
    id: 'industry',
    title: { es: '¿En qué rubro trabajan?', en: 'What industry are you in?' },
    options: [
      { id: 'health', label: { es: 'Salud', en: 'Healthcare' } },
      { id: 'retail', label: { es: 'Comercio y retail', en: 'Retail and commerce' } },
      { id: 'industry', label: { es: 'Industria y producción', en: 'Manufacturing' } },
      { id: 'agro', label: { es: 'Agro y vitivinicultura', en: 'Agriculture and wine' } },
      { id: 'services', label: { es: 'Servicios profesionales', en: 'Professional services' } },
      { id: 'other', label: { es: 'Otro', en: 'Other' } },
    ],
  },
  {
    id: 'role',
    title: { es: '¿Cuál es tu rol?', en: 'What is your role?' },
    options: [
      { id: 'owner', label: { es: 'Dueño o dirección', en: 'Owner or executive' }, fit: 15 },
      { id: 'manager', label: { es: 'Gerencia o jefatura', en: 'Manager or team lead' }, fit: 11 },
      { id: 'staff', label: { es: 'Parte del equipo', en: 'Team member' }, fit: 4 },
      { id: 'other', label: { es: 'Otro', en: 'Other' }, fit: 2 },
    ],
  },
  {
    id: 'processes-tasks',
    area: 'processes',
    title: {
      es: '¿Cómo se resuelven las tareas repetitivas del día a día?',
      en: 'How do repetitive day-to-day tasks get done?',
    },
    options: [
      level('A mano, cada persona a su manera', 'By hand, each person their own way', 0),
      level('A mano, con pasos definidos', 'By hand, following defined steps', 1),
      level('Algunas ya están automatizadas', 'Some are already automated', 2),
      level('Las principales corren solas y las supervisamos', 'The main ones run on their own and we supervise', 3),
    ],
  },
  {
    id: 'processes-time',
    area: 'processes',
    title: {
      es: '¿Cuánto tiempo del equipo se va en carga manual y controles?',
      en: 'How much of the team’s time goes to manual entry and checks?',
    },
    options: [
      level('Más de la mitad', 'More than half', 0),
      level('Entre un cuarto y la mitad', 'Between a quarter and a half', 1),
      level('Menos de un cuarto', 'Less than a quarter', 2),
      level('Casi nada', 'Almost none', 3),
    ],
  },
  {
    id: 'systems-link',
    area: 'systems',
    title: { es: '¿Cómo se conectan tus sistemas entre sí?', en: 'How do your systems connect with each other?' },
    options: [
      level('No se conectan: pasamos los datos a mano', 'They don’t: we move data by hand', 0),
      level('Exportamos e importamos archivos', 'We export and import files', 1),
      level('Algunos están integrados', 'Some are integrated', 2),
      level('Comparten los datos automáticamente', 'They share data automatically', 3),
    ],
  },
  {
    id: 'systems-sheets',
    area: 'systems',
    title: { es: '¿Qué lugar ocupan las planillas en la operación?', en: 'What place do spreadsheets have in operations?' },
    options: [
      level('Manejamos la operación con ellas', 'We run operations on them', 0),
      level('Varios procesos críticos dependen de ellas', 'Several critical processes depend on them', 1),
      level('Las usamos para análisis puntuales', 'We use them for occasional analysis', 2),
      level('Casi no las necesitamos', 'We barely need them', 3),
    ],
  },
  {
    id: 'data-answer',
    area: 'data',
    title: {
      es: 'Si hoy te piden la rentabilidad del último mes, ¿cuánto tardás en responder?',
      en: 'If someone asks for last month’s profitability today, how long does it take to answer?',
    },
    options: [
      level('No la sabemos con certeza', 'We don’t know it for certain', 0),
      level('Una semana o más', 'A week or more', 1),
      level('Uno o dos días', 'A day or two', 2),
      level('La vemos en un tablero actualizado', 'It’s on an up-to-date dashboard', 3),
    ],
  },
  {
    id: 'customers-sales',
    area: 'customers',
    title: { es: '¿Cómo gestionan las consultas y oportunidades de venta?', en: 'How do you manage inquiries and sales opportunities?' },
    options: [
      level('Por WhatsApp y de memoria', 'Over WhatsApp and from memory', 0),
      level('En una planilla', 'In a spreadsheet', 1),
      level('En un CRM que se usa a medias', 'In a CRM that’s half used', 2),
      level('En un CRM con seguimiento medido', 'In a CRM with measured follow-up', 3),
    ],
  },
  {
    id: 'customers-followup',
    area: 'customers',
    title: { es: '¿Qué pasa con un cliente potencial que deja de responder?', en: 'What happens when a prospect stops replying?' },
    options: [
      level('Se pierde', 'We lose them', 0),
      level('A veces alguien se acuerda', 'Sometimes someone remembers', 1),
      level('Tenemos recordatorios', 'We have reminders', 2),
      level('Entra en un seguimiento automático', 'They enter an automated follow-up', 3),
    ],
  },
  {
    id: 'ai-use',
    area: 'ai',
    title: { es: '¿Cómo usan hoy la inteligencia artificial?', en: 'How do you use artificial intelligence today?' },
    options: [
      level('No la usamos', 'We don’t', 0),
      level('Cada persona por su cuenta', 'Each person on their own', 1),
      level('En algunas tareas acordadas', 'In a few agreed tasks', 2),
      level('Integrada a procesos, con resultados medidos', 'Built into processes, with measured results', 3),
    ],
  },
  {
    id: 'budget',
    title: {
      es: 'Si aparece una oportunidad clara, ¿qué inversión podrían evaluar este año?',
      en: 'If a clear opportunity comes up, what investment could you consider this year?',
    },
    options: [
      { id: 'low', label: { es: 'Menos de USD 1.200', en: 'Under USD 1,200' }, fit: 0 },
      { id: 'mid', label: { es: 'USD 1.200 a 5.000', en: 'USD 1,200 to 5,000' }, fit: 15 },
      { id: 'high', label: { es: 'USD 5.000 a 15.000', en: 'USD 5,000 to 15,000' }, fit: 28 },
      { id: 'top', label: { es: 'Más de USD 15.000', en: 'More than USD 15,000' }, fit: 35 },
      { id: 'unknown', label: { es: 'Todavía no lo sé', en: 'I don’t know yet' }, fit: 10 },
    ],
  },
  {
    id: 'urgency',
    title: { es: '¿Cuándo quieren empezar?', en: 'When do you want to start?' },
    options: [
      { id: 'now', label: { es: 'Este trimestre', en: 'This quarter' }, fit: 20 },
      { id: 'soon', label: { es: 'En los próximos 6 meses', en: 'In the next 6 months' }, fit: 12 },
      { id: 'later', label: { es: 'Este año, sin apuro', en: 'This year, no rush' }, fit: 6 },
      { id: 'exploring', label: { es: 'Solo estamos explorando', en: 'We’re just exploring' }, fit: 0 },
    ],
  },
]

export const AREAS: Area[] = ['processes', 'systems', 'data', 'customers', 'ai']
