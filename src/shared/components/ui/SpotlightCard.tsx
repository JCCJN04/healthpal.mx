import React, { useRef, useState, type MouseEvent } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

interface SpotlightCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  className?: string
  spotlightColor?: string
  enableHoverLift?: boolean
}

/**
 * Interactive card component inspired by React Bits (https://reactbits.dev).
 * Features a smooth cursor-tracking radial spotlight glow, subtle hover lift,
 * and seamless Framer Motion animation support.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'rgba(51, 199, 190, 0.15)',
  enableHoverLift = true,
  ...props
}) => {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleMouseEnter = () => {
    setOpacity(1)
  }

  const handleMouseLeave = () => {
    setOpacity(0)
  }

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={
        enableHoverLift
          ? {
              y: -3,
              transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
            }
          : undefined
      }
      className={`relative overflow-hidden rounded-2xl border border-gray-100/90 bg-white transition-all duration-300 hover:shadow-lg hover:shadow-teal-900/5 hover:border-teal-200/80 ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Layer */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(350px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />
      <div className="relative z-10 w-full h-full">{children}</div>
    </motion.div>
  )
}
