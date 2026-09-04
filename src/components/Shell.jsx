import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function syncRouteFlag(pathname) {
  if (pathname === '/') delete document.documentElement.dataset.route
  else document.documentElement.dataset.route = 'inner'
}

function syncNav(pathname) {
  document.querySelectorAll('.nav a').forEach((a) => {
    const href = a.getAttribute('href')
    const on = href === '/' ? pathname === '/' : pathname === href
    a.classList.toggle('active', on)
    if (on) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  })
}

export default function Shell({ params, children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const search = params?.toString() ? `?${params}` : ''

  useEffect(() => {
    syncRouteFlag(location.pathname)
    syncNav(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    const mast = document.querySelector('.mast')
    if (!mast) return undefined
    function onClick(e) {
      const a = e.target.closest('a')
      if (!a || !mast.contains(a)) return
      const href = a.getAttribute('href')
      if (!href || !href.startsWith('/') || href.startsWith('//')) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      e.preventDefault()
      navigate({ pathname: href, search })
    }
    mast.addEventListener('click', onClick)
    return () => mast.removeEventListener('click', onClick)
  }, [navigate, search])

  return children
}

export function SettingType() {
  return (
    <div className="page-wrap">
      <div className="board-pending-dek">
        <p className="lede">Setting type…</p>
      </div>
      <div className="table-scroll table-pending" aria-busy="true" />
      <p className="fine board-pending-fine" aria-hidden="true" />
    </div>
  )
}
