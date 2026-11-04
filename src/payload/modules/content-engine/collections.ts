import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated, isPersonAccess } from '../../access'

/** A topic the engine proposed, or an idea of ours it analyzed. Handled from the Contenidos screen. */
export const ContentTopics: CollectionConfig = {
  slug: 'content-topics',
  labels: { singular: 'Tema', plural: 'Temas' },
  admin: { useAsTitle: 'title', group: 'Marketing', hidden: true },
  access: { read: isPersonAccess, create: isAdmin, update: isAuthenticated, delete: isAdmin },
  defaultSort: '-score',
  fields: [
    { name: 'title', type: 'text', label: 'Tema', required: true },
    {
      name: 'origin',
      type: 'select',
      label: 'Origen',
      required: true,
      defaultValue: 'motor',
      options: [
        { label: 'Propuesto por el motor', value: 'motor' },
        { label: 'Idea nuestra', value: 'idea' },
      ],
    },
    { name: 'idea', type: 'textarea', label: 'Idea original' },
    {
      name: 'verdict',
      type: 'select',
      label: 'Veredicto sobre la idea',
      options: [
        { label: 'Ratificada', value: 'ratificada' },
        { label: 'Rectificada', value: 'rectificada' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      required: true,
      defaultValue: 'propuesto',
      index: true,
      options: [
        { label: 'Propuesto', value: 'propuesto' },
        { label: 'Generando piezas', value: 'generando' },
        { label: 'Piezas listas', value: 'generado' },
        { label: 'Descartado', value: 'descartado' },
      ],
    },
    { name: 'score', type: 'number', label: 'Potencial comercial (0 a 100)', index: true },
    { name: 'service', type: 'text', label: 'Servicio que impulsa' },
    { name: 'analysis', type: 'json', label: 'Análisis' },
  ],
}

/** What the engine wrote for a topic. The blog article lives in Posts, as a draft. */
export const ContentPieces: CollectionConfig = {
  slug: 'content-pieces',
  labels: { singular: 'Pieza', plural: 'Piezas' },
  admin: { useAsTitle: 'title', group: 'Marketing', hidden: true },
  access: { read: isPersonAccess, create: isAdmin, update: isAuthenticated, delete: isAdmin },
  defaultSort: 'createdAt',
  fields: [
    { name: 'topic', type: 'relationship', relationTo: 'content-topics', required: true, index: true },
    {
      name: 'kind',
      type: 'select',
      label: 'Tipo',
      required: true,
      options: [
        { label: 'Artículo de blog', value: 'blog' },
        { label: 'Video largo de YouTube', value: 'video' },
        { label: 'Short de YouTube', value: 'short' },
        { label: 'Artículo de LinkedIn', value: 'linkedin_article' },
        { label: 'Publicación de LinkedIn', value: 'linkedin_post' },
      ],
    },
    { name: 'title', type: 'text', label: 'Título', required: true },
    { name: 'body', type: 'textarea', label: 'Texto' },
    { name: 'post', type: 'relationship', relationTo: 'posts', label: 'Borrador en el blog' },
  ],
}

/** One run of the engine. It lives while n8n talks to the model. */
export const ContentJobs: CollectionConfig = {
  slug: 'content-jobs',
  labels: { singular: 'Ejecución', plural: 'Ejecuciones' },
  admin: { group: 'Marketing', hidden: true },
  access: { read: isPersonAccess, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Proponer temas', value: 'topics' },
        { label: 'Analizar idea', value: 'idea' },
        { label: 'Artículo de blog', value: 'blog' },
        { label: 'Video y LinkedIn', value: 'social' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'running',
      index: true,
      options: [
        { label: 'En curso', value: 'running' },
        { label: 'Terminada', value: 'done' },
        { label: 'Falló', value: 'failed' },
      ],
    },
    { name: 'topic', type: 'relationship', relationTo: 'content-topics' },
    { name: 'idea', type: 'textarea' },
    { name: 'dataUsed', type: 'json' },
    { name: 'request', type: 'json' },
    { name: 'sourcesSeen', type: 'json' },
    { name: 'continuations', type: 'number', defaultValue: 0 },
    { name: 'error', type: 'text' },
  ],
}
