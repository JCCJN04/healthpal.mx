import { useState, useCallback } from 'react';
import {
  Star,
  X,
  ChevronRight,
  ChevronLeft,
  Clock,
  Heart,
  Building2,
  Send,
  Loader2,
  CheckCircle2,
  EyeOff,
  Eye,
} from 'lucide-react';
import {
  submitVerifiedReview,
  type ReviewableAppointment,
} from '@/shared/lib/queries/publicDoctors';
import { showToast } from '@/shared/components/ui/Toast';
import { formatSpecialty } from '@/shared/lib/specialties';

// ─── Props ─────────────────────────────────────────────────────────────────

interface ReviewWizardProps {
  appointment: ReviewableAppointment;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  size = 'lg',
}: {
  value: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'lg';
}) {
  const [hover, setHover] = useState(0);
  const iconSize = size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={`${iconSize} transition-colors ${
              star <= (hover || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function DimensionRating({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <StarRating value={value} onChange={onChange} size="sm" />
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: 'Muy mala',
  2: 'Mala',
  3: 'Regular',
  4: 'Buena',
  5: 'Excelente',
};

// ─── Main Component ────────────────────────────────────────────────────────

export default function ReviewWizard({ appointment, onClose, onSuccess }: ReviewWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: General rating
  const [rating, setRating] = useState(0);

  // Step 2: Dimension ratings
  const [punctuality, setPunctuality] = useState(0);
  const [attention, setAttention] = useState(0);
  const [facilities, setFacilities] = useState(0);

  // Step 3: Comment + anonymous
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canNext = step === 1 ? rating > 0 : true;

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    const result = await submitVerifiedReview({
      appointmentId: appointment.appointment_id,
      rating,
      ratingPunctuality: punctuality || undefined,
      ratingAttention: attention || undefined,
      ratingFacilities: facilities || undefined,
      comment: comment.trim() || undefined,
      isAnonymous,
    });

    if (result.error) {
      showToast(result.error, 'error');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
    showToast('¡Gracias por tu reseña!', 'success');
    onSuccess?.();
  }, [appointment, rating, punctuality, attention, facilities, comment, isAnonymous, onSuccess]);

  // ─── Success state ───────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">¡Reseña enviada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tu opinión ayuda a otros pacientes a encontrar al mejor doctor.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // ─── Wizard modal ────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">Evaluar consulta</h2>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {appointment.doctor_name} · {formatSpecialty(appointment.specialty)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i + 1 <= step ? 'bg-primary' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-right">
            Paso {step} de {totalSteps}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[260px]">
          {/* ─── Step 1: General rating ─── */}
          {step === 1 && (
            <div className="text-center space-y-6">
              {/* Doctor mini-card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 text-left">
                {appointment.doctor_avatar ? (
                  <img
                    src={appointment.doctor_avatar}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {appointment.doctor_name?.charAt(0) ?? 'D'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {appointment.doctor_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(appointment.start_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  ¿Cómo fue tu experiencia?
                </h3>
                <p className="text-sm text-gray-500">
                  Califica tu consulta de forma general
                </p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <StarRating value={rating} onChange={setRating} />
                {rating > 0 && (
                  <span className="text-sm font-medium text-gray-600 animate-in fade-in">
                    {RATING_LABELS[rating]}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 2: Dimension ratings ─── */}
          {step === 2 && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Califica por categoría
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Estas calificaciones son opcionales pero ayudan mucho
              </p>

              <DimensionRating
                icon={<Clock className="w-4 h-4 text-blue-500" />}
                label="Puntualidad"
                value={punctuality}
                onChange={setPunctuality}
              />
              <DimensionRating
                icon={<Heart className="w-4 h-4 text-rose-500" />}
                label="Atención médica"
                value={attention}
                onChange={setAttention}
              />
              <DimensionRating
                icon={<Building2 className="w-4 h-4 text-amber-500" />}
                label="Instalaciones"
                value={facilities}
                onChange={setFacilities}
              />
            </div>
          )}

          {/* ─── Step 3: Comment + anonymous ─── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Cuéntanos tu experiencia
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  Tu comentario ayuda a otros pacientes
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="¿Cómo fue la atención? ¿El doctor fue claro en sus explicaciones? ¿Recomendarías esta consulta?"
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1 text-right">
                  {comment.length}/1000
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isAnonymous
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isAnonymous ? (
                  <EyeOff className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400 shrink-0" />
                )}
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-800">Reseña anónima</p>
                  <p className="text-xs text-gray-500">
                    {isAnonymous
                      ? 'Tu nombre no se mostrará públicamente'
                      : 'Se mostrará tu primer nombre'}
                  </p>
                </div>
                <div
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                    isAnonymous ? 'bg-primary justify-end' : 'bg-gray-200 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !rating}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar reseña
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
