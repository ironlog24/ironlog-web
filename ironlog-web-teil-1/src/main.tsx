import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import App from './App'
import { captureInvite } from './data/social'
import '@fontsource/bebas-neue/400.css'
import '@fontsource-variable/inter'
import './index.css'

captureInvite()

const Router = import.meta.env.MODE === 'artifact' ? MemoryRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </Router>
  </React.StrictMode>,
)
