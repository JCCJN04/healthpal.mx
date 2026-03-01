import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Calls the Supabase Edge Function 'extract-document' to get key medical information
 * extracted from a document using Gemini.
 * @param documentId The ID of the document already saved in DB
 * @param filePath The path in Supabase Storage
 * @param mimeType The file mime type
 * @returns The extracted information or null if failed
 */
export async function extractDocumentInfo(
    documentId: string,
    filePath: string,
    mimeType: string
): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        const { data, error } = await supabase.functions.invoke<{ success: boolean; text?: string; error?: string }>('extract-document', {
            body: { documentId, filePath, mimeType },
        });

        if (error) {
            logger.error('Error invoking extract-document edge function', error);
            return { success: false, error: error.message || 'Error de red en la función' };
        }

        if (data && data.success) {
            return { success: true, text: data.text };
        }

        return { success: false, error: data?.error || 'La IA no pudo procesar el documento' };
    } catch (error: any) {
        logger.error('Unexpected error calling extraction function', error);
        return { success: false, error: error.message || 'Error inesperado' };
    }
}
