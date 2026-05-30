import LegalDocPage from '@/shared/components/marketing/LegalDocPage'

export default function Privacidad() {
  return (
    <LegalDocPage
      title="Aviso de Privacidad"
      subtitle="Cómo Healthpal.mx recaba, usa y protege tus datos personales y datos sensibles de salud conforme a la legislación mexicana."
      intro="Healthpal.mx es operado por Daniel Vázquez y Juan Carlos Mendoza. Este aviso describe el tratamiento de datos personales conforme a la LFPDPPP. Última modificación: 27 de mayo de 2026."
      highlights={[
        {
          title: 'No vendemos tus datos',
          description: 'Healthpal.mx no vende datos personales ni datos sensibles de salud a terceros bajo ninguna circunstancia.',
        },
        {
          title: 'Datos sensibles de salud',
          description: 'Tratamos expedientes, recetas y estudios con cifrado AES-256 y acceso estrictamente controlado por rol.',
        },
        {
          title: 'Derechos ARCO',
          description: 'Puedes Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos enviando un correo a healthpalmx@gmail.com.',
        },
        {
          title: 'Fase beta limitada',
          description: 'Solo doctores, profesionales de la salud y usuarios expresamente autorizados tienen acceso a la plataforma.',
        },
      ]}
      sections={[
        {
          id: 'datos-recabados',
          title: '1. Datos personales que recabamos',
          paragraphs: [
            'Healthpal.mx podrá recabar las siguientes categorías de datos personales dependiendo del tipo de usuario y las funciones utilizadas.',
          ],
          bullets: [
            'Identificación y contacto: nombre completo, correo electrónico, número de teléfono, ciudad',
            'Profesionales de salud: especialidad, nombre del consultorio, cédula profesional, dirección profesional',
            'Cuenta y uso: historial de actividades, fecha/hora de acceso, documentos cargados, acciones realizadas',
            'Datos sensibles de salud: expedientes, recetas, laboratorios, estudios de imagen, diagnósticos, antecedentes',
            'Técnicos: dirección IP, tipo de navegador, sistema operativo, identificadores de sesión',
          ],
          note: 'Los datos relacionados con el estado de salud son datos personales sensibles conforme a la legislación mexicana y requieren consentimiento expreso para su tratamiento.',
        },
        {
          id: 'finalidades',
          title: '2. Finalidades del tratamiento',
          paragraphs: [
            'Healthpal.mx tratará los datos personales para las siguientes finalidades principales:',
          ],
          bullets: [
            'Crear, administrar y autenticar cuentas de usuarios autorizados',
            'Permitir el uso de la plataforma y almacenar documentos médicos digitales',
            'Facilitar la administración de expedientes, documentos e información médica',
            'Brindar soporte técnico y seguimiento a errores de la plataforma',
            'Mantener la seguridad de la plataforma y prevenir accesos no autorizados',
            'Cumplir obligaciones legales y regulatorias aplicables',
          ],
          note: 'Finalidades secundarias: encuestas de satisfacción, retroalimentación de beta, métricas internas de uso. Puedes oponerte enviando un correo a healthpalmx@gmail.com.',
        },
        {
          id: 'medicos-pacientes',
          title: '3. Datos de pacientes cargados por médicos',
          paragraphs: [
            'Cuando un médico, consultorio o profesional de la salud cargue información o documentos de pacientes, declara contar con las autorizaciones, consentimientos o facultades necesarias para tratar y cargar dicha información.',
            'El médico será responsable de asegurarse de que el tratamiento de los datos de sus pacientes cumpla con la legislación aplicable, así como con sus obligaciones profesionales, clínicas, éticas y de confidencialidad.',
            'Healthpal.mx tratará la información cargada únicamente para permitir el funcionamiento de la plataforma y las finalidades descritas en este Aviso.',
          ],
          note: 'Healthpal.mx no sustituye las obligaciones legales respecto al manejo, conservación e integración del expediente clínico conforme a la normativa aplicable.',
        },
        {
          id: 'consentimiento',
          title: '4. Consentimiento para datos sensibles',
          paragraphs: [
            'El tratamiento de datos personales sensibles requiere consentimiento expreso en los términos previstos por la legislación aplicable.',
            'Al utilizar Healthpal.mx y cargar documentos médicos, el usuario autorizado reconoce que Healthpal.mx podrá tratar datos personales sensibles conforme a este Aviso de Privacidad.',
            'Healthpal.mx podrá solicitar dicho consentimiento mediante casillas de aceptación, formularios electrónicos, firma electrónica u otros medios equivalentes permitidos por la legislación aplicable.',
          ],
        },
        {
          id: 'proveedores-transferencias',
          title: '5. Proveedores tecnológicos y transferencias',
          paragraphs: [
            'Para operar Healthpal.mx utilizamos proveedores tecnológicos como Supabase, Vercel y Twilio. Estos proveedores tratan datos personales únicamente en la medida necesaria para prestar sus servicios y conforme a las instrucciones de Healthpal.mx.',
            'Healthpal.mx no compartirá, venderá ni transferirá datos personales sensibles de salud a terceros para fines comerciales. Solo compartimos datos en los casos siguientes:',
          ],
          bullets: [
            'Con proveedores tecnológicos para operar, alojar y proteger la plataforma',
            'Con médicos o usuarios autorizados dentro de las funciones disponibles de la plataforma',
            'Con autoridades competentes ante obligación legal o requerimiento judicial',
            'En caso de cambio de estructura legal, informando previamente a los usuarios',
          ],
        },
        {
          id: 'seguridad',
          title: '6. Seguridad de la información',
          paragraphs: [
            'Healthpal.mx implementa medidas administrativas, técnicas y físicas razonables para proteger los datos personales, tomando en cuenta la sensibilidad de los datos médicos tratados.',
          ],
          bullets: [
            'Autenticación de usuarios y control de accesos por rol',
            'Registros de actividad y eventos de seguridad',
            'Medidas técnicas de protección en bases de datos e infraestructura',
            'Procedimientos internos para atención de incidentes de seguridad',
          ],
          note: 'En caso de detectar un acceso no autorizado, uso indebido de tu cuenta o vulneración de seguridad, notifícanos de inmediato a healthpalmx@gmail.com.',
        },
        {
          id: 'derechos-arco',
          title: '7. Derechos ARCO',
          paragraphs: [
            'Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales (derechos ARCO).',
            'Para ejercerlos, envía una solicitud a healthpalmx@gmail.com incluyendo: nombre completo, medio para recibir respuesta, documento que acredite tu identidad, descripción del derecho que deseas ejercer y datos personales relacionados.',
          ],
          note: 'También puedes revocar tu consentimiento en cualquier momento. La revocación puede implicar la desactivación de tu cuenta y eliminación o anonimización de tus datos conforme a la legislación aplicable.',
        },
        {
          id: 'conservacion',
          title: '8. Conservación de datos y menores de edad',
          paragraphs: [
            'Healthpal.mx conservará los datos personales durante el tiempo necesario para cumplir las finalidades descritas, operar la beta privada, brindar soporte, mantener seguridad y cumplir obligaciones legales.',
            'Cuando los datos dejen de ser necesarios, procuraremos eliminarlos, bloquearlos o anonimizarlos conforme a la legislación aplicable.',
            'Healthpal.mx no está dirigido directamente a menores de edad. En caso de que se carguen datos de menores como parte de información médica, el médico o consultorio será responsable de contar con las autorizaciones de los padres, tutores o representantes legales.',
          ],
        },
        {
          id: 'google-calendar',
          title: '9. Integración con Google Calendar',
          paragraphs: [
            'Healthpal.mx podrá ofrecer la opción de vincular Google Calendar para facilitar la administración de agenda y citas. La vinculación es opcional y requiere autorización expresa del usuario.',
            'Healthpal.mx no venderá información obtenida de Google Calendar ni la utilizará para fines publicitarios o distintos a los informados en este Aviso.',
            'El uso de información recibida de APIs de Google se realizará conforme a la Política de Datos de Usuario de los Servicios API de Google, incluyendo los requisitos de uso limitado aplicables.',
          ],
          note: 'Puedes revocar el acceso a Google Calendar desde la configuración de tu cuenta de Google, desde Healthpal.mx o solicitándolo a healthpalmx@gmail.com.',
        },
        {
          id: 'cambios-contacto',
          title: '10. Cambios al Aviso y contacto',
          paragraphs: [
            'Healthpal.mx podrá modificar este Aviso de Privacidad en cualquier momento para reflejar cambios legales, técnicos u operativos. Cualquier cambio será publicado en https://www.healthpal.mx/ y notificado por correo electrónico u otros medios de contacto.',
          ],
          note: 'Responsables: Daniel Vázquez y Juan Carlos Mendoza — healthpalmx@gmail.com — https://www.healthpal.mx/',
        },
      ]}
    />
  )
}
