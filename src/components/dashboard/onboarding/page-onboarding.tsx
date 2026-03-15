
"use client"

import React, { useEffect, useState } from 'react'
import { useOnboarding } from '@/context/onboarding-context'
import { useTranslation } from '@/hooks/use-translation'
import { OnboardingGuide, type OnboardingStep } from './onboarding-guide'

type PageOnboardingProps = {
  page: string // e.g., 'dashboard', 'pos'
}

export function PageOnboarding({ page }: PageOnboardingProps) {
  const { shouldShowOnboarding, completeOnboarding } = useOnboarding()
  const [show, setShow] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    // We use a timeout to prevent the guide from appearing instantly, which can be jarring.
    const timer = setTimeout(() => {
        if (shouldShowOnboarding(page)) {
            setShow(true)
        }
    }, 1000)

    return () => clearTimeout(timer)
  }, [page, shouldShowOnboarding])

  const getStepsForPage = (): OnboardingStep[] => {
    const steps: OnboardingStep[] = []
    let i = 1
    while (true) {
      const titleKey = `onboarding.${page}.steps.${i}.title`
      const descriptionKey = `onboarding.${page}.steps.${i}.description`
      const title = t(titleKey)
      const description = t(descriptionKey)

      if (title === titleKey || description === descriptionKey) {
        break // Stop when a translation is not found
      }

      steps.push({ title, description })
      i++
    }
    return steps
  }

  const onboardingSteps = getStepsForPage()

  if (onboardingSteps.length === 0) {
    return null
  }

  const handleComplete = () => {
    completeOnboarding(page)
    setShow(false)
  }

  return (
    <OnboardingGuide
      pageKey={page}
      steps={onboardingSteps}
      open={show}
      onOpenChange={setShow}
      onComplete={handleComplete}
    />
  )
}
