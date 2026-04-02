import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CharacterProvider } from './store/CharacterContext.jsx'
import App from './App.jsx'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CharacterProvider>
      <App />
    </CharacterProvider>
  </StrictMode>,
)
