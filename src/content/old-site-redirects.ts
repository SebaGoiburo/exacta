/**
 * Pages of the old WordPress site with real content, pointed at their closest page here so they
 * keep what they earned on Google. The rest of that site was the template's demo content
 * (products, fictional team, sample projects), which should disappear: it answers 404.
 */
const TO: Record<string, string[]> = {
  '/soluciones/software-a-medida': [
    '/academia-virtual-elearning',
    '/ecommerce',
    '/sitios-web',
    '/software-y-diseno-web',
    '/services/software-web-apps',
  ],
  '/soluciones/automatizacion-e-ia': ['/chatbots', '/services/automatizaciones'],
  '/soluciones/captacion-de-clientes': ['/publicidad-digital-dirigida', '/services/publicidad'],
  '/soluciones/consultoria': ['/consultoria-en-transformacion-digital'],
  '/industrias/salud': ['/consultorio-psicologico-online'],
  '/#servicios': ['/soluciones-digitales', '/services'],
  '/#contacto': ['/contacts'],
  '/blog': ['/blog-classic', '/blog-grid'],
}

export const OLD_SITE_REDIRECTS = Object.entries(TO).flatMap(([destination, sources]) =>
  sources.map((source) => ({ source, destination, permanent: true })),
)
