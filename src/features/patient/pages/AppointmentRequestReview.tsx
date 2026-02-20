import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import StepIndicator from '@/shared/components/ui/StepIndicator';
import AppointmentSummaryCard from '@/features/patient/components/AppointmentSummaryCard';
import MapLocationCard from '@/shared/components/appointments/MapLocationCard';

const AppointmentRequestReview: React.FC = () => {
  const navigate = useNavigate();
  
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [appointmentData, setAppointmentData] = useState<any>(null);

  useEffect(() => {
    // Load data from sessionStorage
    const savedData = sessionStorage.getItem('appointmentRequestData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setAppointmentData({
        reason: parsed.reason,
        consultationType: parsed.consultationType,
        additionalInfo: parsed.additionalInfo,
        doctorName: 'Dr. Alfonso Reyes',
        appointmentDate: '25 de Enero 2026',
        appointmentTime: '8:00 am a 9:00 am',
      });
    } else {
      // No data found, show empty state
      setAppointmentData(null);
    }
  }, []);

  const steps = [
    { number: 1, label: 'escribir solicitud', isActive: false },
    { number: 2, label: 'revisar solicitud', isActive: true },
  ];

  const handleBack = () => {
    navigate(-1);
  };

  const handleEdit = () => {
    navigate('/dashboard/consultas/nueva/solicitud');
  };

  const handleSubmit = () => {
    if (!isConfirmed) {
      setShowError(true);
      return;
    }

    // Show toast
    setShowToast(true);
    
    // Clear sessionStorage
    sessionStorage.removeItem('appointmentRequestData');
    
    // Navigate after short delay
    setTimeout(() => {
      navigate('/dashboard/consultas');
    }, 1500);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsConfirmed(e.target.checked);
    if (e.target.checked) {
      setShowError(false);
    }
  };

  // Empty state if no data
  if (appointmentData === null) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <StepIndicator steps={steps} />
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No hay información para revisar</h2>
            <p className="text-gray-600 mb-6">
              Primero debes completar el formulario de solicitud.
            </p>
            <button
              onClick={() => navigate('/dashboard/consultas/nueva/solicitud')}
              className="px-6 py-3 bg-[#33C7BE] text-white font-medium rounded-lg hover:bg-teal-600 transition-colors"
            >
              Ir al formulario
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <StepIndicator steps={steps} />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column: Summary (2/3 width) */}
          <div className="lg:col-span-2">
            <AppointmentSummaryCard
              data={appointmentData}
              isConfirmed={isConfirmed}
              onEdit={handleEdit}
            />
          </div>

          {/* Right Column: Map & Location (1/3 width) */}
          <div className="lg:col-span-1">
            <MapLocationCard
              doctorName="Dr. Alfonso Reyes"
              addressLine1="Alicante 135, Rincón de San Jerónimo, 64637"
              addressLine2="Monterrey, N.L."
              specialty="Medicina general"
              rating={4.8}
            />
          </div>
        </div>

        {/* Confirmation Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className={`border-2 rounded-lg p-4 transition-colors ${
            showError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={handleCheckboxChange}
                className="w-5 h-5 text-[#33C7BE] border-gray-300 rounded focus:ring-2 focus:ring-[#33C7BE] focus:ring-offset-0 mt-0.5"
              />
              <span className="text-sm text-gray-900 font-medium">
                Confirmo que la información es correcta y deseo enviar esta solicitud.
              </span>
            </label>
            
            {showError && (
              <div className="flex items-center gap-2 mt-3 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Debes confirmar antes de enviar.</span>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Actions */}
        <div className="sticky bottom-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={handleBack}
              className="px-6 py-3 rounded-lg border-2 border-[#33C7BE] text-[#33C7BE] font-medium hover:bg-teal-50 transition-colors"
            >
              regresar
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={!isConfirmed}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                isConfirmed
                  ? 'bg-[#33C7BE] text-white hover:bg-teal-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              enviar solicitud
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-slide-up z-50">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Solicitud enviada</p>
              <p className="text-sm text-green-100">El doctor recibirá tu solicitud pronto</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default AppointmentRequestReview;
