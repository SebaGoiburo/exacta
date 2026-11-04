const WEEKS_PER_MONTH = 52 / 12
const HOURS_PER_WORKDAY = 8
const HOURS_PER_FULL_TIME_MONTH = 160

export type ManualCostInput = { hoursPerWeek: number; people: number; hourlyCost: number }

export type ManualCost = { hoursPerMonth: number; workdays: number; fullTimePeople: number; costPerMonth: number }

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

/** What a manual task takes up today. Plain arithmetic on the visitor's numbers: not a savings promise. */
export function manualCost({ hoursPerWeek, people, hourlyCost }: ManualCostInput): ManualCost {
  const exact = positive(hoursPerWeek) * positive(people) * WEEKS_PER_MONTH
  const hoursPerMonth = Math.round(exact)
  return {
    hoursPerMonth,
    workdays: Math.round(exact / HOURS_PER_WORKDAY),
    fullTimePeople: Math.round((exact / HOURS_PER_FULL_TIME_MONTH) * 10) / 10,
    costPerMonth: Math.round(exact * positive(hourlyCost)),
  }
}
