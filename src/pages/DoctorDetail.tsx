import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  GraduationCap,
  Users,
  Calendar,
  Star,
  MessageSquare,
  Award,
  Clock,
  CheckCircle,
  Loader2,
  XCircle,
  DollarSign,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { getDoctorById, DoctorWithProfile } from '../lib/queries/doctors';

type TabType = 'info' | 'reviews' | 'schedule';

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [doctor, setDoctor] = useState<DoctorWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDoctor();
  }, [id]);

  const loadDoctor = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const data = await getDoctorById(id);

    if (!data) {
      setError('No se pudo cargar la información del doctor');
      setLoading(false);
      return;
    }

    setDoctor(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-[#33C7BE] animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando información del doctor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !doctor) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md mx-auto">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar el perfil</h3>
            <p className="text-red-700 mb-4">{error || 'El doctor no existe'}</p>
            <button
              onClick={() => navigate('/dashboard/doctores')}
              className="inline-flex items-center gap-2 text-[#33C7BE] hover:text-teal-600 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al directorio
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const profile = doctor.doctor_profile;

  const handleScheduleAppointment = () => {
    navigate(`/dashboard/consultas/nueva?doctor=${doctor.id}`);
  };

  const handleSendMessage = () => {
    navigate(`/dashboard/mensajes?doctorId=${doctor.id}`);
  };

  // Mock reviews (TODO: get from database later)
  const mockReviews = [
    {
      id: '1',
      author: 'María González',
      rating: 5,
      date: '15/01/2026',
      comment: 'Excelente doctor, muy profesional y empático. Resolvió todas mis dudas y el tratamiento funcionó perfectamente.',
    },
    {
      id: '2',
      author: 'Carlos Ramírez',
      rating: 5,
      date: '10/01/2026',
      comment: 'Muy recomendable. Atención de primera calidad y explicaciones muy claras.',
    },
    {
      id: '3',
      author: 'Ana Martínez',
      rating: 4,
      date: '05/01/2026',
      comment: 'Buena atención, aunque tuve que esperar un poco. En general muy satisfecha con el servicio.',
    },
  ];

  // Mock schedule (TODO: get from database later)
  const mockSchedule = [
    { day: 'Lunes', hours: '09:00 - 18:00' },
    { day: 'Martes', hours: '09:00 - 18:00' },
    { day: 'Miércoles', hours: '09:00 - 18:00' },
    { day: 'Jueves', hours: '09:00 - 18:00' },
    { day: 'Viernes', hours: '09:00 - 14:00' },
    { day: 'Sábado', hours: 'Cerrado' },
    { day: 'Domingo', hours: 'Cerrado' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard/doctores')}
          className="flex items-center gap-2 text-gray-600 hover:text-[#33C7BE] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Volver a doctores</span>
        </button>

        {/* Hero Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header with gradient */}
          <div className="h-32 bg-gradient-to-r from-[#33C7BE] to-teal-600"></div>

          {/* Doctor Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row gap-6 -mt-16">
              {/* Avatar */}
              {doctor.avatar_url ? (
                <img
                  src={doctor.avatar_url}
                  alt={doctor.full_name || 'Doctor'}
                  className="w-32 h-32 rounded-2xl object-cover shadow-lg border-4 border-white flex-shrink-0"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#33C7BE] to-teal-600 text-white text-3xl font-bold shadow-lg border-4 border-white flex-shrink-0">
                  {doctor.full_name?.charAt(0) || 'D'}
                </div>
              )}

              {/* Main Info */}
              <div className="flex-1 pt-16 md:pt-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {doctor.full_name || 'Doctor'}
                    </h1>
                    <p className="text-lg text-gray-600 mb-3">{profile?.specialty || 'Médico General'}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {profile?.clinic_name && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{profile.clinic_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-gray-900">4.9</span>
                        <span>(250 reseñas)</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        Disponible
                      </span>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleScheduleAppointment}
                      className="px-6 py-3 bg-[#33C7BE] text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-5 h-5" />
                      <span>Agendar cita</span>
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:border-[#33C7BE] hover:text-[#33C7BE] transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span>Mensaje</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">1,250</p>
                <p className="text-sm text-gray-600">Pacientes</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{profile?.years_experience || 10}+</p>
                <p className="text-sm text-gray-600">Años exp.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">4.9</p>
                <p className="text-sm text-gray-600">Calificación</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">250</p>
                <p className="text-sm text-gray-600">Reseñas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="border-b border-gray-100">
            <div className="flex">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'info'
                    ? 'text-[#33C7BE] border-b-2 border-[#33C7BE]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Información
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'reviews'
                    ? 'text-[#33C7BE] border-b-2 border-[#33C7BE]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Reseñas
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'schedule'
                    ? 'text-[#33C7BE] border-b-2 border-[#33C7BE]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Horarios
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                {profile?.bio && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <GraduationCap className="w-5 h-5 text-[#33C7BE]" />
                      <h3 className="font-semibold text-gray-900">Sobre el doctor</h3>
                    </div>
                    <p className="text-gray-700">{profile.bio}</p>
                  </div>
                )}

                {profile?.specialty && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="w-5 h-5 text-[#33C7BE]" />
                      <h3 className="font-semibold text-gray-900">Especialidad</h3>
                    </div>
                    <p className="text-gray-700">{profile.specialty}</p>
                  </div>
                )}

                {profile?.professional_license && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="w-5 h-5 text-[#33C7BE]" />
                      <h3 className="font-semibold text-gray-900">Cédula Profesional</h3>
                    </div>
                    <p className="text-gray-700">{profile.professional_license}</p>
                  </div>
                )}

                {profile?.address_text && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-[#33C7BE]" />
                      <h3 className="font-semibold text-gray-900">Dirección</h3>
                    </div>
                    <p className="text-gray-700">{profile.address_text}</p>
                  </div>
                )}

                {profile?.consultation_price_mxn && (
                  <div className="bg-teal-50 border border-teal-100 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-teal-900 font-medium">Precio de consulta</p>
                        <p className="text-2xl font-bold text-teal-900 mt-1">
                          ${profile.consultation_price_mxn.toLocaleString()} MXN
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-teal-600" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {mockReviews.map((review) => (
                  <div key={review.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{review.author}</p>
                        <p className="text-xs text-gray-500">{review.date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm">{review.comment}</p>
                  </div>
                ))}
                <button className="w-full px-4 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:border-[#33C7BE] hover:text-[#33C7BE] transition-colors">
                  Ver todas las reseñas
                </button>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-[#33C7BE]" />
                  <h3 className="font-semibold text-gray-900">Horario de atención</h3>
                </div>
                {mockSchedule.map((item) => (
                  <div key={item.day} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-900">{item.day}</span>
                    <span className={`text-sm ${item.hours === 'Cerrado' ? 'text-gray-400' : 'text-gray-700'}`}>
                      {item.hours}
                    </span>
                  </div>
                ))}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-900">
                    <strong>Nota:</strong> Los horarios pueden variar por días festivos. 
                    Confirma tu cita con anticipación para asegurar disponibilidad.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
