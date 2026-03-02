import { useEffect, useState } from 'react';
import { Star, MessageSquare, ChevronDown, Loader2, ThumbsUp } from 'lucide-react';
import {
  getPublicDoctorReviews,
  getDoctorReviewSummary,
  incrementReviewHelpful,
  type PublicDoctorReview,
  type PaginatedResult,
  type ReviewSummary,
} from '@/shared/lib/queries/publicDoctors';

// ─── Props ─────────────────────────────────────────────────────────────────

interface DoctorReviewsTabProps {
  doctorSlug: string;
  avgRating: number;
  reviewCount: number;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function DoctorReviewsTab({
  doctorSlug,
  avgRating,
  reviewCount,
}: DoctorReviewsTabProps) {
  const [result, setResult] = useState<PaginatedResult<PublicDoctorReview> | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Load summary once on mount
  useEffect(() => {
    getDoctorReviewSummary(doctorSlug).then(setSummary);
  }, [doctorSlug]);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    getPublicDoctorReviews(doctorSlug, page, 10).then((res) => {
      if (res.totalCount === 0 && res.data.length === 0) {
        // Could be a genuine empty result or a silent RPC error — surface it
        setFetchError(null);
      }
      setResult(res);
      setLoading(false);
    }).catch((err) => {
      setFetchError(String(err));
      setLoading(false);
    });
  }, [doctorSlug, page]);

  // Derive real values from summary when available, fallback to props
  const displayRating = summary && summary.total_count > 0 ? Number(summary.avg_rating) : avgRating;
  const displayCount  = summary ? Number(summary.total_count) : reviewCount;

  return (
    <div className="space-y-6">
      {/* Rating summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6">
        {/* Big rating */}
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-900">{displayRating > 0 ? displayRating.toFixed(1) : '—'}</p>
          <div className="flex items-center gap-0.5 justify-center mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i <= Math.round(displayRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {displayCount} opinión{displayCount !== 1 ? 'es' : ''}
          </p>
        </div>

        {/* Rating bars — real counts from summary when available */}
        <div className="flex-1 w-full max-w-xs space-y-1.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary
              ? Number(summary[`stars_${stars}` as keyof ReviewSummary] ?? 0)
              : 0;
            const pct = displayCount > 0 ? Math.round((count / displayCount) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-3 text-right">{stars}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews list */}
      {loading && !result ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : fetchError ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-500">Error al cargar opiniones. Por favor recarga la página.</p>
          <p className="text-xs text-gray-400 mt-1 font-mono">{fetchError}</p>
        </div>
      ) : result && result.data.length > 0 ? (
        <div className="space-y-4">
          {result.data.map((review, i) => (
            <ReviewCard key={i} review={review} />
          ))}

          {/* Load more */}
          {result.page < result.totalPages && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-primary font-medium hover:bg-primary/5 rounded-lg transition"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Ver más opiniones ({result.totalCount - result.data.length} restantes)
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Aún no hay opiniones para este doctor.</p>
          <p className="text-xs text-gray-400 mt-1">Sé el primero en dejar una reseña.</p>
        </div>
      )}
    </div>
  );
}

// ─── Review card ───────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: PublicDoctorReview }) {
  const storageKey = `hp_helpful_${review.id}`;
  const [voted, setVoted] = useState(() =>
    review.id ? localStorage.getItem(storageKey) === '1' : false
  );
  const [count, setCount] = useState(review.helpful_count ?? 0);

  const handleHelpful = async () => {
    if (voted || !review.id) return;
    setVoted(true);
    setCount((c) => c + 1);
    localStorage.setItem(storageKey, '1');
    await incrementReviewHelpful(review.id);
  };

  const date = new Date(review.created_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-gray-900">{review.reviewer}</p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i <= review.rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {review.comment && (
        <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleHelpful}
          disabled={voted || !review.id}
          className={`text-xs flex items-center gap-1 transition ${
            voted
              ? 'text-primary font-medium cursor-default'
              : 'text-gray-400 hover:text-primary cursor-pointer'
          }`}
        >
          <ThumbsUp className={`w-3 h-3 ${voted ? 'fill-primary' : ''}`} />
          Útil{count > 0 ? ` (${count})` : ''}
        </button>
      </div>
    </div>
  );
}
