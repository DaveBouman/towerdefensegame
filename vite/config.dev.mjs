import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { APP_VERSION } from './readPackageVersion.mjs'
import { blockServerAutoBattler } from './blockServerAutoBattler.mjs'

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    define: {
        __APP_VERSION__: JSON.stringify(APP_VERSION),
    },
    plugins: [
        blockServerAutoBattler(),
        react(),
    ],
    server: {
        port: 8080
    }
})
