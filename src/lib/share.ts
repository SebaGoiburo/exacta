export type ShareLink = { network: 'linkedin' | 'whatsapp' | 'x' | 'facebook' | 'email'; href: string }

/** Plain share links: no third-party scripts, and they work without JavaScript. */
export function shareLinks(url: string, title: string, excerpt = ''): ShareLink[] {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  const body = encodeURIComponent([excerpt, url].filter(Boolean).join('\n\n'))
  return [
    { network: 'linkedin', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { network: 'whatsapp', href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { network: 'x', href: `https://x.com/intent/post?url=${u}&text=${t}` },
    { network: 'facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { network: 'email', href: `mailto:?subject=${t}&body=${body}` },
  ]
}
