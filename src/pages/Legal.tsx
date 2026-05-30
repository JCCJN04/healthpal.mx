import LegalDocPage from '@/shared/components/marketing/LegalDocPage'

export default function Legal() {
  return (
    <LegalDocPage
      title="Términos y Condiciones"
      subtitle="Reglas de uso de Healthpal.mx para médicos, profesionales de la salud y usuarios autorizados durante la fase beta privada."
      intro="Healthpal.mx es operado por Daniel Vázquez y Juan Carlos Mendoza. Al usar la plataforma aceptas estos términos. Última modificación: 27 de mayo de 2026."
      highlights={[
        {
          title: 'Beta privada y gratuita',
          description: 'El acceso actual es gratuito e ilimitado en tiempo. Si lanzamos planes de pago, te avisaremos con anticipación.',
        },
        {
          title: 'No somos servicio médico',
          description: 'Healthpal.mx es una herramienta de organización. No emite diagnósticos ni sustituye la atención profesional.',
        },
        {
          title: 'Tus documentos son tuyos',
          description: 'No reclamamos propiedad sobre los expedientes o archivos que cargues. Solo los usamos para operar la plataforma.',
        },
        {
          title: 'Seguridad razonable',
          description: 'Implementamos medidas técnicas para proteger tu información, pero ningún sistema es 100% infalible.',
        },
      ]}
      sections={[
        {
          id: 'naturaleza',
          title: '1. Naturaleza de Healthpal.mx',
          paragraphs: [
            'Healthpal.mx es una plataforma tecnológica en fase beta privada, diseñada para apoyar a doctores, profesionales de la salud y consultorios autorizados en la organización, administración y consulta de documentos médicos digitales.',
            'Healthpal.mx no presta servicios médicos, no emite diagnósticos, no prescribe tratamientos, no sustituye la atención médica profesional y no debe utilizarse como servicio de emergencia.',
          ],
          bullets: [
            'Administración de pacientes',
            'Organización de documentos médicos',
            'Carga, consulta y almacenamiento de documentos clínicos',
            'Apoyo en la comunicación y transferencia de información médica',
            'Pruebas de funcionalidades durante la etapa beta',
          ],
        },
        {
          id: 'beta',
          title: '2. Fase beta privada, gratuita e indefinida',
          paragraphs: [
            'Healthpal.mx se encuentra en una fase beta privada, gratuita y de duración indefinida, limitada a doctores, profesionales de la salud, consultorios o usuarios autorizados directamente por Healthpal.mx.',
            'La fase beta permanecerá vigente hasta que Healthpal.mx determine, a su entera discreción, que la plataforma está lista para finalizar dicha etapa. En caso de que se lancen planes de pago, los usuarios serán informados previamente.',
          ],
          bullets: [
            'La plataforma puede presentar errores, fallas, interrupciones o cambios',
            'Algunas funciones pueden ser modificadas, agregadas, limitadas o eliminadas',
            'El acceso puede ser suspendido, restringido o terminado',
            'No existe obligación de pago por participar en la beta',
            'La participación en la beta no garantiza acceso gratuito permanente en versiones futuras',
          ],
        },
        {
          id: 'usuarios',
          title: '3. Usuarios autorizados y registro',
          paragraphs: [
            'El acceso a Healthpal.mx está limitado a usuarios autorizados directamente por nosotros: doctores, profesionales de la salud, consultorios y personal administrativo autorizado.',
            'Para utilizar determinadas funciones deberás crear una cuenta. Te obligas a proporcionar información veraz, actualizada y completa. Eres responsable de mantener la confidencialidad de tus credenciales.',
          ],
          bullets: [
            'Mantener actualizada tu información',
            'No crear cuentas falsas ni hacerse pasar por otra persona',
            'No permitir el uso de tu cuenta a terceros no autorizados',
            'Notificar a Healthpal.mx cualquier acceso no autorizado a healthpalmx@gmail.com',
          ],
          note: 'Healthpal.mx podrá suspender o cancelar cuentas cuando exista riesgo de seguridad, incumplimiento de estos términos o uso contrario a la finalidad de la plataforma.',
        },
        {
          id: 'uso-permitido',
          title: '4. Uso permitido de la plataforma',
          paragraphs: [
            'El usuario se obliga a utilizar Healthpal.mx únicamente para fines lícitos, profesionales y relacionados con la administración, organización o consulta de documentos médicos digitales dentro del alcance permitido por la plataforma.',
          ],
          bullets: [
            'No realizar actividades ilegales',
            'No subir información falsa, fraudulenta o engañosa',
            'No acceder a información de pacientes sin autorización',
            'No intentar acceder a sistemas, bases de datos o áreas restringidas',
            'No realizar ingeniería inversa ni pruebas de penetración no autorizadas',
            'No cargar malware, virus, scripts dañinos o archivos maliciosos',
            'No usar la plataforma como único medio para atender emergencias médicas',
          ],
        },
        {
          id: 'documentos',
          title: '5. Documentos médicos y datos de salud',
          paragraphs: [
            'Cuando un médico o consultorio cargue información de pacientes, declara que cuenta con las autorizaciones y consentimientos necesarios para tratar dicha información y cargarla en la plataforma.',
            'El médico será responsable de asegurarse de que el tratamiento de los datos de sus pacientes cumpla con la legislación aplicable, así como con sus obligaciones profesionales, clínicas, éticas y de confidencialidad.',
            'Healthpal.mx no sustituye las obligaciones legales respecto a la integración, conservación, manejo o resguardo del expediente clínico conforme a la normativa aplicable.',
          ],
          note: 'Healthpal.mx no vende datos personales ni datos personales sensibles de salud.',
        },
        {
          id: 'proveedores-seguridad',
          title: '6. Proveedores tecnológicos y seguridad',
          paragraphs: [
            'Para operar Healthpal.mx utilizamos proveedores como Supabase y Vercel, quienes tratan información únicamente en la medida necesaria para prestar sus servicios.',
            'Implementamos medidas administrativas, técnicas y físicas razonables para proteger la información, incluyendo autenticación, control de accesos, administración de permisos y registros de actividad.',
          ],
          bullets: [
            'Autenticación de usuarios y control de accesos',
            'Administración de permisos por rol',
            'Registros de actividad y eventos de seguridad',
            'Medidas técnicas de protección en bases de datos e infraestructura',
          ],
          note: 'Ningún sistema tecnológico es completamente infalible. En caso de detectar un incidente de seguridad, notifícanos de inmediato a healthpalmx@gmail.com.',
        },
        {
          id: 'gestion-cuentas',
          title: '7. Gestión de cuentas y comunicaciones',
          paragraphs: [
            'Healthpal.mx podrá suspender o cancelar el acceso cuando el usuario incumpla estos Términos, use la plataforma de forma indebida o comprometa la seguridad de la plataforma.',
            'El usuario podrá solicitar la baja de su cuenta enviando una solicitud a healthpalmx@gmail.com. La baja puede implicar la eliminación, bloqueo o anonimización de datos personales conforme al Aviso de Privacidad.',
            'Healthpal.mx se comunicará con los usuarios mediante correo electrónico, mensajes dentro de la plataforma u otros medios proporcionados por el usuario para avisos legales, actualizaciones de términos y soporte.',
          ],
        },
        {
          id: 'responsabilidad',
          title: '8. Limitación de responsabilidad e indemnización',
          paragraphs: [
            'En la máxima medida permitida por la legislación aplicable, Healthpal.mx no será responsable por decisiones médicas tomadas por doctores, información incorrecta cargada por usuarios, fallas propias de una fase beta, ni problemas derivados de proveedores externos.',
            'El usuario acepta sacar en paz y a salvo a Healthpal.mx frente a reclamaciones derivadas de: uso indebido de la plataforma, carga de información sin autorización, tratamiento indebido de datos de pacientes o violación de derechos de terceros.',
          ],
          note: 'Nada en estos términos limitará derechos que no puedan ser restringidos conforme a la legislación aplicable.',
        },
        {
          id: 'google-calendar',
          title: '9. Integración con Google Calendar',
          paragraphs: [
            'Healthpal.mx podrá permitir que usuarios vinculen su cuenta de Google Calendar para facilitar la administración de agenda, disponibilidad, citas, eventos o recordatorios. Esta integración es opcional.',
            'Al vincular su cuenta, el usuario autoriza a Healthpal.mx a acceder a la información de calendario estrictamente necesaria para operar dicha funcionalidad. El usuario puede desvincular Google Calendar en cualquier momento.',
          ],
          note: 'Healthpal.mx no será responsable por errores o fallas de sincronización derivados de configuraciones incorrectas del usuario, permisos revocados o cambios en Google Calendar.',
        },
        {
          id: 'contacto',
          title: '10. Modificaciones y contacto',
          paragraphs: [
            'Healthpal.mx podrá modificar estos Términos y Condiciones en cualquier momento. Cualquier cambio será publicado en https://www.healthpal.mx/ y notificado a los usuarios por correo electrónico u otros medios de contacto.',
            'El uso continuo de Healthpal.mx después de la publicación de cambios implica la aceptación de los nuevos Términos y Condiciones.',
            'Estos Términos se rigen conforme a las leyes aplicables de los Estados Unidos Mexicanos.',
          ],
          note: 'Dudas o aclaraciones: Responsables: Daniel Vázquez y Juan Carlos Mendoza — healthpalmx@gmail.com — https://www.healthpal.mx/',
        },
      ]}
    />
  )
}
