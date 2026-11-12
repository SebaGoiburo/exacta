import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../../access'

/** One completed diagnostic. Created by the public form; the token opens its result page. */
export const Diagnostics: CollectionConfig = {
  slug: 'diagnostics',
  labels: { singular: 'Diagnóstico', plural: 'Diagnósticos' },
  admin: {
    useAsTitle: 'token',
    defaultColumns: ['contact', 'tier', 'fit', 'maturity', 'createdAt'],
    group: 'Marketing',
  },
  access: { read: isAuthenticated, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    { name: 'token', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'contact', type: 'relationship', relationTo: 'contacts', label: 'Contacto', required: true },
    { name: 'lead', type: 'relationship', relationTo: 'leads', label: 'Oportunidad' },
    {
      type: 'row',
      fields: [
        {
          name: 'tier',
          type: 'select',
          label: 'Perfil',
          required: true,
          options: [
            { label: 'A · Alto valor', value: 'A' },
            { label: 'B · A evaluar', value: 'B' },
            { label: 'C · Fuera de perfil', value: 'C' },
          ],
        },
        { name: 'fit', type: 'number', label: 'Ajuste al perfil (0-100)', required: true },
        { name: 'maturity', type: 'number', label: 'Madurez digital (0-100)', required: true },
      ],
    },
    {
      name: 'locale',
      type: 'select',
      label: 'Idioma',
      defaultValue: 'es',
      options: [
        { label: 'Español', value: 'es' },
        { label: 'English', value: 'en' },
      ],
    },
    { name: 'areas', type: 'json', label: 'Puntaje por área', required: true },
    { name: 'answers', type: 'json', label: 'Respuestas', required: true },
  ],
}
