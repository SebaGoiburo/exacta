import path from 'node:path'
import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated, isPersonAccess } from '../../access'

/** WhatsApp conversations. Created by the n8n agent and handled from the Conversaciones screen. */
export const Conversations: CollectionConfig = {
  slug: 'conversations',
  labels: { singular: 'Conversación', plural: 'Conversaciones' },
  admin: { useAsTitle: 'waId', hidden: true },
  access: { read: isPersonAccess, create: isAdmin, update: isAuthenticated, delete: isAdmin },
  defaultSort: '-lastMessageAt',
  fields: [
    { name: 'waId', type: 'text', label: 'Número', required: true, unique: true, index: true },
    { name: 'phoneNumberId', type: 'text', label: 'ID del número de Exacta en Meta' },
    { name: 'profileName', type: 'text', label: 'Nombre en WhatsApp' },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      required: true,
      defaultValue: 'agente',
      index: true,
      options: [
        { label: 'Atiende el agente', value: 'agente' },
        { label: 'Derivada, espera un asesor', value: 'derivada' },
        { label: 'Atiende un asesor', value: 'humano' },
        { label: 'Descartada', value: 'descartada' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'discardReason',
          type: 'select',
          label: 'Motivo del descarte',
          options: [
            { label: 'Quiere vendernos algo', value: 'proveedor' },
            { label: 'Busca trabajo', value: 'empleo' },
            { label: 'Spam', value: 'spam' },
            { label: 'Ráfaga de mensajes (posible bot)', value: 'rafaga' },
            { label: 'Descartada por una persona', value: 'manual' },
          ],
        },
        { name: 'discardedAt', type: 'date', label: 'Descartada el' },
      ],
    },
    { name: 'assignedTo', type: 'relationship', relationTo: 'users', label: 'Asesor' },
    { name: 'contact', type: 'relationship', relationTo: 'contacts', label: 'Contacto' },
    { name: 'lead', type: 'relationship', relationTo: 'leads', label: 'Oportunidad' },
    {
      name: 'collected',
      type: 'group',
      label: 'Datos recopilados',
      fields: [
        { name: 'name', type: 'text', label: 'Nombre' },
        { name: 'email', type: 'text', label: 'Email' },
        { name: 'company', type: 'text', label: 'Empresa' },
        { name: 'role', type: 'text', label: 'Cargo' },
        { name: 'companySize', type: 'text', label: 'Tamaño de la empresa' },
        { name: 'need', type: 'textarea', label: 'Necesidad' },
      ],
    },
    { name: 'lastMessageAt', type: 'date', label: 'Último mensaje', index: true },
    { name: 'lastInboundAt', type: 'date', label: 'Último mensaje del cliente' },
    { name: 'lastPreview', type: 'text', label: 'Vista previa' },
    { name: 'unread', type: 'number', label: 'Sin leer', defaultValue: 0 },
    { name: 'aiReplies', type: 'number', label: 'Respuestas del agente en esta atención', defaultValue: 0 },
    // Only messages from here on reach the model, so a finished conversation starts clean.
    { name: 'sessionStart', type: 'date', label: 'Inicio de esta atención' },
    { name: 'handoffAt', type: 'date', label: 'Derivada el' },
    // Last notice to the advisor's phone, so a chatty person doesn't trigger one per message.
    { name: 'notifiedAt', type: 'date', label: 'Último aviso al asesor' },
  ],
}

export const ConversationMessages: CollectionConfig = {
  slug: 'conversation-messages',
  labels: { singular: 'Mensaje', plural: 'Mensajes' },
  admin: { useAsTitle: 'text', hidden: true },
  access: { read: isPersonAccess, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: 'createdAt',
  fields: [
    { name: 'conversation', type: 'relationship', relationTo: 'conversations', required: true, index: true },
    {
      name: 'sender',
      type: 'select',
      required: true,
      options: [
        { label: 'Cliente', value: 'cliente' },
        { label: 'Agente', value: 'agente' },
        { label: 'Asesor', value: 'asesor' },
        { label: 'Sistema', value: 'sistema' },
      ],
    },
    { name: 'text', type: 'textarea', required: true },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'texto',
      options: [
        { label: 'Texto', value: 'texto' },
        { label: 'Audio', value: 'audio' },
        { label: 'Imagen o archivo', value: 'archivo' },
        { label: 'Plantilla', value: 'plantilla' },
        { label: 'No visible', value: 'otro' },
      ],
    },
    { name: 'audio', type: 'upload', relationTo: 'voice-notes', label: 'Audio' },
    /** For audio: whether `text` is its transcription. */
    { name: 'transcribed', type: 'checkbox', defaultValue: false },
    // What Meta said about the message, so the team knows what arrived when the content didn't.
    { name: 'metaType', type: 'text', label: 'Tipo según WhatsApp' },
    { name: 'metaDetail', type: 'text', label: 'Motivo según WhatsApp' },
    // Meta can deliver the same message twice: its ID keeps it from being answered twice.
    { name: 'waMessageId', type: 'text', unique: true, index: true },
    { name: 'failed', type: 'checkbox', defaultValue: false },
    { name: 'author', type: 'relationship', relationTo: 'users' },
  ],
}

/** What the team adds to the agent's knowledge, on top of what the site already says. */
export const Knowledge: CollectionConfig = {
  slug: 'knowledge',
  labels: { singular: 'Dato para el agente', plural: 'Base de conocimiento' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'active', 'updatedAt'],
    group: 'Comercial',
    description:
      'El agente de WhatsApp ya conoce los servicios, productos y preguntas frecuentes del sitio. Acá sumás lo que no está publicado.',
  },
  access: { read: isAuthenticated, create: isAuthenticated, update: isAuthenticated, delete: isAuthenticated },
  defaultSort: 'title',
  fields: [
    { name: 'title', type: 'text', label: 'Tema', required: true },
    { name: 'content', type: 'textarea', label: 'Qué tiene que saber el agente', required: true },
    { name: 'active', type: 'checkbox', label: 'Activo', defaultValue: true },
  ],
}

/** Voice notes from WhatsApp. Private to the team and deleted after 30 days; the transcription stays. */
export const VoiceNotes: CollectionConfig = {
  slug: 'voice-notes',
  labels: { singular: 'Audio', plural: 'Audios' },
  admin: { hidden: true },
  access: { read: isPersonAccess, create: isAdmin, update: isAdmin, delete: isAdmin },
  upload: {
    staticDir: path.resolve(process.cwd(), 'media', 'voice-notes'),
    mimeTypes: ['audio/*'],
  },
  fields: [{ name: 'waMessageId', type: 'text', index: true }],
}
