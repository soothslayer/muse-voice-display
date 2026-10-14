import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@wearables-ui-toolkit/mrbd/styles.css'
import './index.css'
import App from './App.tsx'
import { bootstrapFromUrl } from './settings.ts'

// Seed Home Assistant credentials from ?ha_url= &token= on first launch.
bootstrapFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
