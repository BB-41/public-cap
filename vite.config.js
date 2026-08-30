import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { splitDeskPayload } from './scripts/split-desk-payload.mjs'
import { writeSitemap } from './scripts/write-sitemap.mjs'

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
  plugins: [react(), deskSplitPlugin()],
  server: { host: true, port: 5173 },
})
