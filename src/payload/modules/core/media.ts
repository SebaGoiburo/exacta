import path from 'node:path'
import type { CollectionConfig } from 'payload'
import { anyone, isAuthenticated } from '../../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Archivo', plural: 'Archivos' },
  admin: { group: 'Sistema' },
  access: { read: anyone, create: isAuthenticated, update: isAuthenticated, delete: isAuthenticated },
  upload: {
    staticDir: path.resolve(process.cwd(), 'media'),
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'card', width: 800 },
      { name: 'large', width: 1600 },
    ],
  },
  fields: [{ name: 'alt', type: 'text', label: 'Texto alternativo', required: true, localized: true }],
}
