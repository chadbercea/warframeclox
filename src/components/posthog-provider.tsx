'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

// Initialize PostHog synchronously before any React rendering
// API key is public by design - PostHog project keys (phc_*) are meant to be exposed
if (typeof window !== 'undefined' && !posthog.__loaded) {
  posthog.init('phc_tLRBPqU8UQ5APhStqSRAkIcJgmk4doWDY57YXvEEDY7', {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'always',
  })
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  )
}
