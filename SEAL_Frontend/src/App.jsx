import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import { Outlet } from 'react-router-dom';
import Authentication from './components/Authentication';
import Header from './components/Header';
import Layout from './components/Layout'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import {Provider} from 'react-redux';
import store from "./app/Store";

function App() {
  const router = createBrowserRouter([
    {
      path:'/',
      element:<Layout/>,
      children:[{
        path:"/",
        element:<Authentication/>
      },
      {
        path:"/login",
        element:<LoginPage/>
      },
      {
        path:"/signup",
        element:<SignupPage/>
      }
    ]
    }
]);

  return (
    <Provider store={store}>
    <RouterProvider router={router}/>
    </Provider>     
  )
}

export default App
