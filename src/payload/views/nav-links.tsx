import Link from 'next/link'

const LINKS = [
  { href: '/admin/pipeline', label: 'Pipeline' },
  { href: '/admin/conversaciones', label: 'Conversaciones' },
  { href: '/admin/prospeccion', label: 'Prospección' },
]

/** Work screens that aren't collections. They go first in the side menu because they're used daily. */
export function NavLinks() {
  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="nav__link" prefetch={false}>
          <span className="nav__link-label">{link.label}</span>
        </Link>
      ))}
    </div>
  )
}
