import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import './App.css'
import LoginForm from './components/login'
import SignupForm from './components/signup'
import HomePage from './components/home'
import ProductDetails from './components/ProductDetails'
import BagPage from './components/BagPage'
import CheckoutPage from './components/CheckoutPage'

function RootLayout() {
  return (
    <main>
      <Outlet />
    </main>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'product/:id', element: <ProductDetails /> },
      { path: 'bag', element: <BagPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'login', element: <LoginForm /> },
      { path: 'signup', element: <SignupForm /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
