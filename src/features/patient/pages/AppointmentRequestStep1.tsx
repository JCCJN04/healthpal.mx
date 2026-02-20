import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import StepIndicator from '@/shared/components/ui/StepIndicator';
import DoctorInfoCard from '@/features/patient/components/DoctorInfoCard';

const AppointmentRequestStep1: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    reason: '',
    consultationType: 'Presencial',
    additionalInfo: '',
  });

  const [errors, setErrors] = useState({
    reason: '',
  });

  const steps = [
    { number: 1, label: 'escribir solicitud', isActive: true },
    { number: 2, label: 'revisar solicitud', isActive: false },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (name === 'reason' && errors.reason) {
      setErrors(prev => ({ ...prev, reason: '' }));
    }
  };

  const handleNext = () => {
    // Validate
    if (!formData.reason.trim()) {
      setErrors({ reason: 'Por favor ingresa el motivo de tu consulta' });
      return;
    }

    // Save to sessionStorage for next step
    sessionStorage.setItem('appointmentRequestData', JSON.stringify(formData));
    
    // Navigate to step 2
    navigate('/dashboard/consultas/nueva/revision');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <StepIndicator steps={steps} />
        </div>

        {/* Doctor Info Card */}
        <DoctorInfoCard
          doctorName="Dr. Alfonso Reyes"
          addressLine1="Alicante 135, Rincón de San Jerónimo, 64637"
          addressLine2="Monterrey, N.L."
          appointmentDate="25 de Enero 2026"
          appointmentTime="8:00 am a 9:00 am"
        />

        {/* Form Section */}
        <div className="bg-white rounded-xl p-8 space-y-6">
          {/* Reason for consultation */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              ¿Cuál es el motivo de tu consulta?
            </label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Ej. Dolor de espalda, seguimiento…"
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.reason ? 'border-red-400' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent`}
            />
            <p className="text-sm text-gray-500 mt-2">
              Esta información ayuda al doctor a prepararse mejor
            </p>
            {errors.reason && (
              <p className="text-sm text-red-600 mt-1">{errors.reason}</p>
            )}
          </div>

          {/* Consultation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Tipo de consulta
            </label>
            <div className="relative">
              <select
                name="consultationType"
                value={formData.consultationType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent appearance-none bg-white"
              >
                <option value="Presencial">Presencial</option>
                <option value="Videollamada">Videollamada</option>
                <option value="Llamada telefónica">Llamada telefónica</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Información adicional (opcional)
            </label>
            <textarea
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleInputChange}
              placeholder="Síntomas, estudios previos, algo que quieras que el doctor sepa…"
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#33C7BE] focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 my-8 border border-teal-100">
          <div className="flex items-start gap-3">
            <Stethoscope className="w-5 h-5 text-[#33C7BE] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[#33C7BE] font-semibold mb-1">¿Qué sigue?</h4>
              <p className="text-gray-700 text-sm">
                En el siguiente paso elegirás fecha y horario según la disponibilidad del doctor.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-lg border-2 border-[#33C7BE] text-[#33C7BE] font-medium hover:bg-teal-50 transition-colors"
          >
            regresar
          </button>
          <button
            onClick={handleNext}
            className="px-8 py-3 rounded-lg bg-[#33C7BE] text-white font-medium hover:bg-teal-600 transition-colors"
          >
            siguiente
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AppointmentRequestStep1;
