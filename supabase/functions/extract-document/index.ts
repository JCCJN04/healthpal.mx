import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { documentId, filePath, mimeType } = body;

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

        if (!documentId || !filePath) throw new Error('Parámetros faltantes');
        if (!geminiApiKey) throw new Error('GEMINI_API_KEY no configurada');

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Descarga del archivo
        const { data: fileBlob, error: fileError } = await supabase.storage
            .from('documents')
            .download(filePath);

        if (fileError || !fileBlob) throw new Error(`Fallo descarga: ${fileError?.message || 'Archivo no encontrado'}`);

        // 2. Base64 eficiente
        const arrayBuffer = await fileBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64Data = btoa(binary);

        // 3. Prompt de extracción
        const prompt = `Analiza este documento médico. Resume brevemente en español: 1. Tipo de documento y fecha, 2. Diagnóstico o motivo, 3. Medicamentos o pasos a seguir. Responde en español con Markdown (bullet points).`;

        // 4. Petición Directa REST (v1beta) para evitar problemas de SDK
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: mimeType || 'application/pdf', data: base64Data } }
                ]
            }]
        };

        const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!geminiRes.ok) {
            const gError = await geminiRes.json();
            throw new Error(`Error de IA: ${gError.error?.message || 'Fallo inesperado'}`);
        }

        const gData = await geminiRes.json();
        const text = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!text) throw new Error('La IA no generó contenido');

        // 5. Guardar en Base de Datos
        const { data: doc } = await supabase.from('documents').select('notes').eq('id', documentId).single();

        const aiNote = {
            id: `ai-${Date.now()}`,
            author: 'HealthPal IA',
            authorInitial: 'AI',
            timeAgo: 'Análisis IA',
            content: text,
            timestamp: new Date().toISOString()
        };

        let finalNotes = JSON.stringify([aiNote]);
        try {
            if (doc?.notes) {
                const parsed = JSON.parse(doc.notes);
                if (Array.isArray(parsed)) finalNotes = JSON.stringify([aiNote, ...parsed]);
            }
        } catch { /* fallback a aiNote solo */ }

        await supabase.from('documents').update({ notes: finalNotes }).eq('id', documentId);

        return new Response(JSON.stringify({ success: true, text }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (err: any) {
        console.error('[CRITICAL]', err.message);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Retornamos 200 para capturar el error en el frontend
        });
    }
});
