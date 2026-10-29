import type { CollectionConfig } from 'payload'
import { anyone, isAuthenticated } from '../../access'
import { orderField, slugField } from '../../fields'
import { revalidateCollection } from '../../hooks/revalidate'

const editable = { read: anyone, create: isAuthenticated, update: isAuthenticated, delete: isAuthenticated }

export const CaseStudies: CollectionConfig = {
  slug: 'cases',
  labels: { singular: 'Caso de éxito', plural: 'Casos de éxito' },
  admin: { useAsTitle: 'client', defaultColumns: ['client', 'order', 'placeholder'], group: 'Contenido' },
  access: editable,
  defaultSort: 'order',
  hooks: revalidateCollection('cases'),
  fields: [
    { name: 'client', type: 'text', label: 'Cliente', required: true },
    slugField('client'),
    orderField,
    {
      name: 'placeholder',
      type: 'checkbox',
      label: 'Es un caso de relleno',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Se muestra atenuado como “Caso en preparación”.' },
    },
    { name: 'role', type: 'text', label: 'Rubro o rol del cliente', localized: true },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Foto' },
    {
      type: 'row',
      fields: [
        { name: 'metricBefore', type: 'text', label: 'Antes', localized: true, admin: { width: '33%' } },
        { name: 'metricAfter', type: 'text', label: 'Después', localized: true, admin: { width: '33%' } },
        { name: 'metricLabel', type: 'text', label: 'Qué se midió', localized: true, admin: { width: '34%' } },
      ],
    },
    { name: 'challenge', type: 'textarea', label: 'El desafío', localized: true },
    { name: 'solution', type: 'textarea', label: 'La solución', localized: true },
    { name: 'quote', type: 'textarea', label: 'Testimonio', localized: true },
    {
      name: 'links',
      type: 'array',
      label: 'Links',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
      ],
    },
  ],
}

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Producto', plural: 'Productos' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'href', 'order'], group: 'Contenido' },
  access: editable,
  defaultSort: 'order',
  hooks: revalidateCollection('products'),
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true },
    slugField('name'),
    orderField,
    { name: 'tagline', type: 'text', label: 'Frase principal', localized: true },
    { name: 'body', type: 'textarea', label: 'Descripción', localized: true },
    { name: 'audience', type: 'text', label: 'Para quién es', localized: true },
    {
      name: 'features',
      type: 'array',
      label: 'Funciones destacadas',
      localized: true,
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'href',
      type: 'text',
      label: 'Link a la landing',
      required: true,
      admin: { description: 'URL externa (https://…) o ruta interna del sitio (/productos/…).' },
    },
    { name: 'external', type: 'checkbox', label: 'Abre otro sitio', defaultValue: true },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Captura',
      admin: { description: 'Sin imagen se muestra el panel de ejemplo de Plex-WordPress.' },
    },
  ],
}

export const TeamMembers: CollectionConfig = {
  slug: 'team',
  labels: { singular: 'Integrante', plural: 'Equipo' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'role', 'order'], group: 'Contenido' },
  access: editable,
  defaultSort: 'order',
  hooks: revalidateCollection('team'),
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true },
    orderField,
    { name: 'placeholder', type: 'checkbox', label: 'Es de relleno', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'role', type: 'text', label: 'Rol', localized: true },
    { name: 'photo', type: 'upload', relationTo: 'media', label: 'Foto' },
    { name: 'linkedin', type: 'text', label: 'LinkedIn' },
  ],
}

export const Faqs: CollectionConfig = {
  slug: 'faqs',
  labels: { singular: 'Pregunta frecuente', plural: 'Preguntas frecuentes' },
  admin: { useAsTitle: 'question', defaultColumns: ['question', 'order'], group: 'Contenido' },
  access: editable,
  defaultSort: 'order',
  hooks: revalidateCollection('faqs'),
  fields: [
    { name: 'question', type: 'text', label: 'Pregunta', required: true, localized: true },
    { name: 'answer', type: 'textarea', label: 'Respuesta', required: true, localized: true },
    orderField,
  ],
}
