import type { Product } from './types'

export const products: Product[] = [
  {
    slug: 'restoup',
    name: 'RestoUp',
    tagline: {
      es: 'Sitio, reservas y atención automatizada para gastronomía.',
      en: 'Website, bookings and automated customer service for restaurants.',
    },
    body: {
      es: 'Un sitio web con menú, reservas online sin sobreventa y un agente de IA que responde consultas y toma reservas las 24 horas.',
      en: 'A website with a menu, online bookings with no overbooking, and an AI agent that answers questions and takes reservations 24/7.',
    },
    audience: { es: 'Restaurantes y negocios gastronómicos', en: 'Restaurants and food businesses' },
    features: {
      es: ['Agente IA con inbox humano', 'Menú online editable', 'Reservas sin sobreventa', 'Sitio web gastronómico'],
      en: ['AI agent with a human inbox', 'Editable online menu', 'Bookings with no overbooking', 'Restaurant website'],
    },
    href: 'https://restoup.com.ar',
    external: true,
    image: {
      src: '/products/restoup.webp',
      alt: { es: 'Página de inicio de RestoUp', en: 'RestoUp home page' },
    },
  },
  {
    slug: 'cuota-al-dia',
    name: 'Cuota Al Día',
    tagline: {
      es: 'Sabé quién pagó, quién debe y cuánto falta cobrar.',
      en: "Know who paid, who owes and how much is left to collect.",
    },
    body: {
      es: 'Gestión y cobro de cuotas para organizaciones: vencimientos, pagos online y presenciales, recordatorios y recaudación en un solo lugar.',
      en: 'Membership fee management for organizations: due dates, online and in-person payments, reminders and collections in one place.',
    },
    audience: {
      es: 'Clubes, bibliotecas populares, bomberos voluntarios y asociaciones',
      en: 'Clubs, community libraries, volunteer fire brigades and associations',
    },
    features: {
      es: ['Cuotas y vencimientos organizados', 'Pagos con Mercado Pago, efectivo y transferencia', 'Recordatorios por WhatsApp', 'Recaudación al día'],
      en: ['Organized dues and due dates', 'Mercado Pago, cash and bank transfer', 'WhatsApp reminders', 'Collections at a glance'],
    },
    href: 'https://cuotaaldia.com.ar',
    external: true,
    image: {
      src: '/products/cuota-al-dia.webp',
      alt: { es: 'Página de inicio de Cuota Al Día', en: 'Cuota Al Día home page' },
    },
  },
  {
    slug: 'plex-wordpress',
    name: 'Plex-WordPress',
    tagline: {
      es: 'Tu farmacia en Plex, tu tienda online en WordPress. Sincronizadas.',
      en: 'Your pharmacy in Plex, your online store in WordPress. In sync.',
    },
    body: {
      es: 'Integración del sistema farmacéutico Plex con WordPress y WooCommerce: catálogo, precios y stock se actualizan solos en la tienda online.',
      en: 'An integration between the Plex pharmacy system and WordPress with WooCommerce: catalog, prices and stock update themselves in the online store.',
    },
    audience: { es: 'Farmacias que usan Plex', en: 'Pharmacies running Plex' },
    features: {
      es: ['Catálogo sincronizado', 'Precios y stock al día', 'Tienda WooCommerce', 'Sin carga doble'],
      en: ['Synced catalog', 'Up-to-date prices and stock', 'WooCommerce store', 'No double data entry'],
    },
    href: '/productos/plex-wordpress',
    external: false,
  },
]
