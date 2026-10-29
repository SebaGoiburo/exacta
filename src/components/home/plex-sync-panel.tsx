import type { Locale } from '@/i18n/routing'

// Interface fragment for Plex-WordPress until its landing exists: what the sync looks like.
// Rows are sample data and labelled as such.
const ROWS = [
  { name: 'Ibuprofeno 400 mg x 20', price: '4.850', stock: 38 },
  { name: 'Protector solar FPS 50 200 ml', price: '21.300', stock: 12 },
  { name: 'Shampoo dermatológico 250 ml', price: '15.990', stock: 0 },
  { name: 'Vitamina D3 x 30 cáps.', price: '9.420', stock: 24 },
  { name: 'Alcohol en gel 500 ml', price: '3.780', stock: 61 },
]

const L = {
  es: { title: 'Sincronización Plex → WooCommerce', product: 'Producto', price: 'Precio', stock: 'Stock', ok: 'Sincronizado hace 2 min', out: 'Sin stock' },
  en: { title: 'Plex → WooCommerce sync', product: 'Product', price: 'Price', stock: 'Stock', ok: 'Synced 2 min ago', out: 'Out of stock' },
}

export function PlexSyncPanel({ exampleLabel, locale }: { exampleLabel: string; locale: Locale }) {
  const l = L[locale]
  return (
    <div data-ui className="overflow-hidden bg-bg-elev p-5 text-[13px] sm:aspect-[1140/670] sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-ink">{l.title}</p>
        <p className="flex items-center gap-2 text-ink-soft">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          {l.ok}
        </p>
      </div>
      <table className="mt-5 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-ink-mute">
            <th className="py-2 font-medium">{l.product}</th>
            <th className="py-2 text-right font-medium">{l.price}</th>
            <th className="py-2 text-right font-medium">{l.stock}</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.name} className="border-b border-line text-ink">
              <td className="py-2.5 pr-3">{r.name}</td>
              <td className="py-2.5 text-right whitespace-nowrap tabular-nums">$ {r.price}</td>
              <td className={`py-2.5 text-right tabular-nums ${r.stock === 0 ? 'text-ink-mute' : ''}`}>
                {r.stock === 0 ? l.out : r.stock}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right text-[11px] text-ink-mute">{exampleLabel}</p>
    </div>
  )
}
