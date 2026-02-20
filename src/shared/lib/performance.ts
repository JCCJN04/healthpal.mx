/**
 * Performance monitoring utilities
 * Helps track and debug slow loading times
 * Only logs in development mode.
 */

const isDev = import.meta.env.DEV

export interface PerformanceMetrics {
  authInit: number
  sessionFetch: number
  profileFetch: number
  onboardingCheck: number
  appointmentsFetch: number
  totalToInteractive: number
}

/**
 * Collect and log performance metrics for the login -> dashboard flow
 */
export function logPerformanceSummary(): PerformanceMetrics | null {
  if (!isDev) return null

  try {
    const authTotal = performance.getEntriesByName('auth-total-init')[0]?.duration || 0
    const sessionFetch = performance.getEntriesByName('auth-session-fetch')[0]?.duration || 0
    const profileFetch = performance.getEntriesByName('auth-profile-fetch')[0]?.duration || 0
    const onboardingCheck = performance.getEntriesByName('onboarding-check')[0]?.duration || 0
    const appointmentsFetch = performance.getEntriesByName('appointments-total')[0]?.duration || 0
    const dashboardLoad = performance.getEntriesByName('dashboard-load-total')[0]?.duration || 0

    const metrics: PerformanceMetrics = {
      authInit: Math.round(authTotal),
      sessionFetch: Math.round(sessionFetch),
      profileFetch: Math.round(profileFetch),
      onboardingCheck: Math.round(onboardingCheck),
      appointmentsFetch: Math.round(appointmentsFetch),
      totalToInteractive: Math.round(authTotal + onboardingCheck + dashboardLoad),
    }

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('\n' + '='.repeat(60))
      // eslint-disable-next-line no-console
      console.log('📊 PERFORMANCE SUMMARY (Login → Dashboard)')
      // eslint-disable-next-line no-console
      console.log('='.repeat(60))
      // eslint-disable-next-line no-console
      console.log(`  Auth Init:           ${metrics.authInit}ms`)
      // eslint-disable-next-line no-console
      console.log(`    ├─ Session Fetch:  ${metrics.sessionFetch}ms`)
      // eslint-disable-next-line no-console
      console.log(`    └─ Profile Fetch:  ${metrics.profileFetch}ms`)
      // eslint-disable-next-line no-console
      console.log(`  Onboarding Check:    ${metrics.onboardingCheck}ms`)
      // eslint-disable-next-line no-console
      console.log(`  Appointments Fetch:  ${metrics.appointmentsFetch}ms`)
      // eslint-disable-next-line no-console
      console.log('─'.repeat(60))
      // eslint-disable-next-line no-console
      console.log(`  🎯 TOTAL TIME:       ${metrics.totalToInteractive}ms`)
      // eslint-disable-next-line no-console
      console.log('='.repeat(60) + '\n')

      // Performance evaluation
      if (metrics.totalToInteractive < 1000) {
        // eslint-disable-next-line no-console
        console.log('✅ EXCELLENT performance (< 1s)')
      } else if (metrics.totalToInteractive < 2000) {
        // eslint-disable-next-line no-console
        console.log('✓ GOOD performance (< 2s)')
      } else if (metrics.totalToInteractive < 3000) {
        // eslint-disable-next-line no-console
        console.log('⚠️ MODERATE performance (< 3s) - room for improvement')
      } else {
        // eslint-disable-next-line no-console
        console.log('❌ SLOW performance (> 3s) - needs optimization')
      }
    }

    return metrics
  } catch {
    // Silently fail in production
    return null
  }
}

/**
 * Clear all performance marks and measures
 */
export function clearPerformanceMetrics() {
  performance.clearMarks()
  performance.clearMeasures()
}
