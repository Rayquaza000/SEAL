import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import { Outlet } from 'react-router-dom';
import Authentication from './components/Authentication';
import Header from './components/Header';


function App() {
  const router =createBrowserRouter([
    {
      path:'/',
      element:<Authentication/>
    }
]);

  return (
    <RouterProvider router={router}>
      <Header/>
      <Outlet/>
    </RouterProvider>
  )
}

export default App
