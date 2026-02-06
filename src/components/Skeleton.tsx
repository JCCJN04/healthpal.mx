/**
 * Skeleton loader components for better perceived performance
 * Shows content placeholders while data is loading
 */

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )
}

export function AppointmentCardSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  )
}

export function DashboardAppointmentsSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <Skeleton className="h-6 w-48 mb-6" />
      <div className="space-y-4">
        <AppointmentCardSkeleton />
        <AppointmentCardSkeleton />
        <AppointmentCardSkeleton />
      </div>
    </div>
  )
}
