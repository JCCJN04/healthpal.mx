import { useState, useEffect } from 'react'
import { Calendar, CheckCircle, AlertCircle, Loader2, ExternalLink, Unlink } from 'lucide-react'
import {
  getGoogleCalendarTokens,
  initiateGoogleOAuth,
  disconnectGoogleCalendar,
  isTokenValid,
  type GoogleCalendarTokens,
} from '@/shared/lib/googleCalendar'
import { logger } from '@/shared/lib/logger'

interface GoogleCalendarCardProps {
  onToast?: (msg: string, type: 'success' | 'error') => void
}

export default function GoogleCalendarCard({ onToast }: GoogleCalendarCardProps) {
  const [tokens, setTokens] = useState<GoogleCalendarTokens | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    loadTokens()
  }, [])

  async function loadTokens() {
    try {
      setLoading(true)
      const t = await getGoogleCalendarTokens()
      setTokens(t)
    } catch (err) {
      logger.error('GoogleCalendarCard:loadTokens', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    try {
      setConnecting(true)
      await initiateGoogleOAuth()
      // Page will redirect — no need to setConnecting(false)
    } catch (err: unknown) {
      logger.error('GoogleCalendarCard:connect', err)
      const msg = err instanceof Error ? err.message : 'Error al conectar Google Calendar'
      onToast?.(msg, 'error')
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    try {
      setDisconnecting(true)
      await disconnectGoogleCalendar()
      setTokens(null)
      onToast?.('Google Calendar desconectado', 'success')
    } catch (err) {
      logger.error('GoogleCalendarCard:disconnect', err)
      onToast?.('Error al desconectar Google Calendar', 'error')
    } finally {
      setDisconnecting(false)
    }
  }

  const isConnected = !!tokens && isTokenValid(tokens)
  const isExpired = !!tokens && !isTokenValid(tokens)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Google Calendar</h3>
            <p className="text-sm text-gray-500">
              Sincroniza tus citas automáticamente con tu calendario de Google
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {loading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Verificando conexión...</span>
          </div>
        ) : isConnected ? (
          <ConnectedState onDisconnect={handleDisconnect} disconnecting={disconnecting} />
        ) : isExpired ? (
          <ExpiredState onReconnect={handleConnect} connecting={connecting} />
        ) : (
          <DisconnectedState onConnect={handleConnect} connecting={connecting} />
        )}
      </div>
    </div>
  )
}

// ─── Sub-states ───────────────────────────────────────────────────────────────

function ConnectedState({
  onDisconnect,
  disconnecting,
}: {
  onDisconnect: () => void
  disconnecting: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Conectado</p>
          <p className="text-xs text-green-700 mt-0.5">
            Las nuevas citas se agregarán automáticamente a tu Google Calendar
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir Google Calendar
        </a>

        <button
          onClick={onDisconnect}
          disabled={disconnecting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disconnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Unlink className="w-4 h-4" />
          )}
          Desconectar
        </button>
      </div>
    </div>
  )
}

function ExpiredState({
  onReconnect,
  connecting,
}: {
  onReconnect: () => void
  connecting: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-yellow-800">Sesión expirada</p>
          <p className="text-xs text-yellow-700 mt-0.5">
            Reconecta tu cuenta de Google para continuar sincronizando citas
          </p>
        </div>
      </div>

      <ConnectButton onClick={onReconnect} loading={connecting} label="Reconectar Google Calendar" />
    </div>
  )
}

function DisconnectedState({
  onConnect,
  connecting,
}: {
  onConnect: () => void
  connecting: boolean
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Conecta tu cuenta de Google para que las citas confirmadas se agreguen
        automáticamente a tu calendario.
      </p>

      <ul className="space-y-2">
        {[
          'Citas nuevas aparecen en tu calendario al instante',
          'Recordatorios automáticos de Google Calendar',
          'Funciona para pacientes y doctores',
        ].map((feat) => (
          <li key={feat} className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-[#33C7BE] flex-shrink-0" />
            {feat}
          </li>
        ))}
      </ul>

      <ConnectButton onClick={onConnect} loading={connecting} label="Conectar Google Calendar" />
    </div>
  )
}

function ConnectButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void
  loading: boolean
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold text-sm rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      {label}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
