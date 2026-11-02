import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../../access'

const crmAccess = { read: isAuthenticated, create: isAuthenticated, update: isAuthenticated, delete: isAuthenticated }

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

/**
 * Companies found with Google Places. Google only allows storing the place ID indefinitely,
 * so names and phones are requested again when shown; everything else here is our own data.
 */
export const Prospects: CollectionConfig = {
  slug: 'prospects',
  labels: { singular: 'Prospecto', plural: 'Prospectos' },
  admin: {
    useAsTitle: 'placeId',
    defaultColumns: ['niche', 'zone', 'status', 'createdAt'],
    group: 'Marketing',
    description: 'Se buscan y gestionan desde Prospección. El contacto siempre lo hace una persona.',
  },
  access: crmAccess,
  defaultSort: '-createdAt',
  fields: [
    { name: 'placeId', type: 'text', label: 'ID de Google', required: true, unique: true, index: true, admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        { name: 'niche', type: 'text', label: 'Nicho' },
        { name: 'zone', type: 'text', label: 'Zona' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      defaultValue: 'pendiente',
      required: true,
      options: [
        { label: 'Pendiente', value: 'pendiente' },
        { label: 'Contactado', value: 'contactado' },
        { label: 'Interesado', value: 'interesado' },
        { label: 'Descartado', value: 'descartado' },
      ],
    },
    { name: 'notes', type: 'textarea', label: 'Notas' },
    { name: 'lead', type: 'relationship', relationTo: 'leads', label: 'Oportunidad' },
  ],
}
