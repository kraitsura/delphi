import { createFileRoute } from '@tanstack/react-router'
import { PricingSection } from '@/components/landing/PricingSection'

export const Route = createFileRoute('/plans')({
  ssr: true,
  component: PlansPage,
})

function PlansPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <PricingSection />
    </div>
  )
}
