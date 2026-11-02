import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { STAGES } from '../../modules/crm/collections'
import { PipelineBoard, type BoardLead } from './board'

const MAX_LEADS = 300

/** Sales pipeline as a board. Reads as the signed-in user, so access rules still apply. */
export async function PipelineView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult
  if (req.user?.collection !== 'users') redirect('/admin/login')

  const { docs } = await req.payload.find({
    collection: 'leads',
    limit: MAX_LEADS,
    depth: 1,
    sort: '-createdAt',
    overrideAccess: false,
    user: req.user,
  })

  const leads: BoardLead[] = docs.map((d) => {
    const contact = typeof d.contact === 'object' ? d.contact : null
    return {
      id: d.id,
      title: d.title,
      stage: d.stage,
      tier: d.tier ?? null,
      fit: d.fit ?? null,
      maturity: d.maturity ?? null,
      contact: contact?.name ?? '',
      company: contact?.company ?? '',
      phone: contact?.phone ?? '',
      revenue: d.expectedRevenue ?? null,
      createdAt: d.createdAt,
    }
  })

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
        <h1 style={{ marginBottom: 'calc(var(--base) * 0.5)' }}>Pipeline</h1>
        <PipelineBoard leads={leads} stages={STAGES} />
      </Gutter>
    </DefaultTemplate>
  )
}
