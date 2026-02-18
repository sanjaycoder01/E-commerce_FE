import axios from "axios"

const JWT_STORAGE_KEY = "accessToken"
const API_URL = import.meta.env.VITE_API_URL
export const getToken = () => localStorage.getItem(JWT_STORAGE_KEY)
export const setToken = (token) => {
  if (token) localStorage.setItem(JWT_STORAGE_KEY, token)
  else localStorage.removeItem(JWT_STORAGE_KEY)
}

const attachAuthHeader = (config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}

const api = axios.create({
  baseURL: `${API_URL}/auth`,
  withCredentials: true,
})
api.interceptors.request.use(attachAuthHeader)

const productsApi = axios.create({
  baseURL: `${API_URL}`,
  withCredentials: true,
})
productsApi.interceptors.request.use(attachAuthHeader)

const cartApi = axios.create({
  baseURL: `${API_URL}/cart`,
  withCredentials: true,
})
cartApi.interceptors.request.use(attachAuthHeader)

export const getAllProducts = () => productsApi.get("/products/getallproducts")

export const getProductById = (id) => productsApi.get(`/products/getproductbyid/${id}`)

export const searchProducts = (query) =>
  productsApi.get("/products/search", { params: { q: query || "" } })

export const createOrder = (body) => productsApi.post("/orders", body)
export const getOrders = () => productsApi.get("/orders")
export const getOrderById = (id) => productsApi.get(`/orders/${id}`)

export const getProfile = () => api.get("/profile")

export const updateProfile = (data) => api.patch("/updateprofile", data)

export const logout = () => api.post("/logout")

export const getCart = () => cartApi.get("/getCart")
export const addCartItem = (productId, quantity = 1) =>
  cartApi.post("/additem", { productId, quantity })
export const updateCartItem = (productId, quantity) =>
  cartApi.patch(`/updateitem/${productId}`, { quantity })
export const removeCartItem = (productId) =>
  cartApi.delete(`/removeitem/${productId}`)
export const clearCart = () => cartApi.delete("/clearcart")

export default api
