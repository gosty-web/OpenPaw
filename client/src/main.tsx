import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastContainer } from './components/Toast'
import './index.css'

const token = localStorage.getItem('openpaw_token');
if (!token && window.location.pathname !== '/login') {
   window.location.href = '/login';
} else {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
        <ToastContainer />
      </BrowserRouter>
    </React.StrictMode>,
  )
}
