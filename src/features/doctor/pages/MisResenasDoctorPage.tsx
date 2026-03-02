import { useState, useEffect } from 'react';
import {
  Star,
  Loader2,
  MessageSquareText,
  ThumbsUp,
  Clock,
  Building2,
  Heart,
  CheckCircle,
} from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import { useAuth } from '@/app/providers/AuthContext';
import {
  getPublicDoctorReviews,
  getDoctorReviewSummary,
  type PublicDoctorReview,
  type ReviewSummary,
} from '@/shared/lib/queries/publicDoctors';
import { supabase } from '@/shared/lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

function DimensionBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const pct = value > 0 ? (value / 5) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex items-center gap-1.5 w-32 text-gray-600 shrink-0">{icon}{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">
        {value > 0 ? value.toFixed(1) : '—'}
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function MisResenasDoctorPage() {
  const { user } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);
  const [reviews, setReviews] = useState<PublicDoctorReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const PAGE_SIZE = 10;

  // Resolve doctor slug
  useEffect(() => {
    if (!user) return;
    supabase
      .from('doctor_profiles')
      .select('slug')
      .eq('doctor_id', user.id)
      .single()
      .then(({ data }) => {
        const row = data as { slug: string } | null;
        if (row?.slug) setSlug(row.slug);
        else setLoading(false);
      });
  }, [user]);

  // Load reviews + summary when slug is ready
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      getPublicDoctorReviews(slug, page, PAGE_SIZE),
      getDoctorReviewSummary(slug),
    ]).then(([result, sum]) => {
      setReviews(result.data);
      setTotalPages(result.totalPages);
      setSummary(sum);
      setLoading(false);
    });
  }, [slug, page]);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Reseñas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Opiniones de tus pacientes sobre tus consultas.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !slug ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <MessageSquareText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Completa tu perfil de doctor para ver tus reseñas.</p>
          </div>
        ) : (
          <>
            {/* Summary card */}
            {summary && summary.total_count > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  {/* Big average */}
                  <div className="text-center shrink-0">
                    <p className="text-5xl font-extrabold text-gray-900 leading-none">
                      {summary.avg_rating.toFixed(1)}
                    </p>
                    <StarRow value={summary.avg_rating} />
                    <p className="text-xs text-gray-500 mt-1">
                      {summary.total_count} reseña{summary.total_count !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Stars histogram */}
                  <div className="flex-1 min-w-0 w-full space-y-1.5">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const key = `stars_${n}` as keyof ReviewSummary;
                      const count = (summary[key] as number) ?? 0;
                      const pct = summary.total_count > 0 ? (count / summary.total_count) * 100 : 0;
                      return (
                        <div key={n} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-gray-600 text-right">{n}</span>
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-5 text-gray-500">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dimension scores */}
                {(summary.avg_punctuality > 0 || summary.avg_attention > 0 || summary.avg_facilities > 0) && (
                  <div className="border-t border-gray-100 pt-5 space-y-3">
                    <DimensionBar
                      label="Puntualidad"
                      value={summary.avg_punctuality}
                      icon={<Clock className="w-3.5 h-3.5 text-blue-500" />}
                    />
                    <DimensionBar
                      label="Atención"
                      value={summary.avg_attention}
                      icon={<Heart className="w-3.5 h-3.5 text-rose-500" />}
                    />
                    <DimensionBar
                      label="Instalaciones"
                      value={summary.avg_facilities}
                      icon={<Building2 className="w-3.5 h-3.5 text-amber-500" />}
                    />
                  </div>
                )}
              </div>
            ) : (
              !loading && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                  <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-600 mb-1">Sin reseñas aún</p>
                  <p className="text-sm text-gray-400">
                    Las reseñas aparecen aquí cuando tus pacientes completen una cita y la evalúen.
                  </p>
                </div>
              )
            )}

            {/* Reviews list */}
            {reviews.length > 0 && (
              <div className="space-y-4">
                {reviews.map((review, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {review.is_anonymous ? '?' : review.reviewer?.charAt(0)?.toUpperCase() ?? 'P'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {review.is_anonymous ? 'Paciente Anónimo' : review.reviewer}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(review.created_at).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StarRow value={review.rating} />
                        <span className="text-sm font-bold text-gray-700">{review.rating}/5</span>
                      </div>
                    </div>

                    {/* Sub-ratings */}
                    {(review.rating_punctuality || review.rating_attention || review.rating_facilities) ? (
                      <div className="flex flex-wrap gap-2">
                        {review.rating_punctuality ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                            <Clock className="w-3 h-3" /> Puntualidad: {review.rating_punctuality}/5
                          </span>
                        ) : null}
                        {review.rating_attention ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-600">
                            <Heart className="w-3 h-3" /> Atención: {review.rating_attention}/5
                          </span>
                        ) : null}
                        {review.rating_facilities ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
                            <Building2 className="w-3 h-3" /> Instalaciones: {review.rating_facilities}/5
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Comment */}
                    {review.comment ? (
                      <p className="text-sm text-gray-700 leading-relaxed border-l-2 border-primary/20 pl-3">
                        "{review.comment}"
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Sin comentario adicional
                      </p>
                    )}

                    {/* Positive indicator */}
                    {review.rating >= 4 && (
                      <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Reseña positiva
                      </div>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-500">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
