import { Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from '@/features/shared/pages/Dashboard'
import Documentos from '@/features/shared/pages/Documentos'
import DocumentDetail from '@/features/shared/pages/DocumentDetail'
import Consultas from '@/features/shared/pages/Consultas'
import ConsultaDetail from '@/features/shared/pages/ConsultaDetail'
import NuevaConsulta from '@/features/shared/pages/NuevaConsulta'
import ConsultasHistorial from '@/features/shared/pages/ConsultasHistorial'
import Mensajes from '@/features/shared/pages/Mensajes'
import Calendario from '@/features/shared/pages/Calendario'
import Configuracion from '@/features/shared/pages/Configuracion'
import Pacientes from '@/features/doctor/pages/Pacientes'
import PatientDetail from '@/features/doctor/pages/PatientDetail'
import DoctorServicesManager from '@/features/doctor/pages/DoctorServicesManager'
import AvailabilityCalendarManager from '@/features/doctor/pages/AvailabilityCalendarManager'
import MisResenasDoctorPage from '@/features/doctor/pages/MisResenasDoctorPage'
import Busqueda from '@/features/shared/pages/Busqueda'
import { DemoModeProvider } from '@/context/DemoContext'

function DemoBanner() {
  return (
    <div className="bg-[#33C7BE] text-white text-center text-sm py-1 font-medium fixed top-0 w-full z-50">
      {'DEMO'}
    </div>
  )
}

export default function DemoDoctor() {
  return (
    <DemoModeProvider>
      <DemoBanner />
      <div className="pt-7">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="documentos" element={<Documentos />} />
          <Route path="documentos/:id" element={<DocumentDetail />} />
          <Route path="consultas" element={<Consultas />} />
          <Route path="consultas/historial" element={<ConsultasHistorial />} />
          <Route path="consultas/:id" element={<ConsultaDetail />} />
          <Route path="consultas/nueva" element={<NuevaConsulta />} />
          <Route path="mensajes" element={<Mensajes />} />
          <Route path="pacientes" element={<Pacientes />} />
          <Route path="pacientes/:id" element={<PatientDetail />} />
          <Route path="servicios" element={<DoctorServicesManager />} />
          <Route path="disponibilidad" element={<AvailabilityCalendarManager />} />
          <Route path="resenas-doctor" element={<MisResenasDoctorPage />} />
          <Route path="calendario" element={<Calendario />} />
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="buscar" element={<Busqueda />} />
          <Route path="*" element={<Navigate to="/demo/doctor" replace />} />
        </Routes>
      </div>
    </DemoModeProvider>
  )
}
