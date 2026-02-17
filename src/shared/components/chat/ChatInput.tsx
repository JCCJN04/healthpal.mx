import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip } from 'lucide-react'

interface ChatInputProps {
    onSend: (body: string) => void
    disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [message, setMessage] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (message.trim() && !disabled) {
            onSend(message.trim())
            setMessage('')
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [message])

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-end gap-3 max-w-6xl mx-auto">
                <button
                    type="button"
                    disabled
                    title="Próximamente"
                    className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-colors flex-shrink-0 cursor-not-allowed"
                >
                    <Paperclip className="w-5 h-5" />
                </button>

                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        disabled={disabled}
                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#33C7BE]/20 transition-all font-medium text-gray-700 resize-none max-h-32 custom-scrollbar"
                    />
                </div>

                <button
                    type="submit"
                    disabled={!message.trim() || disabled}
                    className="p-3.5 bg-[#33C7BE] text-white rounded-2xl hover:bg-[#2bb5ad] disabled:opacity-50 disabled:bg-gray-300 transition-all shadow-lg shadow-teal-100 flex-shrink-0"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </form>
    )
}
