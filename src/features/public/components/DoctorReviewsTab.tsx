import { useEffect, useState } from 'react';
import { Star, MessageSquare, ChevronDown, Loader2, ThumbsUp } from 'lucide-react';
import {
  getPublicDoctorReviews,
  type PublicDoctorReview,
  type PaginatedResult,
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
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    getPublicDoctorReviews(doctorSlug, page, 10).then((res) => {
      setResult(res);
      setLoading(false);
    });
  }, [doctorSlug, page]);

  return (
    <div className="space-y-6">
      {/* Rating summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6">
        {/* Big rating */}
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
          <div className="flex items-center gap-0.5 justify-center mt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i <= Math.round(avgRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {reviewCount} opinión{reviewCount !== 1 ? 'es' : ''}
          </p>
        </div>

        {/* Rating bars */}
        <div className="flex-1 w-full max-w-xs space-y-1.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            // We don't have per-star counts from the API; show a simple visual
            const pct =
              reviewCount > 0 && avgRating > 0
                ? Math.max(
                    5,
                    stars === Math.round(avgRating)
                      ? 70
                      : Math.abs(stars - avgRating) < 1
                      ? 40
                      : 10,
                  )
                : 0;
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
          className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 transition"
        >
          <ThumbsUp className="w-3 h-3" />
          Útil
        </button>
      </div>
    </div>
  );
}
