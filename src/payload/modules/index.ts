import type { CollectionConfig, GlobalConfig } from 'payload'
import { Media } from './core/media'
import { Users } from './core/users'
import { Integrations } from './core/integrations'
import { Settings } from './core/settings'
import { Posts } from './content/posts'
import { CaseStudies, Faqs, Products, TeamMembers } from './content/collections'
import { Contacts, Leads } from './crm/collections'
import { ConversationMessages, Conversations, Knowledge } from './conversations/collections'
import { Diagnostics, Prospects } from './marketing/collections'
import { ManagementTasks } from './management/collections'
import { ContentJobs, ContentPieces, ContentTopics } from './content-engine/collections'
import { Subscribers } from './newsletter/collections'

/**
 * Backend modules. Each business function the site serves is a module with its own
 * collections and globals. To add one: create a folder next to these,
 * export a module from it and list it here.
 */
export type BackendModule = { name: string; collections: CollectionConfig[]; globals?: GlobalConfig[] }

export const modules: BackendModule[] = [
  { name: 'core', collections: [Users, Integrations, Media], globals: [Settings] },
  { name: 'content', collections: [Posts, CaseStudies, Products, TeamMembers, Faqs] },
  { name: 'crm', collections: [Contacts, Leads] },
  { name: 'marketing', collections: [Diagnostics, Prospects] },
  { name: 'conversations', collections: [Conversations, ConversationMessages, Knowledge] },
  { name: 'management', collections: [ManagementTasks] },
  { name: 'content-engine', collections: [ContentTopics, ContentPieces, ContentJobs] },
  { name: 'newsletter', collections: [Subscribers] },
]
