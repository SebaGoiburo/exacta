import type { Field } from 'payload'

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/** URL slug, filled from another field when left empty. */
export const slugField = (from = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  label: 'Slug (URL)',
  admin: { position: 'sidebar', description: 'Se genera solo a partir del título si lo dejás vacío.' },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.trim()) return slugify(value)
        const source = data?.[from]
        // Localized source fields arrive as a string for the current locale.
        return typeof source === 'string' ? slugify(source) : value
      },
    ],
  },
})

/** Manual ordering for lists shown on the site (lower first). */
export const orderField: Field = {
  name: 'order',
  type: 'number',
  defaultValue: 100,
  label: 'Orden',
  admin: { position: 'sidebar', description: 'Menor número = aparece primero.' },
}
