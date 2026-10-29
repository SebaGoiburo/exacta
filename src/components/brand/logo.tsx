import { LOGO_MARK, LOGO_WORDMARK } from './logo-paths'

type Props = {
  className?: string
  /** Only the brain mark, without the wordmark. */
  markOnly?: boolean
  title?: string
}

/** Exacta logo. The wordmark uses currentColor so it adapts to the theme. */
export function Logo({ className, markOnly = false, title = 'Exacta' }: Props) {
  const viewBox = markOnly ? '30 135 221 180' : '30 135 680 180'
  const body = markOnly ? LOGO_MARK : LOGO_MARK + LOGO_WORDMARK

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      role="img"
      aria-label={title}
      className={className}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  )
}
