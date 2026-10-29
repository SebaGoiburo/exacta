// Content shapes mirror the future Payload collections (localized fields as { es, en }),
// so swapping these local files for CMS queries only touches src/lib/content.ts.

export type Localized<T = string> = { es: T; en: T }

export type Product = {
  slug: string
  name: string
  tagline: Localized
  body: Localized
  audience: Localized
  features: Localized<string[]>
  href: string
  external: boolean
  image?: { src: string; alt: Localized }
}

export type CaseStudy = {
  slug: string
  client: string
  role: Localized
  placeholder?: boolean
  metric: { before: Localized; after: Localized; label: Localized }
  challenge: Localized
  solution: Localized
  quote?: Localized
  image?: string
  links?: { label: string; href: string }[]
}

export type TeamMember = {
  name: string
  role: Localized
  placeholder?: boolean
  photo?: string
  linkedin?: string
}

export type Faq = { q: Localized; a: Localized }

/** Seed shape for sample articles (plain paragraphs, converted to rich text on import). */
export type Post = {
  slug: string
  sample?: boolean
  date: string
  readingMinutes: number
  title: Localized
  excerpt: Localized
  body: Localized<string[]>
}

/** Article as the site renders it, read from the CMS. Content is Lexical rich text. */
export type Article = Omit<Post, 'body'> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Localized<any>
}
