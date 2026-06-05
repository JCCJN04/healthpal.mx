import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserDocuments, getDocumentsSharedWithMe } from '@/shared/lib/queries/documents'
import type { Database } from '@/shared/types/database'

type Doc = Database['public']['Tables']['documents']['Row']

export const documentKeys = {
  all:    (userId: string) => ['documents', userId] as const,
  folder: (userId: string, folderId: string | null) => ['documents', userId, folderId] as const,
  shared: (userId: string) => ['documents', userId, 'shared'] as const,
}

/**
 * Fetches all documents for a user (all folders).
 * Cached for 5 min — navigating away and back skips the network call.
 */
export function useDocuments(userId: string | undefined) {
  return useQuery<Doc[]>({
    queryKey: documentKeys.all(userId ?? ''),
    queryFn: () => getUserDocuments(userId!, null, true),
    enabled: !!userId,
  })
}

/**
 * Fetches documents shared with the user.
 */
export function useSharedDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: documentKeys.shared(userId ?? ''),
    queryFn: () => getDocumentsSharedWithMe(userId!),
    enabled: !!userId,
  })
}

/**
 * Manually invalidate cached documents (call after upload/delete).
 */
export function useInvalidateDocuments() {
  const qc = useQueryClient()
  return (userId: string) => qc.invalidateQueries({ queryKey: ['documents', userId] })
}
