import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Award,
  Clock,
  Loader2,
  XCircle,
  Stethoscope,
  Building2,
  BadgeCheck,
  DollarSign,
  FileText,
  Phone,
  ExternalLink,
  CalendarDays,
  Pill,
  CheckCircle2,
  XCircle as XCircleIcon,
  AlertCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import {
  getDoctorById,
  DoctorWithProfile,
} from '@/features/patient/services/doctors';
import type { DoctorLocation } from '@/shared/types/database';
import { geocodeAddress } from '@/shared/lib/geocoding';
import { formatSpecialty } from '@/shared/lib/specialties';
import { supabase } from '@/shared/lib/supabase';
import type { Prescription } from '@/shared/lib/queries/prescriptions';
import type { Appointment } from '@/shared/lib/queries/appointments';
import { useAuth } from '@/app/providers/AuthContext';
import type { MedicalReport } from '@/shared/lib/queries/medicalReports';
import { getReportPdfSignedUrl } from '@/shared/lib/queries/medicalReports';
import { PatientPrescriptionModal } from '@/features/patient/components/PatientPrescriptionModal';

type TabId = 'consultas' | 'recetas' | 'informes' | 'documentos';

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const stateDoctor = (location.state as { doctor?: DoctorWithProfile } | null)?.doctor ?? null;
  const [doctor, setDoctor] = useState<DoctorWithProfile | null>(stateDoctor);
  const [loading, setLoading] = useState(!stateDoctor);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [sharedDocs, setSharedDocs] = useState<{ id: string; title: string; category: string; created_at: string }[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);
  const [openingReportId, setOpeningReportId] = useState<string | null>(null);
  const [viewingReportUrl, setViewingReportUrl] = useState<string | null>(null);
  const [viewingReportName, setViewingReportName] = useState<string>('');

  const [geocodedCoords, setGeocodedCoords] = useState<DoctorLocation | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('consultas');
  const [tabsAtEnd, setTabsAtEnd] = useState(false);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const handleTabScroll = () => {
    const el = tabScrollRef.current;
    if (!el) return;
    setTabsAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    if (!id) return;
    loadDoctor();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadDoctor = async () => {
    if (!id) return;
    if (!stateDoctor) setLoading(true);
    setError(null);

    const data = await getDoctorById(id);
    if (!data) {
      if (!stateDoctor) setError('No se pudo cargar la información del doctor');
      setLoading(false);
      return;
    }

    setDoctor(data);
    setLoading(false);

    const loc = data.doctor_profile?.location as DoctorLocation | null;
    const hasStoredCoords = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
    if (!hasStoredCoords && data.doctor_profile?.address_text) {
      geocodeAddress(data.doctor_profile.address_text)
        .then((result) => {
          if (result) setGeocodedCoords({ lat: result.lat, lng: result.lng });
        });
    }
  };

  // Load historial on mount
  useEffect(() => {
    if (!id) return;
    setHistorialLoading(true);

    async function loadHistorial() {
      if (!id) return;
      // Step 1: appointments + prescriptions + docs (parallel)
      const [apptRes, rxRes, docsRes] = await Promise.all([
        supabase.from('appointments').select('*').eq('doctor_id', id).order('scheduled_at', { ascending: false }),
        supabase.from('prescriptions').select('*').eq('doctor_id', id).eq('is_template', false).order('issued_at', { ascending: false }),
        supabase.from('document_shares').select('documents(id, title, category, created_at)').eq('shared_by', id),
      ]);

      setAppointments((apptRes.data ?? []) as Appointment[]);
      setPrescriptions((rxRes.data ?? []) as Prescription[]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSharedDocs((docsRes.data ?? []).flatMap((s: any) => s.documents ? [s.documents] : []));

      // Step 2: medical reports (informes médicos) for this doctor-patient pair
      const reportsRes = await supabase
        .from('medical_reports')
        .select('*')
        .eq('doctor_id', id)
        .order('updated_at', { ascending: false });
      setMedicalReports((reportsRes.data ?? []) as MedicalReport[]);

      setHistorialLoading(false);
    }

    loadHistorial();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const handleOpenReport = async (report: MedicalReport) => {
    if (!report.pdf_storage_path || !report.id) return;
    setOpeningReportId(report.id);
    try {
      const signedUrl = await getReportPdfSignedUrl(report.pdf_storage_path);
      setViewingReportName(report.aseguradora);
      setViewingReportUrl(signedUrl);
    } catch {
      // silently ignore
    } finally {
      setOpeningReportId(null);
    }
  };

  const handleCloseReport = () => {
    setViewingReportUrl(null);
  };

  const handleSendMessage = () => {
    if (!doctor) return;
    const phone = doctor.phone;
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, '');
    const number = cleaned.startsWith('52') ? cleaned : `52${cleaned}`;
    window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer');
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
              <Loader2 className="w-14 h-14 text-primary animate-spin" />
            </div>
            <p className="text-gray-500 font-medium">Cargando perfil…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ─── Error ─── */
  if (error || !doctor) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Error al cargar el perfil</h3>
            <p className="text-gray-500 text-sm mb-6">{error || 'El doctor no existe'}</p>
            <Link
              to="/dashboard/doctores"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al directorio
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const profile = doctor.doctor_profile;
  const loc = profile?.location as DoctorLocation | null;
  const storedCoords = loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' ? loc : null;
  const coords = storedCoords ?? geocodedCoords;

  const initials = doctor.full_name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'D';

  const specialtyLabel = formatSpecialty(profile?.specialty);

  const whatsappSvg = (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );

  const tabs: { id: TabId; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'consultas', label: 'Consultas', icon: CalendarDays, count: appointments.length },
    { id: 'recetas', label: 'Recetas', icon: Pill, count: prescriptions.length },
    { id: 'informes', label: 'Informes', icon: FileText, count: medicalReports.length },
    { id: 'documentos', label: 'Documentos', icon: FileText, count: sharedDocs.length },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Back */}
        <button
          onClick={() => navigate('/dashboard/doctores')}
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Volver al directorio
        </button>

        {/* ─── TOP: Doctor info ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Banner */}
          <div className="h-20 bg-gradient-to-r from-[#2bbdb4] via-[#33C7BE] to-emerald-500 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          </div>

          <div className="px-5 pb-5">
            {/* Avatar + name row */}
            <div className="flex items-start justify-between gap-3 -mt-8 mb-4">
              <div className="flex items-end gap-3">
                {doctor.avatar_url ? (
                  <img src={doctor.avatar_url} alt={doctor.full_name || 'Doctor'}
                    className="w-16 h-16 rounded-xl object-cover border-[3px] border-white shadow-md ring-1 ring-black/5 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#33C7BE] to-teal-700 flex items-center justify-center text-white text-xl font-bold border-[3px] border-white shadow-md flex-shrink-0">
                    {initials}
                  </div>
                )}
                <div className="pb-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-lg font-bold text-gray-900 leading-tight">{doctor.full_name || 'Doctor'}</h1>
                    {!!(profile as Record<string, unknown>)?.is_sep_verified && (
                      <BadgeCheck className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-sm text-primary font-semibold flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5" />{specialtyLabel}
                  </p>
                </div>
              </div>
              {/* CTAs desktop */}
              <div className="hidden sm:flex items-center gap-2 pt-9 flex-shrink-0">
                <button onClick={() => navigate(`/dashboard/consultas/nueva?doctor=${doctor.id}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-sm">
                  <Clock className="w-4 h-4" />Agendar cita
                </button>
                <button onClick={handleSendMessage}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white text-sm font-semibold rounded-xl hover:bg-[#1ebe5d] transition-all shadow-sm">
                  {whatsappSvg}WhatsApp
                </button>
              </div>
            </div>

            {/* Info pills row */}
            <div className="flex flex-wrap gap-2 mb-3">
              {profile?.clinic_name && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                  <Building2 className="w-3 h-3 text-gray-400" />{profile.clinic_name}
                </span>
              )}
              {profile?.professional_license && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                  <BadgeCheck className="w-3 h-3 text-emerald-500" />Céd. {profile.professional_license}
                </span>
              )}
              {doctor.phone && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                  <Phone className="w-3 h-3 text-gray-400" />{doctor.phone}
                </span>
              )}
              {profile?.consultation_price_mxn && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                  <DollarSign className="w-3 h-3 text-blue-400" />${profile.consultation_price_mxn.toLocaleString('es-MX')} MXN
                </span>
              )}
              {profile?.years_experience && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                  <Award className="w-3 h-3 text-violet-400" />{profile.years_experience}+ años exp.
                </span>
              )}
            </div>

            {/* Address */}
            {profile?.address_text && (
              <div className="flex items-start gap-2 text-xs text-gray-500 mb-3">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{profile.address_text}</span>
                <a href={coords
                    ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address_text)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="ml-1 text-primary hover:underline flex items-center gap-0.5 flex-shrink-0">
                  <ExternalLink className="w-3 h-3" />Maps
                </a>
              </div>
            )}

            {/* Bio */}
            {profile?.bio && (
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{profile.bio}</p>
            )}

            {/* CTAs mobile */}
            <div className="sm:hidden flex gap-2 mt-3">
              <button onClick={() => navigate(`/dashboard/consultas/nueva?doctor=${doctor.id}`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all">
                <Clock className="w-4 h-4" />Agendar cita
              </button>
              <button onClick={handleSendMessage}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#25D366] text-white text-sm font-semibold rounded-xl hover:bg-[#1ebe5d] transition-all">
                {whatsappSvg}WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* ─── BOTTOM: Historial con tabs ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Tab bar */}
          <div className="relative border-b border-gray-200">
            <div
              ref={tabScrollRef}
              onScroll={handleTabScroll}
              className="flex overflow-x-auto px-4 sm:px-5"
              style={{ scrollbarWidth: 'none' }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id
                        ? 'bg-primary/15 text-primary'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Scroll hint */}
            <div className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 flex items-center justify-end pr-1 bg-gradient-to-l from-white via-white/80 to-transparent transition-opacity duration-200 lg:hidden ${tabsAtEnd ? 'opacity-0' : 'opacity-100'}`}>
              <ChevronRight size={14} className="text-gray-400" />
            </div>
          </div>

          {/* Tab content */}
          <div className="p-4 sm:p-5">
            {historialLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={22} className="animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* ── Consultas ── */}
                {activeTab === 'consultas' && (
                  appointments.length === 0 ? (
                    <EmptyState message="Sin consultas registradas" />
                  ) : (
                    <div className="space-y-2">
                      {appointments.map(appt => {
                        const date = new Date(appt.scheduled_at);
                        const statusIcon = appt.status === 'completed'
                          ? <CheckCircle2 size={13} className="text-emerald-500" />
                          : appt.status === 'cancelled'
                            ? <XCircleIcon size={13} className="text-red-400" />
                            : appt.status === 'confirmed'
                              ? <CheckCircle2 size={13} className="text-blue-400" />
                              : <AlertCircle size={13} className="text-amber-400" />;
                        const statusLabel: Record<string, string> = { completed: 'Completada', cancelled: 'Cancelada', confirmed: 'Confirmada', pending: 'Pendiente' };
                        const modeLabel: Record<string, string> = { in_person: 'Presencial', video: 'Video', phone: 'Teléfono' };
                        return (
                          <button
                            key={appt.id}
                            onClick={() => setViewingAppointment(appt)}
                            className="w-full flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <CalendarDays size={14} className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800">
                                {date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                                <span className="text-xs text-gray-400 font-normal ml-2">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-gray-500">{statusIcon} {statusLabel[appt.status] ?? appt.status}</span>
                                <span className="text-gray-300">·</span>
                                <span className="text-xs text-gray-500">{modeLabel[appt.mode] ?? appt.mode}</span>
                                {appt.reason && <><span className="text-gray-300">·</span><span className="text-xs text-gray-500 truncate max-w-[160px]">{appt.reason}</span></>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )
                )}

                {/* ── Recetas ── */}
                {activeTab === 'recetas' && (
                  prescriptions.length === 0 ? (
                    <EmptyState message="Sin recetas registradas" />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {prescriptions.map(rx => (
                        <button key={rx.id} onClick={() => setViewingPrescription(rx)}
                          className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                            <Pill size={14} className="text-teal-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{rx.medications.length} medicamento{rx.medications.length !== 1 ? 's' : ''}</p>
                            {rx.diagnosis && <p className="text-xs text-gray-500 truncate">{rx.diagnosis}</p>}
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(rx.issued_at + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {rx.folio && ` · #${rx.folio}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}

                {/* ── Informes médicos ── */}
                {activeTab === 'informes' && (
                  medicalReports.length === 0 ? (
                    <EmptyState message="Sin informes médicos registrados" />
                  ) : (
                    <div className="space-y-2">
                      {medicalReports.map(report => {
                        const hasPdf = !!report.pdf_storage_path;
                        const isLoading = openingReportId === report.id;
                        return (
                          <button
                            key={report.id}
                            onClick={() => handleOpenReport(report)}
                            disabled={!hasPdf || isLoading}
                            className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                              hasPdf
                                ? 'bg-gray-50 border-gray-100 hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
                                : 'bg-gray-50 border-gray-100 opacity-60 cursor-default'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${report.status === 'completed' ? 'bg-emerald-50' : 'bg-violet-50'}`}>
                              {isLoading
                                ? <Loader2 size={14} className="animate-spin text-primary" />
                                : <FileText size={14} className={report.status === 'completed' ? 'text-emerald-500' : 'text-violet-400'} />
                              }
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-800 truncate">{report.aseguradora}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${report.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {report.status === 'completed' ? 'Completado' : 'Borrador'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(report.updated_at ?? report.created_at ?? '').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                                {!hasPdf && <span className="text-xs text-gray-400 italic">PDF no disponible</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )
                )}

                {/* ── Documentos ── */}
                {activeTab === 'documentos' && (
                  sharedDocs.length === 0 ? (
                    <EmptyState message="Sin documentos compartidos" />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sharedDocs.map(doc => (
                        <div key={doc.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <FileText size={14} className="text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{doc.title}</p>
                            <p className="text-xs text-gray-400">{doc.category} · {new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {viewingAppointment && doctor && (
        <AppointmentModal
          appt={viewingAppointment}
          doctor={doctor}
          onClose={() => setViewingAppointment(null)}
        />
      )}

      {viewingPrescription && (
        <PatientPrescriptionModal prescription={viewingPrescription} onClose={() => setViewingPrescription(null)} />
      )}

      {viewingReportUrl && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/60" onClick={handleCloseReport}>
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-sm font-bold text-gray-900">Informe médico</p>
              <p className="text-xs text-gray-400">{viewingReportName}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={viewingReportUrl}
                download={`informe-${viewingReportName}.pdf`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                Descargar
              </a>
              <button
                onClick={handleCloseReport}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle size={18} className="text-gray-500" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden" onClick={e => e.stopPropagation()}>
            <iframe
              src={viewingReportUrl}
              className="w-full h-full border-0"
              title="Informe médico"
            />
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-gray-400 py-6 text-center">{message}</p>
  );
}

function AppointmentModal({ appt, doctor, onClose }: { appt: Appointment; doctor: DoctorWithProfile; onClose: () => void }) {
  const date = new Date(appt.scheduled_at);
  const statusLabel: Record<string, string> = { completed: 'Completada', cancelled: 'Cancelada', confirmed: 'Confirmada', pending: 'Pendiente' };
  const statusColor: Record<string, string> = { completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-600', confirmed: 'bg-blue-100 text-blue-700', pending: 'bg-amber-100 text-amber-700' };
  const modeLabel: Record<string, string> = { in_person: 'Presencial', video: 'Videollamada', phone: 'Teléfono' };
  const initials = doctor.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'DR';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Detalle de cita</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Doctor */}
          <div className="flex items-center gap-3">
            {doctor.avatar_url ? (
              <img src={doctor.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#33C7BE] to-teal-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{doctor.full_name ?? 'Doctor'}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${statusColor[appt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {statusLabel[appt.status] ?? appt.status}
              </span>
            </div>
          </div>

          {/* Date/time */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays size={15} className="text-primary flex-shrink-0" />
              <span className="font-semibold text-gray-800">{date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={15} className="text-primary flex-shrink-0" />
              <span className="text-gray-700">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-gray-400">· {modeLabel[appt.mode] ?? appt.mode}</span>
            </div>
          </div>

          {/* Reason */}
          {appt.reason && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Motivo</p>
              <p className="text-sm text-gray-700">{appt.reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

