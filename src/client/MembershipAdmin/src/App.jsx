import { BrowserRouter } from 'react-router-dom'
import { PrimeReactProvider } from 'primereact/api'
import AppRouter from './services/router'

export default function App() {
  return (
    <PrimeReactProvider value={{ unstyled: true }}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </PrimeReactProvider>
  )
}
