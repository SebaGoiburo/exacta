import { landingMetadata, renderLanding, type LandingParams } from '@/components/landing/landing-route'

// Reads the CMS on each request (cached per collection), so the build needs no database.
export const dynamic = 'force-dynamic'

export const generateMetadata = (props: LandingParams) => landingMetadata('soluciones', props)

export default function SolutionPage(props: LandingParams) {
  return renderLanding('soluciones', props)
}
