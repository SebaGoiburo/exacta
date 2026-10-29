export const site = {
  name: 'Exacta',
  url: 'https://exactatransformaciondigital.com',
  email: 'contacto@exactatransformaciondigital.com',
  phoneDisplay: '+54 261 691-8593',
  whatsappNumber: '5492616918593',
  city: 'Mendoza, Argentina',
  social: {
    instagram: 'https://www.instagram.com/exacta_agencia/',
    linkedin: 'https://www.linkedin.com/company/exacta-transformaci%C3%B3n-digital',
    facebook: 'https://www.facebook.com/agencia.exacta.comunicaciondigital',
  },
} as const

export function whatsappLink(message: string) {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`
}
