import { ReactNode } from 'react'

interface InfoBannerProps {
  icon?: ReactNode
  message: string
  onRevisar?: () => void
  onDescartar?: () => void
}

export default function InfoBanner({ icon, message, onRevisar, onDescartar }: InfoBannerProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex items-start gap-4">
      {icon && (
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            {icon}
          </div>
        </div>
      )}
      <div className="flex-1">
        <p className="text-gray-700">{message}</p>
      </div>
      {(onRevisar || onDescartar) && (
        <div className="flex gap-4">
          {onRevisar && (
            <button 
              onClick={onRevisar}
              className="text-primary font-medium text-sm hover:underline"
            >
              REVISAR
            </button>
          )}
          {onDescartar && (
            <button 
              onClick={onDescartar}
              className="text-gray-500 font-medium text-sm hover:underline"
            >
              DESCARTAR
            </button>
          )}
        </div>
      )}
    </div>
  )
}
