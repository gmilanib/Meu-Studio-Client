// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {BrowserRouter, Route, Routes} from "react-router";
import ScreenPostClient from "./Cliente.jsx";

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <Routes>
            <Route index element={<App />}/>
            <Route path="/clientes" element={<ScreenPostClient />} />
        </Routes>
    </BrowserRouter>,
)
