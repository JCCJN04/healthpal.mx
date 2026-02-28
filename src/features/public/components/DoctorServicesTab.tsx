import { DollarSign, Clock, Shield, FileText } from 'lucide-react';
import type { PublicDoctorEnriched } from '@/shared/lib/queries/publicDoctors';

interface DoctorServicesTabProps {
  doctor: PublicDoctorEnriched;
}

export default function DoctorServicesTab({ doctor }: DoctorServicesTabProps) {
  return (
    <div className="space-y-8">
      {/* Services table */}
      <Section title="Servicios y tarifas" icon={<DollarSign className="w-4 h-4" />}>
        {doctor.services.length > 0 ? (
          <div className="overflow-hidden border border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Servicio
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-center">
                    Duración
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide text-right">
                    Precio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctor.services.map((svc, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{svc.name}</p>
                      {svc.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{svc.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {svc.duration ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {svc.duration} min
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {svc.price ? (
                        `$${svc.price.toLocaleString('es-MX')}`
                      ) : (
                        <span className="text-gray-300 font-normal text-xs">Consultar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="Este doctor aún no ha publicado sus servicios y tarifas." />
        )}
      </Section>

      {/* Accepted insurances */}
      <Section title="Seguros aceptados" icon={<Shield className="w-4 h-4" />}>
        {doctor.insurances.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {doctor.insurances.map((ins) => (
              <span
                key={ins}
                className="inline-flex items-center gap-1.5 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-medium"
              >
                <Shield className="w-3.5 h-3.5" />
                {ins}
              </span>
            ))}
          </div>
        ) : (
          <EmptyState text="No se han registrado seguros médicos aceptados." />
        )}
      </Section>

      {/* General consultation price note */}
      {doctor.consultation_price && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Consulta general</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Precio de referencia:{' '}
              <span className="font-bold text-primary">
                ${doctor.consultation_price.toLocaleString('es-MX')} MXN
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-3">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-6 text-sm text-gray-400 italic bg-gray-50 rounded-xl">
      {text}
    </div>
  );
}
