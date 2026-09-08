import { useEffect, useState } from 'react'

export function useTvBook() {
  const [book, setBook] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetch('/data/tv.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled) setBook(j)
      })
      .catch(() => {
        if (!cancelled) setBook(null)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return book
}
