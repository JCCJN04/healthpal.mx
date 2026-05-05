import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function sendWhatsAppReply(
  phoneNumberId: string,
  token: string,
  to: string,
  body: string,
): Promise<void> {
  await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    },
  );
}

serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── GET: Meta webhook verification ──────────────────────────────────────
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (
      mode === "subscribe" &&
      token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")
    ) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: Incoming WhatsApp messages ────────────────────────────────────
  if (req.method === "POST") {
    // Meta requires HTTP 200 even on errors, otherwise it retries endlessly.
    try {
      const body = await req.json();
      console.log('POST received, body:', JSON.stringify(body));

      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      console.log('Message extracted:', JSON.stringify(message));

      if (!message) {
        console.log('No message found in payload, returning OK');
        return new Response("OK", { status: 200 });
      }

      const senderPhone: string = message.from;
      const type: string = message.type;
      console.log('Message type:', message?.type);

      if (type !== "document" && type !== "image") {
        return new Response("OK", { status: 200 });
      }

      const whatsappToken = Deno.env.get("WHATSAPP_TOKEN")!;
      const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Step 1 – Extract message data
      const mediaId: string =
        type === "document" ? message.document.id : message.image.id;
      const timestamp = Date.now();
      const filename: string =
        type === "document"
          ? (message.document?.filename ?? `document_${timestamp}`)
          : `whatsapp_${type}_${timestamp}`;
      const mimeType: string =
        type === "document"
          ? message.document?.mime_type
          : message.image?.mime_type;

      // Step 2 – Download file from Meta
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${mediaId}`,
        { headers: { Authorization: `Bearer ${whatsappToken}` } },
      );
      if (!metaRes.ok) {
        throw new Error(`Meta media metadata failed: ${metaRes.status}`);
      }
      const { url: mediaUrl } = await metaRes.json();

      const fileRes = await fetch(mediaUrl, {
        headers: { Authorization: `Bearer ${whatsappToken}` },
      });
      if (!fileRes.ok) {
        throw new Error(`Media download failed: ${fileRes.status}`);
      }
      const fileBuffer = await fileRes.arrayBuffer();

      // Step 3 – Look up patient by phone number
      // WhatsApp sends numbers as "521XXXXXXXXXX"; profiles may store with/without country code
      const phoneVariants = [senderPhone];
      if (senderPhone.startsWith("52")) {
        phoneVariants.push(senderPhone.slice(2)); // strip MX country code
      }
      if (senderPhone.startsWith("521")) {
        phoneVariants.push("1" + senderPhone.slice(3)); // reformat with +1
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, onboarding_completed")
        .in("phone", phoneVariants)
        .eq("role", "patient")
        .limit(1)
        .single();

      console.log('Profile lookup result:', profile ? `found id=${profile.id}` : 'not found');

      // ── Helper: save file + document record ─────────────────────────────────
      const saveFile = async (patientId: string, uploadedBy: string | null, notes: string) => {
        // Path format matches the app: {ownerId}/{documentId}/{filename}
        const documentId = crypto.randomUUID();
        const storagePath = `${patientId}/${documentId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { error: docError } = await supabase.from("documents").insert({
          id: documentId,
          owner_id: patientId,
          patient_id: patientId,
          uploaded_by: uploadedBy,
          title: filename,
          category: "other",
          mime_type: mimeType,
          notes,
        });
        if (docError) throw new Error(`documents insert failed: ${docError.message}`);

        const { error: archivoError } = await supabase
          .from("archivos_recibidos")
          .insert({
            telefono: senderPhone,
            nombre_archivo: filename,
            storage_path: storagePath,
            tipo: type,
            mime_type: mimeType,
            recibido_en: new Date().toISOString(),
          });
        if (archivoError) throw new Error(`archivos_recibidos insert failed: ${archivoError.message}`);

        return documentId;
      }

      // ── PRIORITY: Check whatsapp_sessions to link to the right patient/doctor ─
      // Build phone variants: Meta sends "521XXXXXXXXXX" (with mobile 1) but the
      // doctor may have stored "5281XXXXXXXXXX" (without mobile 1), and vice versa.
      const sessionPhoneVariants = [...new Set([senderPhone, ...phoneVariants])];
      if (senderPhone.startsWith("521") && senderPhone.length === 13) {
        sessionPhoneVariants.push("52" + senderPhone.slice(3)); // strip mobile 1
      } else if (senderPhone.startsWith("52") && !senderPhone.startsWith("521") && senderPhone.length === 12) {
        sessionPhoneVariants.push("521" + senderPhone.slice(2)); // add mobile 1
      }
      console.log("sessionPhoneVariants:", sessionPhoneVariants);

      const { data: session } = await supabase
        .from("whatsapp_sessions")
        .select("id, document_request_id, doctor_id")
        .in("patient_phone", sessionPhoneVariants)
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      console.log('whatsapp_session lookup:', session ? `found session=${session.id}` : 'not found');

      if (session?.document_request_id) {
        // ── SCENARIO 0: Message is a reply to a document request ────────────
        console.log('Scenario 0: linked to document_request', session.document_request_id);

        // Get document request details (include patient_phone for phone-only requests)
        const { data: docReq } = await supabase
          .from("document_requests")
          .select("id, patient_email, patient_phone, document_type")
          .eq("id", session.document_request_id)
          .single();

        if (!docReq) throw new Error(`document_request not found: ${session.document_request_id}`);

        // Resolve patient: try auth.users by email first (reliable, no 1000-user limit),
        // then fall back to phone lookup in profiles.
        let patientId: string | null = null;

        // Try 1: direct auth.users lookup by email (case-insensitive, no pagination limit)
        if (docReq.patient_email) {
          const { data: authUid } = await supabase
            .rpc("auth_user_id_by_email", { search_email: docReq.patient_email });
          if (authUid) {
            patientId = authUid as string;
            console.log('Patient resolved via auth.users email lookup:', patientId);
          }
        }

        // Try 2: profile lookup by phone (sender phone + stored patient_phone variants)
        if (!patientId) {
          const phoneCandidates = [...new Set(
            [senderPhone, docReq.patient_phone].filter(Boolean) as string[]
          )];
          const phoneVariantsForLookup: string[] = [];
          for (const ph of phoneCandidates) {
            phoneVariantsForLookup.push(ph);
            if (ph.startsWith("521") && ph.length === 13) {
              phoneVariantsForLookup.push("52" + ph.slice(3));
            } else if (ph.startsWith("52") && !ph.startsWith("521") && ph.length === 12) {
              phoneVariantsForLookup.push("521" + ph.slice(2));
            }
            if (ph.startsWith("52")) phoneVariantsForLookup.push(ph.slice(2));
          }
          const { data: phoneProfile } = await supabase
            .from("profiles")
            .select("id")
            .in("phone", [...new Set(phoneVariantsForLookup)])
            .eq("role", "patient")
            .limit(1)
            .maybeSingle();
          if (phoneProfile) {
            patientId = phoneProfile.id;
            console.log('Patient resolved via phone lookup:', patientId);
          }
        }

        // ── Auto-register: patient has no HealthPal account yet ─────────────
        // They replied via WhatsApp but never signed up. Pre-register them so
        // the document can be saved and linked to the fulfilled request.
        if (!patientId) {
          console.log('Scenario 0 - no account found, auto pre-registering patient');
          let newUserId: string | null = null;

          // Prefer email-based registration so the patient can later log in with email
          if (docReq.patient_email) {
            const { data: newUser, error: createErr } =
              await supabase.auth.admin.createUser({
                email: docReq.patient_email,
                email_confirm: true,
              });
            if (!createErr && newUser?.user) {
              newUserId = newUser.user.id;
            } else {
              // createUser failed — email might already exist despite Try 1 missing it
              // (edge case: RPC timing or replication lag). Re-try via RPC.
              console.warn('createUser(email) error:', createErr?.message);
              const { data: retryUid } = await supabase
                .rpc("auth_user_id_by_email", { search_email: docReq.patient_email });
              if (retryUid) newUserId = retryUid as string;
            }
          }

          // Fall back to phone-only if email registration failed
          if (!newUserId) {
            const { data: newUser, error: phoneErr } =
              await supabase.auth.admin.createUser({
                phone: senderPhone,
                phone_confirm: true,
              });
            if (!phoneErr && newUser?.user) {
              newUserId = newUser.user.id;
            } else {
              console.warn('createUser(phone) error:', phoneErr?.message);
            }
          }

          if (!newUserId) {
            throw new Error(
              `Cannot pre-register patient for request ${session.document_request_id} ` +
              `(email="${docReq.patient_email}", phone="${docReq.patient_phone}")`
            );
          }

          const { error: profileErr } = await supabase.from("profiles").upsert({
            id: newUserId,
            role: "patient",
            phone: senderPhone,
            onboarding_completed: false,
            onboarding_step: "whatsapp_preregistro",
          }, { onConflict: "id" });
          if (profileErr) console.warn('profiles upsert (auto-reg):', profileErr.message);

          const { error: ppErr } = await supabase
            .from("patient_profiles")
            .upsert({ patient_id: newUserId }, { onConflict: "patient_id" });
          if (ppErr) console.warn('patient_profiles upsert (auto-reg):', ppErr.message);

          patientId = newUserId;
          console.log('Auto pre-registered patient:', patientId);
        }

        const documentId = await saveFile(patientId, patientId, `Solicitado por doctor vía WhatsApp — ${docReq.document_type}`);

        // NOTE: No document_shares insert here — the doctor accesses this document
        // through the expediente in PatientDetail (consent-based RLS: share_documents=true).
        // An explicit share would create an unwanted "Compartido" folder in the doctor's
        // Documentos page, which is not the intended UX.

        // Auto-grant consent: patient explicitly sent a document to this doctor,
        // so we create/update an accepted consent with share_documents scope.
        // On conflict (consent already exists) we only upgrade share_documents/status,
        // leaving other scopes untouched.
        if (session.doctor_id) {
          await supabase.from("doctor_patient_consent").upsert({
            doctor_id: session.doctor_id,
            patient_id: patientId,
            status: "accepted",
            share_basic_profile: true,
            share_documents: true,
          }, { onConflict: "doctor_id,patient_id" });
        }

        // Fulfill the document request
        await supabase
          .from("document_requests")
          .update({
            status: "fulfilled",
            patient_id: patientId,
            document_id: documentId,
            fulfilled_at: new Date().toISOString(),
          })
          .eq("id", session.document_request_id)
          .eq("status", "pending");

        // Mark session fulfilled
        await supabase
          .from("whatsapp_sessions")
          .update({ status: "fulfilled" })
          .eq("id", session.id);

        await sendWhatsAppReply(
          phoneNumberId,
          whatsappToken,
          senderPhone,
          `¡Gracias! 📎 Recibimos tu *${docReq.document_type}* y lo guardamos en tu expediente de HealthPal de forma segura 🔒`,
        );
        return new Response("OK", { status: 200 });
      }

      if (profile) {
        // ── SCENARIO 1: Patient has HealthPal account, phone matched ────────
        console.log('Scenario 1: existing patient matched by phone');
        await saveFile(profile.id, null, "Recibido por WhatsApp");

        await sendWhatsAppReply(
          phoneNumberId,
          whatsappToken,
          senderPhone,
          `Hola ${profile.full_name || "paciente"} 👋 Recibimos tu documento *${filename}* y lo guardamos en tu expediente de HealthPal. Puedes verlo en: healthpal.mx`,
        );
      } else {
        // Phone not found in profiles — check if this auth user exists at all
        // (Scenario 2: has account but phone not set vs Scenario 3: no account)

        // First check auth.users for this phone
        let resolvedUserId: string | null = null;
        const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existingAuthUser = listData?.users?.find(
          (u) => phoneVariants.includes(u.phone ?? ""),
        );

        if (existingAuthUser) {
          // Check if they have a real profile (account exists but phone not set yet)
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", existingAuthUser.id)
            .single();

          if (existingProfile) {
            // ── SCENARIO 2: Has HealthPal account, phone not set in profile ─
            console.log('Scenario 2: auth user exists but phone not linked, id:', existingAuthUser.id);
            await saveFile(existingAuthUser.id, null, "Recibido por WhatsApp - Teléfono no vinculado");

            await sendWhatsAppReply(
              phoneNumberId,
              whatsappToken,
              senderPhone,
              `Recibimos tu documento 📎 Para vincularlo a tu expediente de HealthPal, ingresa a tu cuenta y agrega este número de WhatsApp en tu perfil: healthpal.mx/perfil`,
            );
            return new Response("OK", { status: 200 });
          }

          // Auth user exists but no profile row — fall through to create profile
          resolvedUserId = existingAuthUser.id;
          console.log('Auth user exists without profile row, id:', resolvedUserId);
        }

        // ── SCENARIO 3: No HealthPal account → pre-register ─────────────────
        console.log('Scenario 3: new pre-registration');

        if (!resolvedUserId) {
          const { data: newUser, error: createUserError } =
            await supabase.auth.admin.createUser({
              phone: senderPhone,
              email_confirm: true,
              phone_confirm: true,
            });
          if (createUserError || !newUser?.user) {
            throw new Error(`createUser failed: ${createUserError?.message}`);
          }
          resolvedUserId = newUser.user.id;
          console.log('New auth user created, id:', resolvedUserId);
        }

        const newUserId = resolvedUserId;

        const { error: profileError } = await supabase.from("profiles").upsert({
          id: newUserId,
          role: "patient",
          phone: senderPhone,
          onboarding_completed: false,
          onboarding_step: "whatsapp_preregistro",
        }, { onConflict: "id" });
        if (profileError) throw new Error(`profiles upsert failed: ${profileError.message}`);

        const { error: patientProfileError } = await supabase
          .from("patient_profiles")
          .upsert({ patient_id: newUserId }, { onConflict: "patient_id" });
        if (patientProfileError) {
          throw new Error(`patient_profiles upsert failed: ${patientProfileError.message}`);
        }

        await saveFile(newUserId, null, "Recibido por WhatsApp - Pre-registro");

        await sendWhatsAppReply(
          phoneNumberId,
          whatsappToken,
          senderPhone,
          `Hola 👋 Recibimos tu documento y creamos tu expediente en HealthPal. Para acceder a tus archivos completa tu registro aquí: healthpal.mx/registro?phone=${senderPhone}\nTu documento *${filename}* ya está guardado y seguro 🔒`,
        );
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error:', error.message, error.stack);
      // Still return 200 so Meta does not retry.
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Method Not Allowed", { status: 405 });
});
