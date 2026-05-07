import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://healthpal.mx',
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

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY');
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

        if (!documentId || !filePath) throw new Error('Parámetros faltantes');
        if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) throw new Error('Supabase credenciales faltantes');
        if (!geminiApiKey) throw new Error('GEMINI_API_KEY no configurada');

        // Autenticación manual: Verificar que el usuario que llama es válido
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('No autorizado: Falta token');
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        
        const userClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
        
        if (authErr || !user) {
            console.error('[AUTH ERROR]', authErr);
            throw new Error(`No autorizado: ${authErr?.message || 'Token inválido'}`);
        }

        // Cliente con permisos completos para interactuar con Storage y Base de Datos (bypassing RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Descarga del archivo
        const { data: fileBlob, error: fileError } = await supabase.storage
            .from('documents')
            .download(filePath);

        if (fileError || !fileBlob) {
            const errorDetails = fileError?.message || (fileError ? JSON.stringify(fileError) : 'Archivo no encontrado');
            throw new Error(`Fallo descarga: ${errorDetails}`);
        }

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
        const prompt = `Actúa como un Especialista Clínico en Análisis de Datos de grado premium para la plataforma HealthPal. Tu objetivo es interpretar este documento médico entregando una síntesis de altísimo nivel. Debes traducir toda la terminología médica compleja a un lenguaje claro y tranquilizador que cualquier paciente pueda entender, mientras mantienes el rigor que un médico esperaría ver.

Genera tu respuesta estrictamente en formato Markdown, con un tono profesional, empático y estructurado, utilizando la siguiente plantilla:

💎 **Resumen Ejecutivo**
(Provee un análisis de altísimo valor en 2 a 3 líneas sobre el propósito del documento, la situación actual y la conclusión médica general).

🏥 **Información Clínica**
- **Clasificación:** (Ej. Resultados de Laboratorio, Receta, Notas de Evolución)
- **Fecha de Expedición:** (Si está disponible en el documento)
- **Contexto Principal:** (La condición tratada o el área médica involucrada)

🧬 **Interpretación de Hallazgos**
- (Identifica los resultados o diagnósticos más importantes).
- *(Crucial: Explica brevemente qué significa cada concepto médico o resultado anormal en palabras sencillas y cero alarmistas).*

💊 **Plan de Acción y Tratamiento**
- (Lista clara y bien formateada de los medicamentos, dosis y horarios exactos indicados).
- (Recomendaciones de estilo de vida, dieta o reposo).
- (Próximos pasos a seguir o citas de seguimiento).
*(Si no aplica, simplemente indica que este tipo de documento no contiene un plan de acción directo).*

⚠️ **Alertas y Precauciones**
- (Valores verdaderamente en estado crítico, advertencias de alergias o interacciones que ameriten atención urgente).
*(Si todo está dentro de parámetros manejables, escribe: "Tu análisis no presenta alertas de riesgo severo identificables").*

*(Nota interna para la IA: El reporte debe sentirse justificar su valor premium, el usuario está pagando por claridad absoluta de su cuerpo o padecimiento, sé excelente en tu análisis).*`;

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        console.error('[CRITICAL]', err.message);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Retornamos 200 para capturar el error en el frontend
        });
    }
});
