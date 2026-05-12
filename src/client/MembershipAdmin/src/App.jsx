import { BrowserRouter } from 'react-router-dom'
import AppRouter from './services/router'

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
