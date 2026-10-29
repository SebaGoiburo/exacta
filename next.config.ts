import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import { withPayload } from '@payloadcms/next/withPayload'

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
}

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
