import { useState } from 'react'

export default function ShareBar({ url, title, caption, onPng }) {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const mail = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${caption}\n\n${url}`)}`

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
      else {
        const t = document.createElement('textarea')
        t.value = url
        t.setAttribute('readonly', '')
        t.style.position = 'fixed'
        t.style.left = '-9999px'
        document.body.appendChild(t)
        t.select()
        document.execCommand('copy')
        t.remove()
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  async function share() {
    try {
      await navigator.share({ title, text: caption, url })
    } catch (err) {
      if (err && err.name !== 'AbortError') copy()
    }
  }

  return (
    <div className="share-bar">
      <span className="share-lab">Share</span>
      <button type="button" className={copied ? 'copied' : undefined} onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
      {canShare ? (
        <button type="button" onClick={share}>
          Share
        </button>
      ) : null}
      <a href={mail}>Mail</a>
      <button type="button" onClick={onPng}>
        Download PNG
      </button>
    </div>
  )
}
