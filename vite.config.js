import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { splitDeskPayload } from './scripts/split-desk-payload.mjs'

function deskSplitPlugin() {
  return {
    name: 'desk-split',
    buildStart() {
      const info = splitDeskPayload()
      this.info(
        `desk split: ${info.schoolCount} schools · ${(info.fullBytes / 1024).toFixed(0)} KB → ${(info.deskBytes / 1024).toFixed(0)} KB`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), deskSplitPlugin()],
  server: { host: true, port: 5173 },
})
