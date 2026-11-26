import { landingMetadata, renderLanding, type LandingParams } from '@/components/landing/landing-route'

// Reads the CMS on each request (cached per collection), so the build needs no database.
export const dynamic = 'force-dynamic'

export const generateMetadata = (props: LandingParams) => landingMetadata('industrias', props)

export default function IndustryPage(props: LandingParams) {
  return renderLanding('industrias', props)
}
