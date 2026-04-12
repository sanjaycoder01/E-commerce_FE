import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom'
import './App.css'
import LoginForm from './components/login'
import SignupForm from './components/signup'
import HomePage from './components/home'
import ProductDetails from './components/ProductDetails'
import BagPage from './components/BagPage'
import CheckoutPage from './components/CheckoutPage'
import { RequireAuth, GuestOnly, IndexRedirect } from './components/RequireAuth'

function RootLayout() {
  const { pathname } = useLocation()
  const isAuthRoute = pathname === '/login' || pathname === '/signup'

  useEffect(() => {
    const root = document.getElementById('root')
    const cls = 'auth-route'
    if (isAuthRoute) {
      document.documentElement.classList.add(cls)
      document.body.classList.add(cls)
      root?.classList.add(cls)
    } else {
      document.documentElement.classList.remove(cls)
      document.body.classList.remove(cls)
      root?.classList.remove(cls)
    }
  }, [isAuthRoute])

  return (
    <main className={isAuthRoute ? 'min-h-dvh' : undefined}>
      <Outlet />
    </main>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <IndexRedirect /> },
      {
        element: <GuestOnly />,
        children: [
          { path: 'login', element: <LoginForm /> },
          { path: 'signup', element: <SignupForm /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: 'home', element: <HomePage /> },
          { path: 'product/:id', element: <ProductDetails /> },
          { path: 'bag', element: <BagPage /> },
          { path: 'checkout', element: <CheckoutPage /> },
        ],
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
