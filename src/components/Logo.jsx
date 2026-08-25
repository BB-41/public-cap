import { useState } from 'react'

export default function Logo({ school, size = 28, className = '' }) {
  const [failed, setFailed] = useState(false)
  const src = school.logo
  const showImg = src && !failed
  const style = {
    width: size,
    height: size,
    background: school.color || '#5a5144',
    fontSize: Math.max(8, Math.round(size * 0.28)),
  }
  return (
    <span className={`logo-wrap ${className}`} style={style} title={school.name}>
      {showImg ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="logo-fb">{school.abbr || school.shortName?.slice(0, 3)}</span>
      )}
    </span>
  )
}
