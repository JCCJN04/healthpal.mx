import { useState } from 'react';
import { CalendarDays, Video, MapPin, Clock, ChevronRight } from 'lucide-react';
import AvailabilityCarousel from './AvailabilityCarousel';
import type { AvailabilitySlot } from '@/shared/lib/queries/publicDoctors';

// ─── Props ─────────────────────────────────────────────────────────────────

interface StickyBookingWidgetProps {
  doctorSlug: string;
  displayName: string;
  consultationPrice: number | null;
  acceptsVideo: boolean;
  address: string | null;
}

type Modality = 'presencial' | 'videoconsulta';

// ─── Component ─────────────────────────────────────────────────────────────

export default function StickyBookingWidget({
  doctorSlug,
  displayName,
  consultationPrice,
  acceptsVideo,
  address,
}: StickyBookingWidgetProps) {
  const [modality, setModality] = useState<Modality>('presencial');
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  const handleSlotClick = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
  };

  const handleBook = () => {
    // In production: navigate to booking flow or open modal
    // For now, redirect to register with context
    const params = new URLSearchParams({
      modality,
      ...(selectedSlot ? { date: selectedSlot.slot_date, time: selectedSlot.slot_time } : {}),
    });
    window.location.href = `/agendar/${doctorSlug}?${params.toString()}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-teal-500 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs font-medium">Agendar cita con</p>
            <p className="text-white font-bold text-sm truncate max-w-[180px]">
              {displayName}
            </p>
          </div>
          {consultationPrice && (
            <div className="text-right">
              <p className="text-white/80 text-[10px]">Desde</p>
              <p className="text-white font-bold text-lg">
                ${consultationPrice.toLocaleString('es-MX')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Modality selector */}
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Tipo de consulta
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setModality('presencial')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                modality === 'presencial'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Presencial
            </button>
            <button
              type="button"
              onClick={() => setModality('videoconsulta')}
              disabled={!acceptsVideo}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                modality === 'videoconsulta'
                  ? 'border-primary bg-primary/5 text-primary'
                  : !acceptsVideo
                  ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Video className="w-4 h-4" />
              Video
            </button>
          </div>
          {modality === 'presencial' && address && (
            <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              {address}
            </p>
          )}
        </div>

        {/* Availability calendar */}
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            Horarios disponibles
          </p>
          <AvailabilityCarousel
            doctorSlug={doctorSlug}
            columns={3}
            maxSlotsPerDay={4}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* Selected slot confirmation */}
        {selectedSlot && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">
                {new Date(selectedSlot.slot_date + 'T00:00:00').toLocaleDateString('es-MX', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
              <p className="text-xs text-gray-500">
                {selectedSlot.slot_time.slice(0, 5)} hrs · {modality}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              className="text-xs text-primary hover:underline"
            >
              Cambiar
            </button>
          </div>
        )}

        {/* Book CTA */}
        <button
          type="button"
          onClick={handleBook}
          disabled={!selectedSlot}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            selectedSlot
              ? 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98] shadow-md shadow-primary/25'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {selectedSlot ? (
            <>
              Agendar cita
              <ChevronRight className="w-4 h-4" />
            </>
          ) : (
            'Selecciona un horario'
          )}
        </button>

        {/* Trust signals */}
        <div className="pt-3 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400 justify-center">
          <span>✓ Confirmación inmediata</span>
          <span>·</span>
          <span>✓ Cancelación gratuita 24h</span>
        </div>
      </div>
    </div>
  );
}
