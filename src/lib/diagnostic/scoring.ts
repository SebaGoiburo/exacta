import { AREAS, QUESTIONS, type Area } from './questions'

export type Answers = Record<string, string>
export type Tier = 'A' | 'B' | 'C'

export type DiagnosticResult = {
  /** Visible to the person: overall digital maturity, 0 to 100. */
  maturity: number
  areas: Record<Area, number>
  /** Internal only: how well the company fits a high-value engagement, 0 to 100. */
  fit: number
  tier: Tier
}

/** Lower bounds of each tier. A goes straight to booking; C gets the report and no sales time. */
export const TIER_A_MIN = 60
export const TIER_B_MIN = 35

const FREE_EMAIL_PENALTY = 5
const FREE_EMAIL = /@(gmail|hotmail|outlook|live|yahoo|icloud|proton|protonmail)\./i

/** Returns the ids of unanswered or invalid questions. */
export function invalidAnswers(answers: Answers) {
  return QUESTIONS.filter((q) => !q.options.some((o) => o.id === answers[q.id])).map((q) => q.id)
}

export function scoreDiagnostic(answers: Answers, email = ''): DiagnosticResult {
  let fit = FREE_EMAIL.test(email) ? -FREE_EMAIL_PENALTY : 0
  const levels: Record<Area, number[]> = { processes: [], systems: [], data: [], customers: [], ai: [] }

  for (const question of QUESTIONS) {
    const option = question.options.find((o) => o.id === answers[question.id])
    if (!option) continue
    fit += option.fit ?? 0
    if (question.area) levels[question.area].push(option.level ?? 0)
  }

  const areas = Object.fromEntries(
    AREAS.map((area) => {
      const values = levels[area]
      const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
      return [area, Math.round((average / 3) * 100)]
    }),
  ) as Record<Area, number>

  const maturity = Math.round(AREAS.reduce((sum, area) => sum + areas[area], 0) / AREAS.length)
  const score = Math.max(0, Math.min(100, fit))

  // A stated budget below the minimum engagement rules out direct sales time, whatever the size.
  const tier: Tier =
    answers.budget === 'low' ? 'C' : score >= TIER_A_MIN ? 'A' : score >= TIER_B_MIN ? 'B' : 'C'

  return { maturity, areas, fit: score, tier }
}

/** Reading band for a 0 to 100 score. */
export type Band = 'low' | 'mid' | 'high'
export const bandOf = (score: number): Band => (score < 40 ? 'low' : score < 70 ? 'mid' : 'high')
