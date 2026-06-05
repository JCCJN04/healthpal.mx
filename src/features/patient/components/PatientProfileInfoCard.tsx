import { Edit2, Plus, FileText, MapPin } from 'lucide-react';
import { PatientProfile } from '@/shared/types/database';

interface PatientProfileInfoCardProps {
    data: PatientProfile | null;
    onEdit: () => void;
    isLoading?: boolean;
}

const PatientProfileInfoCard = ({ data, onEdit, isLoading = false }: PatientProfileInfoCardProps) => {
    // Check if profile is complete (basic check)
    const isComplete = data && !!data.address_text;

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">Datos del perfil</h3>
                    {data && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isComplete
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                            }`}>
                            {isComplete ? 'Completo' : 'Incompleto'}
                        </span>
                    )}
                </div>

                <button
                    onClick={onEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#33C7BE] hover:bg-teal-50 rounded-lg transition-colors flex items-center gap-2"
                >
                    {data ? (
                        <>
                            <Edit2 className="w-4 h-4" />
                            <span>Editar</span>
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" />
                            <span>Completar perfil</span>
                        </>
                    )}
                </button>
            </div>

            <div className="p-6">
                {!data ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FileText className="w-6 h-6 text-[#33C7BE]" />
                        </div>
                        <h4 className="text-base font-semibold text-gray-900 mb-1">Tu perfil médico está vacío</h4>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
                            Completa tu información médica básica para que tus doctores tengan un mejor contexto de tu salud.
                        </p>
                        <button
                            onClick={onEdit}
                            className="px-5 py-2.5 bg-[#33C7BE] text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
                        >
                            Completar ahora
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Address */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <h4 className="text-sm font-semibold text-gray-900">Dirección</h4>
                            </div>
                            {data.address_text ? (
                                <p className="text-sm font-medium text-gray-900">{data.address_text}</p>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No especificado</p>
                            )}
                        </div>

                        {/* Insurance */}
                        {data.insurance_provider && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-gray-500" />
                                    <h4 className="text-sm font-semibold text-gray-900">Seguro médico</h4>
                                </div>
                                <p className="text-sm font-medium text-gray-900">{data.insurance_provider}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientProfileInfoCard;
