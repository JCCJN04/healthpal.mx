import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Loader2,
  MessageSquareText,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import ReviewWizard from '@/features/patient/components/ReviewWizard';
import {
  getReviewableAppointments,
  type ReviewableAppointment,
} from '@/shared/lib/queries/publicDoctors';
import { formatSpecialty } from '@/shared/lib/specialties';

export default function MisResenas() {
  const [appointments, setAppointments] = useState<ReviewableAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReviewableAppointment | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getReviewableAppointments();
    setAppointments(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const pending = appointments.filter((a) => !a.already_reviewed);
  const reviewed = appointments.filter((a) => a.already_reviewed);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mis Reseñas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Evalúa tus consultas completadas para ayudar a otros pacientes.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <MessageSquareText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Sin consultas para evaluar
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Cuando completes una consulta, podrás dejar una reseña aquí.
            </p>
            <Link
              to="/dashboard/consultas"
              className="text-primary font-medium hover:underline text-sm"
            >
              Ver mis consultas
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending reviews */}
            {pending.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Pendientes de evaluar ({pending.length})
                </h2>
                <div className="space-y-3">
                  {pending.map((appt) => (
                    <button
                      key={appt.appointment_id}
                      type="button"
                      onClick={() => setSelected(appt)}
                      className="w-full bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-sm transition-all text-left group"
                    >
                      {appt.doctor_avatar ? (
                        <img
                          src={appt.doctor_avatar}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {appt.doctor_name?.charAt(0) ?? 'D'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {appt.doctor_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatSpecialty(appt.specialty)} ·{' '}
                          {new Date(appt.start_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg group-hover:bg-teal-600 transition-colors shrink-0">
                        Evaluar
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Already reviewed */}
            {reviewed.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Ya evaluadas ({reviewed.length})
                </h2>
                <div className="space-y-3">
                  {reviewed.map((appt) => (
                    <div
                      key={appt.appointment_id}
                      className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 opacity-60"
                    >
                      {appt.doctor_avatar ? (
                        <img
                          src={appt.doctor_avatar}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-lg">
                          {appt.doctor_name?.charAt(0) ?? 'D'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {appt.doctor_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatSpecialty(appt.specialty)} ·{' '}
                          {new Date(appt.start_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Evaluada
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review wizard modal */}
        {selected && (
          <ReviewWizard
            appointment={selected}
            onClose={() => setSelected(null)}
            onSuccess={() => {
              setSelected(null);
              load();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
