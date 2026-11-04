import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access'

/** Reminders for the agency's management: what's pending for its growth. Deleting one means it's done. */
export const ManagementTasks: CollectionConfig = {
  slug: 'management-tasks',
  labels: { singular: 'Tarea pendiente', plural: 'Tareas pendientes' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'description', 'updatedAt'],
    group: 'Gerencia',
  },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: 'createdAt',
  fields: [
    { name: 'title', type: 'text', label: 'Título', required: true },
    { name: 'description', type: 'textarea', label: 'Descripción' },
  ],
}
