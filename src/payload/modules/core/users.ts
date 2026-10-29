import type { CollectionConfig } from 'payload'
import { canUpdateUser, isAdmin, isAdminField, isPersonAccess } from '../../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario', plural: 'Usuarios' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
    group: 'Sistema',
  },
  auth: true,
  access: {
    read: isPersonAccess,
    create: isAdmin,
    update: canUpdateUser,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre' },
    {
      name: 'role',
      type: 'select',
      label: 'Rol',
      required: true,
      defaultValue: 'admin',
      access: { update: isAdminField },
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
