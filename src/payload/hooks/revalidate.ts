import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

export const cmsTag = (slug: string) => `cms:${slug}`

function revalidate(slug: string) {
  try {
    revalidateTag(cmsTag(slug), 'max')
  } catch {
    // Outside a Next.js request (seed script, CLI) there is no cache to invalidate.
  }
}

/** Marks the site's cached copy of a collection as stale whenever it changes in the CMS. */
export const revalidateCollection = (slug: string) => {
  const afterChange: CollectionAfterChangeHook = ({ doc }) => {
    revalidate(slug)
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = ({ doc }) => {
    revalidate(slug)
    return doc
  }
  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}
