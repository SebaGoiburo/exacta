import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../../access'
import { n8nEvents } from '../../hooks/n8n-events'

/*
 * Basic CRM. Field names follow Odoo's model (res.partner / crm.lead) so a later
 * Odoo sync is a mapping in n8n, not a migration. `odoo*Id` fields hold the link.
 */

const crmAccess = { read: isAuthenticated, create: isAuthenticated, update: isAuthenticated, delete: isAuthenticated }

export const SOURCES = [
  { label: 'Formulario web', value: 'web-contacto' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Referido', value: 'referido' },
  { label: 'Carga manual', value: 'manual' },
  { label: 'Automatización (n8n)', value: 'n8n' },
]

export const STAGES = [
  { label: 'Nuevo', value: 'nuevo' },
  { label: 'Contactado', value: 'contactado' },
  { label: 'Diagnóstico agendado', value: 'diagnostico' },
  { label: 'Propuesta enviada', value: 'propuesta' },
  { label: 'Ganado', value: 'ganado' },
  { label: 'Perdido', value: 'perdido' },
]

export const Contacts: CollectionConfig = {
  slug: 'contacts',
  labels: { singular: 'Contacto', plural: 'Contactos' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'company', 'email', 'phone', 'createdAt'],
    group: 'CRM',
  },
  access: crmAccess,
  hooks: n8nEvents('contacts'),
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true },
    {
      type: 'row',
      fields: [
        { name: 'email', type: 'email', label: 'Email', index: true },
        { name: 'phone', type: 'text', label: 'Teléfono / WhatsApp' },
      ],
    },
    { name: 'company', type: 'text', label: 'Empresa u organización' },
    { name: 'source', type: 'select', label: 'Origen', options: SOURCES, defaultValue: 'manual' },
    { name: 'notes', type: 'textarea', label: 'Notas' },
    {
      name: 'leads',
      type: 'join',
      label: 'Oportunidades',
      collection: 'leads',
      on: 'contact',
    },
    {
      name: 'odooPartnerId',
      type: 'number',
      label: 'ID en Odoo (res.partner)',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Oportunidad', plural: 'Oportunidades' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'contact', 'stage', 'priority', 'createdAt'],
    group: 'CRM',
    listSearchableFields: ['title', 'message', 'interest'],
  },
  access: crmAccess,
  defaultSort: '-createdAt',
  hooks: n8nEvents('leads', ({ doc, previousDoc }) => (doc.stage !== previousDoc?.stage ? ['stage_changed'] : [])),
  fields: [
    { name: 'title', type: 'text', label: 'Título', required: true },
    { name: 'contact', type: 'relationship', relationTo: 'contacts', label: 'Contacto', required: true },
    {
      type: 'row',
      fields: [
        { name: 'stage', type: 'select', label: 'Etapa', options: STAGES, defaultValue: 'nuevo', required: true },
        {
          name: 'priority',
          type: 'select',
          label: 'Prioridad',
          defaultValue: '1',
          options: [
            { label: 'Baja', value: '0' },
            { label: 'Normal', value: '1' },
            { label: 'Alta', value: '2' },
            { label: 'Muy alta', value: '3' },
          ],
        },
      ],
    },
    { name: 'interest', type: 'text', label: 'Interés' },
    { name: 'message', type: 'textarea', label: 'Mensaje del contacto' },
    { name: 'expectedRevenue', type: 'number', label: 'Ingreso esperado (ARS)' },
    {
      name: 'lostReason',
      type: 'textarea',
      label: 'Motivo de pérdida',
      admin: { condition: (data) => data?.stage === 'perdido' },
    },
    {
      name: 'activity',
      type: 'array',
      label: 'Actividad',
      labels: { singular: 'Actividad', plural: 'Actividades' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'type',
              type: 'select',
              label: 'Tipo',
              defaultValue: 'nota',
              options: [
                { label: 'Nota', value: 'nota' },
                { label: 'Llamada', value: 'llamada' },
                { label: 'WhatsApp', value: 'whatsapp' },
                { label: 'Email', value: 'email' },
                { label: 'Reunión', value: 'reunion' },
              ],
            },
            { name: 'date', type: 'date', label: 'Fecha', defaultValue: () => new Date().toISOString() },
          ],
        },
        { name: 'text', type: 'textarea', label: 'Detalle', required: true },
      ],
    },
    { name: 'assignedTo', type: 'relationship', relationTo: 'users', label: 'Responsable', admin: { position: 'sidebar' } },
    { name: 'source', type: 'select', label: 'Origen', options: SOURCES, defaultValue: 'manual', admin: { position: 'sidebar' } },
    { name: 'page', type: 'text', label: 'Página de origen', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'locale',
      type: 'select',
      label: 'Idioma',
      defaultValue: 'es',
      options: [
        { label: 'Español', value: 'es' },
        { label: 'English', value: 'en' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'odooLeadId',
      type: 'number',
      label: 'ID en Odoo (crm.lead)',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
