import { useTranslations } from 'next-intl'

// Placeholder list taken from the current site; will move to the CMS.
const CLIENTS = [
  { name: 'Municipalidad de Santa Rosa', file: 'santa-rosa' },
  { name: 'Hospital Dr. Carlos Saporiti', file: 'hospital-saporiti' },
  { name: 'Sembrar', file: 'sembrar' },
  { name: 'Casa del Viento', file: 'casa-del-viento' },
  { name: 'Gestión, compensaciones y capital humano', file: 'gestion' },
  { name: 'Casa Plateau', file: 'casa-plateau' },
  { name: 'Unalome', file: 'unalome' },
  { name: 'Ya Hipotecas', file: 'yahipotecas' },
  { name: 'Fundación De Todo Corazón', file: 'de-todo-corazon' },
  { name: 'Estación del Sol 100.9', file: 'estacion-del-sol' },
]

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-14 pr-14 md:gap-20 md:pr-20" aria-hidden={hidden || undefined}>
      {CLIENTS.map((c) => (
        <li key={c.file}>
          <div
            role={hidden ? undefined : 'img'}
            aria-label={hidden ? undefined : c.name}
            className="logo-mask size-24 md:size-28"
            style={{
              maskImage: `url(/clients/${c.file}.webp)`,
              WebkitMaskImage: `url(/clients/${c.file}.webp)`,
            }}
          />
        </li>
      ))}
    </ul>
  )
}

export function ClientMarquee() {
  const t = useTranslations('clients')

  return (
    <section className="border-y border-line py-10" aria-label={t('label')}>
      <div className="container-x">
        <p className="eyebrow" data-reveal>
          {t('label')}
        </p>
      </div>
      <div className="marquee mt-6 overflow-hidden">
        <div className="marquee-track flex w-max">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  )
}
