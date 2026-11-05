import { LOGO_WORDMARK } from './logo-paths'

type Props = {
  className?: string
  title?: string
}

/**
 * Exacta logo. The wordmark uses currentColor so it adapts to the theme. The brain
 * mark has a fixed colour and weighs 20 KB, so it is a cached file, not inline markup.
 */
export function Logo({ className, title = 'Exacta' }: Props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="30 135 680 180" role="img" aria-label={title} className={className}>
      <image href="/brand/exacta-mark.svg" x="30" y="135" width="221" height="180" />
      <g dangerouslySetInnerHTML={{ __html: LOGO_WORDMARK }} />
    </svg>
  )
}
