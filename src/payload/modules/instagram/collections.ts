import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../../access'
import { normalizeKeyword } from '@/lib/instagram/keywords'

/*
 * Instagram auto-replies, the ManyChat role: someone comments or writes a keyword and gets the link by private
 * message, and lands in the pipeline. Meta sends comments and messages straight to /api/instagram/webhook.
 */

const nobody = () => false

/** Accounts connected with "Conectar cuenta". Their tokens never leave the server. */
export const InstagramAccounts: CollectionConfig = {
  slug: 'instagram-accounts',
  labels: { singular: 'Cuenta de Instagram', plural: 'Cuentas de Instagram' },
  admin: {
    useAsTitle: 'username',
    defaultColumns: ['username', 'active', 'tokenExpiresAt'],
    group: 'Instagram',
    description: 'Las cuentas que responden solas. Se suman con el botón "Conectar cuenta de Instagram".',
    components: { beforeList: ['@/payload/views/instagram/setup#InstagramSetup'] },
  },
  access: { read: isAuthenticated, create: nobody, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'username', type: 'text', label: 'Cuenta', required: true, admin: { readOnly: true } },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Responder automáticamente',
      defaultValue: true,
      admin: { description: 'Destildalo para pausar las respuestas de esta cuenta sin desconectarla.' },
    },
    {
      name: 'igId',
      type: 'text',
      label: 'ID de la cuenta en Instagram',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'tokenExpiresAt',
      type: 'date',
      label: 'El permiso vence el',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Vacío = no vence. Si vence o Meta lo revoca, volvé a conectar la cuenta.',
      },
    },
    {
      name: 'token',
      type: 'text',
      access: { read: nobody, create: nobody, update: nobody },
      admin: { hidden: true },
    },
  ],
}

/** What each keyword sends. Edited by the team, no code involved. */
export const InstagramKeywords: CollectionConfig = {
  slug: 'instagram-keywords',
  labels: { singular: 'Palabra clave', plural: 'Palabras clave' },
  admin: {
    useAsTitle: 'keyword',
    defaultColumns: ['keyword', 'active', 'link', 'updatedAt'],
    group: 'Instagram',
    description:
      'Cuando alguien comenta o escribe una de estas palabras, le llega el mensaje por privado y queda como oportunidad nueva en el pipeline.',
  },
  access: { read: isAuthenticated, create: isAuthenticated, update: isAuthenticated, delete: isAdmin },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && typeof data.keyword === 'string') data.keyword = normalizeKeyword(data.keyword)
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'keyword',
          type: 'text',
          label: 'Palabra',
          required: true,
          unique: true,
          admin: {
            width: '50%',
            description:
              'Se guarda en mayúsculas y sin tildes. Da igual cómo la escriba la persona: "turnos", "Turnos!" o "TURNOS".',
          },
        },
        { name: 'active', type: 'checkbox', label: 'Activa', defaultValue: true, admin: { width: '50%' } },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Mensaje privado',
      required: true,
      maxLength: 900,
      admin: {
        description:
          'Lo que le llega por mensaje directo. El enlace se agrega solo al final. Instagram deja mandar uno solo por comentario.',
      },
    },
    {
      name: 'link',
      type: 'text',
      label: 'Enlace',
      admin: {
        description:
          'El diagnóstico, el ebook o la página que corresponda. Si es de nuestro sitio y la persona completa el formulario, su oportunidad se completa sola con sus datos.',
      },
    },
    {
      name: 'publicReply',
      type: 'text',
      label: 'Respuesta pública al comentario',
      defaultValue: '¡Te lo mandé por mensaje privado! 📩',
      maxLength: 300,
      admin: { description: 'Vacío = no se responde en público. No uses la palabra clave acá.' },
    },
    {
      name: 'interest',
      type: 'text',
      label: 'Interés',
      admin: { description: 'Lo que se anota en la oportunidad. Por ejemplo: "Turnos online".' },
    },
    {
      name: 'accounts',
      type: 'relationship',
      relationTo: 'instagram-accounts',
      hasMany: true,
      label: 'Solo en estas cuentas',
      admin: { description: 'Vacío = en todas las cuentas conectadas.' },
    },
  ],
}

/** Every keyword that arrived and what happened with it. Also keeps Meta's retries from answering twice. */
export const InstagramReplies: CollectionConfig = {
  slug: 'instagram-replies',
  labels: { singular: 'Respuesta automática', plural: 'Respuestas automáticas' },
  admin: {
    useAsTitle: 'username',
    defaultColumns: ['username', 'keyword', 'kind', 'status', 'lead', 'createdAt'],
    group: 'Instagram',
    description: 'Cada palabra clave que llegó y qué se respondió.',
  },
  access: { read: isAuthenticated, create: nobody, update: nobody, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    { name: 'eventKey', type: 'text', required: true, unique: true, index: true, admin: { hidden: true } },
    {
      type: 'row',
      fields: [
        { name: 'username', type: 'text', label: 'Persona' },
        {
          name: 'kind',
          type: 'select',
          label: 'Llegó por',
          options: [
            { label: 'Comentario', value: 'comentario' },
            { label: 'Mensaje directo', value: 'mensaje' },
            { label: 'Respondió el mensaje', value: 'respuesta' },
          ],
        },
        {
          name: 'status',
          type: 'select',
          label: 'Estado',
          defaultValue: 'procesando',
          options: [
            { label: 'Procesando', value: 'procesando' },
            { label: 'Enviado', value: 'enviado' },
            { label: 'No se pudo enviar', value: 'fallo' },
            { label: 'Se avisó al equipo', value: 'avisado' },
          ],
        },
      ],
    },
    { name: 'text', type: 'textarea', label: 'Lo que escribió' },
    {
      type: 'row',
      fields: [
        { name: 'keyword', type: 'relationship', relationTo: 'instagram-keywords', label: 'Palabra clave' },
        { name: 'account', type: 'relationship', relationTo: 'instagram-accounts', label: 'Cuenta' },
        { name: 'lead', type: 'relationship', relationTo: 'leads', label: 'Oportunidad' },
      ],
    },
    { name: 'permalink', type: 'text', label: 'Publicación' },
    { name: 'error', type: 'text', label: 'Error' },
    { name: 'igUserId', type: 'text', index: true, admin: { hidden: true } },
  ],
}
