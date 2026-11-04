import { ValidationError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { EXPERIENCE_MARKER } from '../../../lib/content-engine/markers'
import { isAuthenticated, publishedOrAuthenticated } from '../../access'
import { slugField } from '../../fields'
import { revalidateCollection } from '../../hooks/revalidate'
import { n8nEvents } from '../../hooks/n8n-events'

const hasContent = (content: any) =>
  Array.isArray(content?.root?.children) &&
  content.root.children.some((n: any) => (n.children?.length ?? 0) > 0 || n.type !== 'paragraph')

/**
 * Integrations (n8n) send the article as Markdown in `markdown`; it is converted to the
 * editor's format when the rich text is still empty. Reading time is estimated if missing.
 */
const fromMarkdown: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (typeof data.markdown === 'string' && data.markdown.trim() && !hasContent(data.content)) {
    const editorConfig = await editorConfigFactory.default({ config: req.payload.config })
    data.content = convertMarkdownToLexical({ editorConfig, markdown: data.markdown })
  }
  if (!data.readingMinutes && typeof data.markdown === 'string') {
    const words = data.markdown.split(/\s+/).filter(Boolean).length
    data.readingMinutes = Math.max(1, Math.round(words / 200))
  }
  if (data._status === 'published' && JSON.stringify(data.content ?? '').includes(EXPERIENCE_MARKER)) {
    throw new ValidationError({
      collection: 'posts',
      errors: [
        {
          path: 'content',
          message: `Este artículo todavía tiene marcas ${EXPERIENCE_MARKER}…]: completalas con experiencia real o borralas antes de publicar.`,
        },
      ],
    })
  }
  if (data._status === 'published' && !data.publishedAt) data.publishedAt = new Date().toISOString()
  return data
}

/** Sends the article the first time it goes out. Editing it later never sends it again. */
const notifySubscribers: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
  const justPublished = doc._status === 'published' && previousDoc?._status !== 'published'
  if (justPublished && doc.sendToSubscribers && !doc.newsletterSentAt && doc.origin !== 'sample') {
    // Loaded here because it reads the Payload config, which imports this file.
    import('../../../lib/newsletter')
      .then(({ sendPostToSubscribers }) => sendPostToSubscribers(req.payload, doc))
      .catch((err) => console.error('[newsletter] not sent', err))
  }
  return doc
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Artículo', plural: 'Blog' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', 'origin', '_status'],
    group: 'Contenido',
  },
  versions: { drafts: true },
  access: {
    read: publishedOrAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  defaultSort: '-publishedAt',
  hooks: {
    beforeChange: [fromMarkdown],
    afterChange: [...revalidateCollection('posts').afterChange, ...n8nEvents('posts').afterChange, notifySubscribers],
    afterDelete: revalidateCollection('posts').afterDelete,
  },
  fields: [
    { name: 'title', type: 'text', label: 'Título', required: true, localized: true },
    slugField('title'),
    { name: 'excerpt', type: 'textarea', label: 'Bajada', localized: true },
    { name: 'content', type: 'richText', label: 'Contenido', localized: true },
    {
      name: 'markdown',
      type: 'textarea',
      label: 'Markdown (integraciones)',
      localized: true,
      admin: {
        description:
          'Para n8n: si llega texto en Markdown y el contenido está vacío, se convierte automáticamente al guardar.',
      },
    },
    { name: 'coverImage', type: 'upload', relationTo: 'media', label: 'Imagen de portada' },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Fecha de publicación',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    { name: 'readingMinutes', type: 'number', label: 'Minutos de lectura', admin: { position: 'sidebar' } },
    {
      name: 'origin',
      type: 'select',
      label: 'Origen',
      defaultValue: 'manual',
      options: [
        { label: 'Escrito en el panel', value: 'manual' },
        { label: 'Propuesto por n8n', value: 'n8n' },
        { label: 'Motor de contenidos', value: 'motor' },
        { label: 'Ejemplo', value: 'sample' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'sendToSubscribers',
      type: 'checkbox',
      label: 'Enviar a los suscriptores al publicar',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'newsletterSentAt',
      type: 'date',
      label: 'Enviado a los suscriptores el',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
