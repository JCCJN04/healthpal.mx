import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { PatientProfile } from '@/shared/types/database';

interface PatientProfileWizardProps {
    initialData: PatientProfile | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
}

type Step = 'emergency' | 'medical' | 'metrics' | 'insurance';

const PatientProfileWizard = ({ initialData, isOpen, onClose, onSave }: PatientProfileWizardProps) => {
    if (!isOpen) return null;

    const [currentStep, setCurrentStep] = useState<Step>('emergency');
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        emergency_contact_name: initialData?.emergency_contact_name || '',
        emergency_contact_phone: initialData?.emergency_contact_phone || '',
        allergies: initialData?.allergies || '',
        chronic_conditions: initialData?.chronic_conditions || '',
        current_medications: initialData?.current_medications || '',
        blood_type: initialData?.blood_type || '',
        height_cm: initialData?.height_cm || '',
        weight_kg: initialData?.weight_kg || '',
        insurance_provider: initialData?.insurance_provider || '',
        insurance_policy_number: initialData?.insurance_policy_number || '',
        preferred_language: initialData?.preferred_language || 'Español',
        notes_for_doctor: initialData?.notes_for_doctor || '',
    });

    const steps: { id: Step; label: string; description: string }[] = [
        { id: 'emergency', label: 'Contacto', description: 'En caso de emergencia' },
        { id: 'medical', label: 'Historial', description: 'Alergias y condiciones' },
        { id: 'metrics', label: 'Datos', description: 'Peso, altura, sangre' },
        { id: 'insurance', label: 'Seguro', description: 'Póliza y notas' },
    ];

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateStep = (step: Step): boolean => {
        switch (step) {
            case 'emergency':
                // Optional but recommended. If filled, needs both.
                if (formData.emergency_contact_name && !formData.emergency_contact_phone) return false;
                if (!formData.emergency_contact_name && formData.emergency_contact_phone) return false;
                return true;
            case 'metrics':
                const h = Number(formData.height_cm);
                const w = Number(formData.weight_kg);
                if (formData.height_cm && (h < 50 || h > 250)) return false;
                if (formData.weight_kg && (w < 2 || w > 350)) return false;
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (!validateStep(currentStep)) {
            // Simple alerting strategy, could be better
            alert('Por favor verifica los datos ingresados.');
            return;
        }

        const currentIndex = steps.findIndex(s => s.id === currentStep);
        if (currentIndex < steps.length - 1) {
            setCurrentStep(steps[currentIndex + 1].id);
        } else {
            handleSave();
        }
    };

    const handleBack = () => {
        const currentIndex = steps.findIndex(s => s.id === currentStep);
        if (currentIndex > 0) {
            setCurrentStep(steps[currentIndex - 1].id);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Clean up data before saving
            const dataToSave = {
                ...formData,
                height_cm: formData.height_cm ? Number(formData.height_cm) : null,
                weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
            };

            await onSave(dataToSave);
            onClose();
        } catch (error) {
            console.error('Error saving wizard:', error);
            alert('Error al guardar. Intenta de nuevo.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Perfil del paciente</h2>
                        <p className="text-sm text-gray-500">Completa tu información para una mejor atención</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-8 pt-6">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-gray-100 -z-10" />

                        {steps.map((step, index) => {
                            const isActive = step.id === currentStep;
                            const isCompleted = steps.findIndex(s => s.id === currentStep) > index;

                            return (
                                <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${isActive
                                            ? 'bg-[#33C7BE] text-white ring-4 ring-teal-50'
                                            : isCompleted
                                                ? 'bg-teal-100 text-teal-700'
                                                : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                                    </div>
                                    <span className={`text-xs font-medium ${isActive ? 'text-[#33C7BE]' : 'text-gray-500'}`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {currentStep === 'emergency' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-800 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>Esta información es vital en caso de que necesitemos contactar a alguien urgente durante una cita.</p>
                            </div>

                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del contacto</label>
                                    <input
                                        type="text"
                                        value={formData.emergency_contact_name}
                                        onChange={e => handleChange('emergency_contact_name', e.target.value)}
                                        placeholder="Ej. María Pérez"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={formData.emergency_contact_phone}
                                        onChange={e => handleChange('emergency_contact_phone', e.target.value)}
                                        placeholder="Ej. 55 1234 5678"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Mínimo 10 dígitos</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 'medical' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
                                <textarea
                                    value={formData.allergies}
                                    onChange={e => handleChange('allergies', e.target.value)}
                                    placeholder="Ej. Penicilina, Nueces, Latex..."
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all min-h-[80px]"
                                />
                                <p className="text-xs text-gray-500 mt-1">Separa con comas</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones Crónicas</label>
                                <textarea
                                    value={formData.chronic_conditions}
                                    onChange={e => handleChange('chronic_conditions', e.target.value)}
                                    placeholder="Ej. Diabetes Tipo 2, Hipertensión..."
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all min-h-[80px]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Medicamentos actuales</label>
                                <textarea
                                    value={formData.current_medications}
                                    onChange={e => handleChange('current_medications', e.target.value)}
                                    placeholder="Ej. Metformina 850mg c/12hrs..."
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all min-h-[80px]"
                                />
                            </div>
                        </div>
                    )}

                    {currentStep === 'metrics' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Altura (cm)</label>
                                    <input
                                        type="number"
                                        value={formData.height_cm}
                                        onChange={e => handleChange('height_cm', e.target.value)}
                                        placeholder="170"
                                        min="50"
                                        max="250"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                                    <input
                                        type="number"
                                        value={formData.weight_kg}
                                        onChange={e => handleChange('weight_kg', e.target.value)}
                                        placeholder="70"
                                        min="2"
                                        max="350"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Sangre</label>
                                <select
                                    value={formData.blood_type}
                                    onChange={e => handleChange('blood_type', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all bg-white"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Idioma preferido</label>
                                <select
                                    value={formData.preferred_language}
                                    onChange={e => handleChange('preferred_language', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all bg-white"
                                >
                                    <option value="Español">Español</option>
                                    <option value="Inglés">Inglés</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {currentStep === 'insurance' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Aseguradora</label>
                                <input
                                    type="text"
                                    value={formData.insurance_provider}
                                    onChange={e => handleChange('insurance_provider', e.target.value)}
                                    placeholder="Ej. GNP, AXA, MetLife..."
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Póliza</label>
                                <input
                                    type="text"
                                    value={formData.insurance_policy_number}
                                    onChange={e => handleChange('insurance_policy_number', e.target.value)}
                                    placeholder="XXX-XXX-XXX"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales para el doctor</label>
                                <textarea
                                    value={formData.notes_for_doctor}
                                    onChange={e => handleChange('notes_for_doctor', e.target.value)}
                                    placeholder="Algo más que quieras que sepan tus médicos..."
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-100 focus:border-[#33C7BE] outline-none transition-all min-h-[100px]"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 'emergency' || isSaving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${currentStep === 'emergency'
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#33C7BE] text-white rounded-lg font-semibold hover:bg-teal-600 transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <span>Guardando...</span>
                        ) : currentStep === 'insurance' ? (
                            <>
                                <Check className="w-4 h-4" />
                                Finalizar
                            </>
                        ) : (
                            <>
                                Siguiente
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PatientProfileWizard;
