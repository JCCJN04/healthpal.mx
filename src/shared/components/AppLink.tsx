import React from 'react'
import { Link, LinkProps } from 'react-router-dom'
import { isLandingHost, getAppUrl } from '@/shared/lib/domain'

export function AppLink({ to, children, ...props }: LinkProps) {
  if (isLandingHost() && typeof to === 'string') {
    return (
      <a href={getAppUrl(to)} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} {...props}>
      {children}
    </Link>
  )
}

export default AppLink
