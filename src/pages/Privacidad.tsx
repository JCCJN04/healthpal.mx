import LegalDocPage from '@/shared/components/marketing/LegalDocPage'

export default function Privacidad() {
  return (
    <LegalDocPage
      title="Aviso de Privacidad"
      subtitle="Consulta y descarga el aviso oficial de HealthPal con una vista integrada, clara y fácil de leer."
      docxPath="/privacidad.docx"
      downloadLabel="Descargar aviso"
      intro="Este espacio está pensado para mostrar el contenido completo del aviso con una lectura más cómoda, sin dejar el documento pegado sin contexto. Cuando el archivo esté disponible en public/, se renderiza aquí mismo como HTML."
      highlights={[
        {
          title: 'Datos personales y uso',
          description: 'Explicamos qué información se recolecta, para qué se usa y cómo se protege dentro de la plataforma.',
        },
        {
          title: 'Derechos del titular',
          description: 'Incluimos los mecanismos para acceder, rectificar, cancelar u oponerse al tratamiento de tus datos.',
        },
        {
          title: 'Contacto y actualizaciones',
          description: 'La página deja visibles las vías de contacto y la forma en la que se notifican cambios al aviso.',
        },
      ]}
    />
  )
}
