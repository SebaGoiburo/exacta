import type { Access, FieldAccess, PayloadRequest } from 'payload'

type Role = 'admin' | 'editor'

/** People sign in to the panel from `users`; systems like n8n use API keys from `integrations`. */
const isPerson = (req: PayloadRequest) => req.user?.collection === 'users'

const roleOf = (req: PayloadRequest) => (isPerson(req) ? (req.user as { role?: Role }).role : undefined)

export const isAuthenticated: Access = ({ req }) => Boolean(req.user)

export const isAdmin: Access = ({ req }) => roleOf(req) === 'admin'

export const isAdminField: FieldAccess = ({ req }) => roleOf(req) === 'admin'

export const isPersonAccess: Access = ({ req }) => isPerson(req)

/** Public read, but drafts are only visible to signed-in users and integrations. */
export const publishedOrAuthenticated: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }

export const anyone: Access = () => true

export const isIntegration = (req: PayloadRequest) => req.user?.collection === 'integrations'

export const canUpdateUser: Access = ({ req, id }) => roleOf(req) === 'admin' || (isPerson(req) && req.user?.id === id)
