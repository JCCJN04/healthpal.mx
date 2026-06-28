/**
 * Route chunk prefetching — preloads JS modules on hover so navigation feels instant.
 * Each import() here must match exactly what lazy() uses in App.tsx.
 */

const routeImports: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/features/shared/pages/Dashboard'),
  '/dashboard/documentos': () => import('@/features/shared/pages/Documentos'),
  '/dashboard/configuracion': () => import('@/features/shared/pages/Configuracion'),
  '/dashboard/historial': () => import('@/features/shared/pages/HistorialClinico'),
  '/dashboard/consultas': () => import('@/features/patient/pages/Consultas'),
  '/dashboard/doctores': () => import('@/features/patient/pages/Doctores'),
  '/dashboard/pacientes': () => import('@/features/doctor/pages/Pacientes'),
  '/dashboard/agenda': () => import('@/features/doctor/pages/Agenda'),
  '/dashboard/recetas': () => import('@/features/doctor/pages/Recetas'),
  '/dashboard/assistant': () => import('@/features/assistant/pages/AssistantDashboard'),
  '/dashboard/assistant/agenda': () => import('@/features/assistant/pages/AssistantAgenda'),
  '/dashboard/assistant/pacientes': () => import('@/features/assistant/pages/AssistantPacientes'),
}

const prefetched = new Set<string>()

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return
  const loader = routeImports[path]
  if (loader) {
    prefetched.add(path)
    loader()
  }
}
