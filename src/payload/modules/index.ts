import type { CollectionConfig } from 'payload'
import { Media } from './core/media'
import { Users } from './core/users'
import { Integrations } from './core/integrations'
import { Posts } from './content/posts'
import { CaseStudies, Faqs, Products, TeamMembers } from './content/collections'
import { Contacts, Leads } from './crm/collections'

/**
 * Backend modules. Each business function the site serves is a module with its own
 * collections (and later globals or endpoints). To add one: create a folder next to these,
 * export a module from it and list it here.
 */
export type BackendModule = { name: string; collections: CollectionConfig[] }

export const modules: BackendModule[] = [
  { name: 'core', collections: [Users, Integrations, Media] },
  { name: 'content', collections: [Posts, CaseStudies, Products, TeamMembers, Faqs] },
  { name: 'crm', collections: [Contacts, Leads] },
]
