// Copy this into src/pages/DoctorDetail.tsx to replace mock data

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Award,
  Users,
  Star,
  Calendar,
  MessageSquare,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { getDoctorById, DoctorWithProfile } from '../lib/queries/doctors';
import { showToast } from '../components/Toast';

// Mock reviews (you can move this to a query later)
const mockReviews = [
  {
    id: '1',
    author: 'María González',
    rating: 5,
    date: '2025-01-15',
    comment: 'Excelente atención y profesionalismo. Muy recomendado.',
  },
  {
    id: '2',
    author: 'Carlos Ramírez',
    rating: 5,
    date: '2025-01-10',
    comment: 'El doctor es muy atento y explica todo con claridad.',
  },
];

// Mock schedule (you can move this to a query later)
const mockSchedule = [
  { day: 'Lunes', hours: '9:00 AM - 5:00 PM' },
  { day: 'Martes', hours: '9:00 AM - 5:00 PM' },
  { day: 'Miércoles', hours: '9:00 AM - 5:00 PM' },
  { day: 'Jueves', hours: '9:00 AM - 5:00 PM' },
  { day: 'Viernes', hours: '9:00 AM - 2:00 PM' },
  { day: 'Sábado', hours: 'Cerrado' },
  { day: 'Domingo', hours: 'Cerrado' },
];

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'info' | 'reviews' | 'schedule'>('info');

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

  const handleScheduleAppointment = () => {
    if (!doctor) return;
    navigate(`/dashboard/consultas/nueva?doctor=${doctor.id}`);
  };

  const handleSendMessage = () => {
    if (!doctor) return;
    navigate(`/dashboard/mensajes?doctorId=${doctor.id}`);
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar el perfil</h3>
            <p className="text-red-700 mb-4">{error || 'El doctor no existe'}</p>
            <Link
              to="/dashboard/doctores"
              className="inline-flex items-center gap-2 text-[#33C7BE] hover:text-teal-600 font-medium"
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

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard/doctores')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Volver al directorio</span>
        </button>

        {/* Hero Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-[#33C7BE] to-teal-500 h-32"></div>

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-start gap-6 -mt-16 mb-6">
              {doctor.avatar_url ? (
                <img
                  src={doctor.avatar_url}
                  alt={doctor.full_name || 'Doctor'}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#33C7BE] to-teal-500 flex items-center justify-center text-white text-5xl font-bold border-4 border-white shadow-lg">
                  {doctor.full_name?.charAt(0) || 'D'}
                </div>
              )}

              <div className="flex-1 mt-16">
                <h1 className="text-3xl font-bold text-gray-900">{doctor.full_name || 'Doctor'}</h1>
                <p className="text-lg text-gray-600 mt-1">{profile?.specialty || 'Médico General'}</p>
                {profile?.clinic_name && (
                  <p className="text-gray-500 mt-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {profile.clinic_name}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">500+</p>
                <p className="text-sm text-blue-700">Pacientes</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <Award className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-900">{profile?.years_experience || 10}+</p>
                <p className="text-sm text-purple-700">Años exp.</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <Star className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-900">4.9</p>
                <p className="text-sm text-yellow-700">Rating</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">250+</p>
                <p className="text-sm text-green-700">Reseñas</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleScheduleAppointment}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#33C7BE] text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
              >
                <Calendar className="w-5 h-5" />
                <span>Agendar cita</span>
              </button>
              <button
                onClick={handleSendMessage}
                className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#33C7BE] text-[#33C7BE] font-semibold rounded-lg hover:bg-teal-50 transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Enviar mensaje</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab Headers */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setSelectedTab('info')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors border-b-2 ${
                  selectedTab === 'info'
                    ? 'border-[#33C7BE] text-[#33C7BE] bg-teal-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Información
              </button>
              <button
                onClick={() => setSelectedTab('reviews')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors border-b-2 ${
                  selectedTab === 'reviews'
                    ? 'border-[#33C7BE] text-[#33C7BE] bg-teal-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Reseñas
              </button>
              <button
                onClick={() => setSelectedTab('schedule')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors border-b-2 ${
                  selectedTab === 'schedule'
                    ? 'border-[#33C7BE] text-[#33C7BE] bg-teal-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Horarios
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {selectedTab === 'info' && (
              <div className="space-y-6">
                {profile?.bio && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Sobre el doctor</h3>
                    <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
                  </div>
                )}

                {profile?.specialty && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Especialidad</h3>
                    <p className="text-gray-600">{profile.specialty}</p>
                  </div>
                )}

                {profile?.professional_license && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Cédula Profesional</h3>
                    <p className="text-gray-600">{profile.professional_license}</p>
                  </div>
                )}

                {profile?.address_text && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Dirección</h3>
                    <p className="text-gray-600 flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      {profile.address_text}
                    </p>
                  </div>
                )}

                {profile?.consultation_price_mxn && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Precio de consulta</h3>
                    <p className="text-gray-600">
                      ${profile.consultation_price_mxn.toLocaleString('es-MX')} MXN
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'reviews' && (
              <div className="space-y-4">
                {mockReviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{review.author}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(review.date).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <p className="text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {selectedTab === 'schedule' && (
              <div className="space-y-3">
                {mockSchedule.map((item) => (
                  <div key={item.day} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{item.day}</span>
                    </div>
                    <span className={item.hours === 'Cerrado' ? 'text-red-600' : 'text-gray-600'}>
                      {item.hours}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
