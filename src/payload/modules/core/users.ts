import type { CollectionConfig } from 'payload'
import { canUseAdmin, isAdmin, isAdminField, isAuthenticated } from '../../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuario', plural: 'Usuarios' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
    group: 'Sistema',
  },
  // API keys let n8n authenticate with: Authorization: users API-Key <key>
  auth: { useAPIKey: true },
  access: {
    admin: canUseAdmin,
    read: isAuthenticated,
    create: isAdmin,
    update: ({ req, id }) => (req.user as { role?: string } | null)?.role === 'admin' || req.user?.id === id,
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
        { label: 'Integración (n8n, sin acceso al panel)', value: 'integration' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
