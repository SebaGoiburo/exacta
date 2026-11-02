import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Skip the API, the Payload admin, Next internals, static files and share images.
  // Share images keep their /es/ path: redirecting it would break previews on social networks.
  matcher: '/((?!api|admin|_next|_vercel|.*\\..*|.*opengraph-image).*)',
}
