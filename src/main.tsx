import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { APIProvider } from '@vis.gl/react-google-maps'
import { AuthProvider } from './context/AuthContext'
import { ModalProvider } from './context/ModalContext'
import { store } from './redux/store'
import AppRouter from './routes'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <AuthProvider>
          <ModalProvider>
            <AppRouter />
          </ModalProvider>
        </AuthProvider>
      </APIProvider>
    </Provider>
  </StrictMode>,
)
