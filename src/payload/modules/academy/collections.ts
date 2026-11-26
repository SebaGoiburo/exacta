import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminField, isAuthenticated } from '../../access'

/*
 * IA para Humanos, Exacta's training unit: paid masterclasses sold from their own landing with Mercado Pago.
 * Each masterclass sets its date, seats and price tiers here; the landing shows the one that is open.
 */

const nobody = () => false

export const Masterclasses: CollectionConfig = {
  slug: 'masterclasses',
  labels: { singular: 'Masterclass', plural: 'Masterclasses' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'startsAt', 'status', 'capacity'],
    group: 'IA para Humanos',
    description: 'La página /ia-para-humanos muestra la masterclass abierta más próxima.',
  },
  access: { read: isAuthenticated, create: isAdmin, update: isAuthenticated, delete: isAdmin },
  fields: [
    { name: 'title', type: 'text', label: 'Nombre', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          label: 'Estado',
          required: true,
          defaultValue: 'borrador',
          options: [
            { label: 'Borrador (no se vende)', value: 'borrador' },
            { label: 'Abierta (se vende)', value: 'abierta' },
            { label: 'Cerrada', value: 'cerrada' },
          ],
          admin: { width: '33%' },
        },
        {
          name: 'startsAt',
          type: 'date',
          label: 'Día y hora (Argentina)',
          required: true,
          admin: { width: '33%', date: { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm', displayFormat: 'd/M/yyyy HH:mm' } },
        },
        { name: 'durationMin', type: 'number', label: 'Duración (minutos)', defaultValue: 150, admin: { width: '33%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'capacity',
          type: 'number',
          label: 'Cupo anunciado',
          required: true,
          defaultValue: 30,
          admin: { width: '33%' },
        },
        {
          name: 'releasedSeats',
          type: 'number',
          label: 'Lugares liberados',
          defaultValue: 0,
          admin: {
            width: '33%',
            description: 'Si se llena el cupo, sumá lugares acá: la página avisa "Abrimos X lugares más".',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'launchSeats',
          type: 'number',
          label: 'Lugares a precio de lanzamiento',
          defaultValue: 10,
          admin: { width: '33%' },
        },
        {
          name: 'launchPrice',
          type: 'number',
          label: 'Precio de lanzamiento (ARS)',
          defaultValue: 35000,
          admin: { width: '33%' },
        },
        {
          name: 'price',
          type: 'number',
          label: 'Precio después (ARS)',
          required: true,
          defaultValue: 45000,
          admin: { width: '33%' },
        },
      ],
    },
    {
      name: 'meetUrl',
      type: 'text',
      label: 'Enlace de Google Meet',
      admin: {
        description: 'Va en el mail de confirmación y en los recordatorios. Si falta 24 horas antes, se avisa al equipo.',
      },
    },
    {
      name: 'recordingUrl',
      type: 'text',
      label: 'Enlace a la grabación',
      admin: { description: 'Para mandar después de la clase.' },
    },
    {
      name: 'enrollments',
      type: 'join',
      label: 'Inscripciones',
      collection: 'enrollments',
      on: 'masterclass',
      defaultSort: '-createdAt',
    },
  ],
}

export const Enrollments: CollectionConfig = {
  slug: 'enrollments',
  labels: { singular: 'Inscripción', plural: 'Inscripciones' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'phone', 'status', 'amount', 'createdAt'],
    group: 'IA para Humanos',
    listSearchableFields: ['name', 'email', 'phone'],
    description:
      'Las pendientes empezaron la inscripción y no pagaron todavía: escribiles por WhatsApp, muchas se recuperan así.',
  },
  access: { read: isAuthenticated, create: nobody, update: isAuthenticated, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Nombre', required: true },
        { name: 'email', type: 'email', label: 'Email', required: true, index: true },
        { name: 'phone', type: 'text', label: 'WhatsApp', required: true },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          label: 'Estado',
          required: true,
          defaultValue: 'pendiente',
          index: true,
          options: [
            { label: 'Pendiente de pago', value: 'pendiente' },
            { label: 'Pagada', value: 'pagada' },
            { label: 'Pago rechazado', value: 'rechazada' },
            { label: 'Devuelta', value: 'devuelta' },
            { label: 'Cancelada', value: 'cancelada' },
          ],
        },
        { name: 'amount', type: 'number', label: 'Precio (ARS)', admin: { readOnly: true } },
        {
          name: 'tier',
          type: 'select',
          label: 'Tramo',
          options: [
            { label: 'Lanzamiento', value: 'lanzamiento' },
            { label: 'General', value: 'general' },
          ],
          admin: { readOnly: true },
        },
        { name: 'seat', type: 'number', label: 'Lugar n.º', admin: { readOnly: true } },
      ],
    },
    { name: 'masterclass', type: 'relationship', relationTo: 'masterclasses', label: 'Masterclass', required: true, index: true },
    { name: 'lead', type: 'relationship', relationTo: 'leads', label: 'Oportunidad', admin: { readOnly: true } },
    {
      type: 'collapsible',
      label: 'Pago y avisos',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'paidAt',
              type: 'date',
              label: 'Pagada el',
              admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
            },
            {
              name: 'holdUntil',
              type: 'date',
              label: 'Lugar reservado hasta',
              admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'mpPaymentId', type: 'text', label: 'Pago en Mercado Pago', admin: { readOnly: true } },
            { name: 'mpStatus', type: 'text', label: 'Estado en Mercado Pago', admin: { readOnly: true } },
            { name: 'mpPreferenceId', type: 'text', label: 'Preferencia', admin: { readOnly: true } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'confirmedAt', type: 'date', label: 'Mail de confirmación', admin: { readOnly: true } },
            { name: 'reminded24At', type: 'date', label: 'Recordatorio 24 h', admin: { readOnly: true } },
            { name: 'reminded1At', type: 'date', label: 'Recordatorio 1 h', admin: { readOnly: true } },
          ],
        },
        { name: 'attribution', type: 'json', label: 'Origen de campaña', admin: { readOnly: true } },
      ],
    },
    // The private key for the thank-you page and the calendar file: never guessable from the ID.
    {
      name: 'token',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { read: isAdminField, update: nobody },
      admin: { hidden: true },
    },
  ],
}
