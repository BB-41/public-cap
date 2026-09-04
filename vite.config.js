import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { splitDeskPayload } from './scripts/split-desk-payload.mjs'
import { writeSitemap } from './scripts/write-sitemap.mjs'

function lcpHtmlPlugin() {
  return {
    name: 'lcp-html',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html
          .replace(
            /<link rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*)>/g,
            (_m, _pre, href) =>
              `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all';this.onload=null"><noscript><link rel="stylesheet" href="${href}"></noscript>`,
          )
          .replace(
            /<script type="module"([^>]*) src="([^"]+)"([^>]*)><\/script>/g,
            '<script type="module" src="$2" fetchpriority="low"></script>',
          )
          .replace(
            /<link rel="modulepreload"([^>]*?)href="([^"]+)"([^>]*)>/g,
            '<link rel="modulepreload" href="$2" fetchpriority="low">',
          )
      },
    },
  }
}

function deskSplitPlugin() {
  return {
    name: 'desk-split',
    buildStart() {
      const info = splitDeskPayload()
      this.info(
        `desk split: ${info.schoolCount} schools · ${(info.fullBytes / 1024).toFixed(0)} KB → ${(info.deskBytes / 1024).toFixed(0)} KB`,
      )
      const sitemap = writeSitemap()
      this.info(
        `sitemap: ${sitemap.urlCount} URLs · ${sitemap.schoolCount} schools${sitemap.lastmod ? ` · lastmod ${sitemap.lastmod}` : ''}`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), deskSplitPlugin(), lcpHtmlPlugin()],
  server: { host: true, port: 5173 },
})
