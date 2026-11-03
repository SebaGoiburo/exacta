import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { Inbox } from './inbox'

export function ConversationsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  if (req.user?.collection !== 'users') redirect('/admin/login')

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <h1 style={{ marginBottom: 'calc(var(--base) * 0.5)' }}>Conversaciones</h1>
        <Inbox />
      </Gutter>
    </DefaultTemplate>
  )
}
