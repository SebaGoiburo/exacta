export const site = {
  name: 'Exacta',
  legalName: 'Sebastián Darío Goiburo',
  cuit: '20-34889769-2',
  url: 'https://exactatransformaciondigital.com',
  email: 'contacto@exactatransformaciondigital.com',
  phoneDisplay: '+54 9 263 434-3034',
  whatsappNumber: '5492634343034',
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
