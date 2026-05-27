import LegalDocPage from '@/shared/components/marketing/LegalDocPage'

export default function Legal() {
  return (
    <LegalDocPage
      title="Términos y Condiciones"
      subtitle="Revisa las reglas de uso de HealthPal en una página más clara, ordenada y coherente con la landing."
      docxPath="/terminos.docx"
      downloadLabel="Descargar términos"
      intro="Aquí se agrupan las condiciones de uso, responsabilidades, limitaciones del servicio y reglas generales de la plataforma en un formato más legible."
      highlights={[
        {
          title: 'Uso de la plataforma',
          description: 'Resumen del acceso, aceptación de condiciones y uso adecuado del servicio por parte de pacientes y médicos.',
        },
        {
          title: 'Responsabilidades',
          description: 'Se explican las obligaciones del usuario, el alcance del servicio y las limitaciones operativas de HealthPal.',
        },
        {
          title: 'Cambios al documento',
          description: 'La página deja visible cuándo pueden actualizarse las condiciones y cómo se comunica ese cambio.',
        },
      ]}
    />
  )
}
