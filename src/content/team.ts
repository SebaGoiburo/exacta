import type { TeamMember } from './types'

const toConfirm = { es: 'Rol a confirmar', en: 'Role to be confirmed' }

export const team: TeamMember[] = [
  { name: 'Sebastián Goiburo', role: toConfirm },
  { name: 'Gabriela Becerra', role: toConfirm },
  { name: 'Integrante 3', role: toConfirm, placeholder: true },
  { name: 'Integrante 4', role: toConfirm, placeholder: true },
  { name: 'Integrante 5', role: toConfirm, placeholder: true },
]
