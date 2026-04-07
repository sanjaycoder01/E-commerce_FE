import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

const productsApi = axios.create({
  baseURL: `${API_URL}`,
  withCredentials: true,
})

const cartApi = axios.create({
  baseURL: `${API_URL}/cart`,
  withCredentials: true,
})

/** POST /api/chat — intent routing (LIST_PRODUCTS, cart, order, etc.). Bearer JWT required if your route is protected. */
const chatApi = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
})

/**
 * @param {object} body
 * @param {string} body.message — user text (drives intent detection)
 * @param {string} [body.productId]
 * @param {number} [body.quantity]
 * @param {string} [body.orderId]
 * @param {object|string} [body.shippingAddress]
 */
export const sendChatMessage = (body) => chatApi.post("/chat", body)

export const getAllProducts = () => productsApi.get("/products/getallproducts")

/** GET /products/by-category/:name — products in that category (Bearer if required). */
export const getProductsByCategory = (categoryName) =>
  productsApi.get(`/products/by-category/${encodeURIComponent(categoryName)}`)

/** GET /category/getcategoryname/:id — returns category document (e.g. { name }). Requires Bearer token if your route is protected. */
export const getCategoryById = (id) =>
  productsApi.get(`/category/getcategoryname/${encodeURIComponent(id)}`)

export const getProductById = (id) => productsApi.get(`/products/getproductbyid/${id}`)

export const searchProducts = (query) =>
  productsApi.get("/products/search", { params: { q: query || "" } })

export const createOrder = (body) => productsApi.post("/orders", body)
export const getOrders = () => productsApi.get("/orders")
export const getOrderById = (id) => productsApi.get(`/orders/${id}`)

/** Create Razorpay order for checkout. Body: { orderId: "<Order _id>" }. Returns razorpayOrderId, keyId, amount, currency. */
export const createPaymentOrder = (orderId) =>
  productsApi.post("/payment/create-order", { orderId })

/** Verify payment after Razorpay success. Body: { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }. */
export const verifyPayment = (body) => productsApi.post("/payment/verify", body)

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
