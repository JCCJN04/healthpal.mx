import { GraduationCap, Award, Stethoscope, Tag } from 'lucide-react';
import type { PublicDoctorEnriched } from '@/shared/lib/queries/publicDoctors';
import { formatSpecialty } from '@/shared/lib/specialties';

interface DoctorExperienceTabProps {
  doctor: PublicDoctorEnriched;
}

export default function DoctorExperienceTab({ doctor }: DoctorExperienceTabProps) {
  return (
    <div className="space-y-8">
      {/* About / Bio */}
      <Section title="Acerca del doctor" icon={<Stethoscope className="w-4 h-4" />}>
        {doctor.bio ? (
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{doctor.bio}</p>
        ) : (
          <p className="text-gray-400 italic text-sm">Sin descripción disponible.</p>
        )}
      </Section>

      {/* Specialty */}
      {doctor.specialty && (
        <Section title="Especialidad" icon={<Award className="w-4 h-4" />}>
          <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full">
            <Stethoscope className="w-3.5 h-3.5" />
            {formatSpecialty(doctor.specialty)}
          </span>
          {doctor.is_verified && (
            <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Cédula verificada ante la SEP
            </p>
          )}
        </Section>
      )}

      {/* Education */}
      {doctor.education.length > 0 && (
        <Section title="Formación académica" icon={<GraduationCap className="w-4 h-4" />}>
          <div className="space-y-4">
            {doctor.education.map((edu, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{edu.degree}</p>
                  <p className="text-xs text-gray-600">{edu.institution}</p>
                  {edu.year && <p className="text-xs text-gray-400">{edu.year}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Illnesses treated */}
      {doctor.illnesses_treated.length > 0 && (
        <Section title="Enfermedades que trata" icon={<Tag className="w-4 h-4" />}>
          <div className="flex flex-wrap gap-2">
            {doctor.illnesses_treated.map((illness) => (
              <span
                key={illness}
                className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
              >
                {illness}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────

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
