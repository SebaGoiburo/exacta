import type { Access, FieldAccess, PayloadRequest } from 'payload'

type Role = 'admin' | 'editor' | 'integration'

const roleOf = (req: PayloadRequest) => (req.user as { role?: Role } | null)?.role

export const isAuthenticated: Access = ({ req }) => Boolean(req.user)

export const isAdmin: Access = ({ req }) => roleOf(req) === 'admin'

export const isAdminField: FieldAccess = ({ req }) => roleOf(req) === 'admin'

/** Public read, but drafts are only visible to signed-in users. */
export const publishedOrAuthenticated: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }

export const anyone: Access = () => true

/** Integration accounts (n8n) use the API but never the admin panel. */
export const canUseAdmin = ({ req }: { req: PayloadRequest }) => Boolean(req.user) && roleOf(req) !== 'integration'

export const isIntegration = (req: PayloadRequest) => roleOf(req) === 'integration'
