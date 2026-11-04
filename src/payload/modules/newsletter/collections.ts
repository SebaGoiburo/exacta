import type { CollectionConfig } from 'payload'
import { isAdmin, isPersonAccess } from '../../access'

/** People who asked to receive the articles. Only those who confirmed their email get them. */
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: { singular: 'Suscriptor', plural: 'Suscriptores' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'confirmedAt', 'page'],
    group: 'Marketing',
  },
  access: { read: isPersonAccess, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    { name: 'email', type: 'email', label: 'Email', required: true, unique: true, index: true },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      required: true,
      defaultValue: 'pendiente',
      index: true,
      options: [
        { label: 'Sin confirmar', value: 'pendiente' },
        { label: 'Confirmado', value: 'confirmado' },
        { label: 'Dado de baja', value: 'baja' },
      ],
    },
    { name: 'locale', type: 'text', label: 'Idioma', defaultValue: 'es' },
    { name: 'page', type: 'text', label: 'Página donde se suscribió' },
    { name: 'confirmedAt', type: 'date', label: 'Confirmó el' },
    {
      name: 'token',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { read: () => false, update: () => false },
      admin: { hidden: true },
    },
  ],
}
