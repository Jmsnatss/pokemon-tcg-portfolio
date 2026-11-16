export const GRADING_COMPANIES = ['PSA', 'BGS', 'CGC'] as const
export type GradingCompanyCode = (typeof GRADING_COMPANIES)[number]

/**
 * PSA: whole grades 1-10. BGS: 1-10 in half steps. CGC: 0.5-10 in half steps.
 * Grades are always user-entered; they are never inferred from an image.
 */
export function isValidGrade(company: GradingCompanyCode, grade: number): boolean {
  if (!Number.isFinite(grade) || grade > 10) return false
  switch (company) {
    case 'PSA':
      return Number.isInteger(grade) && grade >= 1
    case 'BGS':
      return grade >= 1 && Number.isInteger(grade * 2)
    case 'CGC':
      return grade >= 0.5 && Number.isInteger(grade * 2)
  }
}
