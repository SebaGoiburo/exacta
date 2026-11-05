import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { withPayload } from '@payloadcms/next/withPayload'
import { OLD_SITE_REDIRECTS } from './src/content/old-site-redirects'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Self-contained server bundle for the VPS (copied into the Docker image).
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [
      { pathname: '/api/media/file/**' },
      { pathname: '/products/**' },
      { pathname: '/cases/**' },
      { pathname: '/clients/**' },
    ],
  },
  turbopack: { root: path.resolve(dirname) },
  redirects: () => OLD_SITE_REDIRECTS,
}

const config = withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
const payloadHeaders = config.headers

// Payload asks every route for a colour scheme hint. It marks the hint as critical,
// which makes Chrome request each first page twice, and only the admin panel reads it.
config.headers = async () =>
  (await payloadHeaders?.())?.map((rule) => (rule.source === '/:path*' ? { ...rule, source: '/admin/:path*' } : rule)) ?? []

export default config
