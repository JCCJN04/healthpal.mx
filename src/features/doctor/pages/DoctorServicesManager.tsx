import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  DollarSign,
  Clock,
  GripVertical,
  Package,
  AlertCircle,
} from 'lucide-react';
import DashboardLayout from '@/app/layout/DashboardLayout';
import { useAuth } from '@/app/providers/AuthContext';
import {
  getDoctorServices,
  createDoctorService,
  updateDoctorService,
  deleteDoctorService,
  type DoctorServiceRow,
  type DoctorServiceInput,
} from '@/shared/lib/queries/doctorManagement';
import { showToast } from '@/shared/components/ui/Toast';

// ─── Helpers ───────────────────────────────────────────────────────────────

const EMPTY_FORM: DoctorServiceInput = {
  name: '',
  description: '',
  price: undefined,
  duration: 30,
  is_active: true,
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function DoctorServicesManager() {
  const { user } = useAuth();

  const [services, setServices] = useState<DoctorServiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DoctorServiceInput>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const doctorId = user?.id;

  const load = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    const data = await getDoctorServices(doctorId);
    setServices(data);
    setLoading(false);
  }, [doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  // Open form for new service
  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  // Open form for editing
  const handleEdit = (service: DoctorServiceRow) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description ?? '',
      price: service.price ?? undefined,
      duration: service.duration ?? 30,
      is_active: service.is_active,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!doctorId || !form.name.trim()) return;
    setSaving(true);

    if (editingId) {
      const updated = await updateDoctorService(editingId, form);
      if (updated) {
        showToast('Servicio actualizado', 'success');
      } else {
        showToast('Error al actualizar', 'error');
      }
    } else {
      const created = await createDoctorService(doctorId, form);
      if (created) {
        showToast('Servicio creado', 'success');
      } else {
        showToast('Error al crear servicio', 'error');
      }
    }

    setSaving(false);
    handleCancel();
    load();
  };

  // Delete
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const ok = await deleteDoctorService(id);
    if (ok) {
      showToast('Servicio eliminado', 'success');
      load();
    } else {
      showToast('Error al eliminar', 'error');
    }
    setDeletingId(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Servicios</h1>
            <p className="text-sm text-gray-500 mt-1">
              Administra los servicios y precios que ofreces a tus pacientes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo servicio
          </button>
        </div>

        {/* ─── Form (inline card) ─── */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-5 mb-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">
                {editingId ? 'Editar servicio' : 'Nuevo servicio'}
              </h3>
              <button type="button" onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nombre del servicio *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Electrocardiograma, Consulta de seguimiento…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Breve descripción del servicio…"
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              {/* Price + Duration row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Precio (MXN)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min={0}
                      value={form.price ?? ''}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value ? Number(e.target.value) : undefined })
                      }
                      placeholder="500"
                      className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Duración (min)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={form.duration ?? 30}
                      onChange={(e) =>
                        setForm({ ...form, duration: e.target.value ? Number(e.target.value) : 30 })
                      }
                      placeholder="30"
                      className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                    form.is_active ? 'bg-primary justify-end' : 'bg-gray-200 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </div>
                <span className="text-sm text-gray-700">
                  {form.is_active ? 'Activo (visible para pacientes)' : 'Inactivo (oculto)'}
                </span>
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-40"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Services list ─── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : services.length === 0 && !showForm ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Sin servicios registrados
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Agrega tus servicios para que los pacientes conozcan lo que ofreces y sus precios.
            </p>
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:underline"
            >
              <Plus className="w-4 h-4" />
              Agregar primer servicio
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((svc) => (
              <div
                key={svc.id}
                className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors ${
                  svc.is_active ? 'border-gray-100' : 'border-gray-100 opacity-50'
                }`}
              >
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0 hidden sm:block" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {svc.name}
                    </p>
                    {!svc.is_active && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        Inactivo
                      </span>
                    )}
                  </div>
                  {svc.description && (
                    <p className="text-xs text-gray-500 truncate">{svc.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                    {svc.price != null && (
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${svc.price.toLocaleString('es-MX')} MXN
                      </span>
                    )}
                    {svc.duration != null && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {svc.duration} min
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(svc)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(svc.id)}
                    disabled={deletingId === svc.id}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    {deletingId === svc.id ? (
                      <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
