import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  items: [], // { productId, quantity, product: { id, name, price, image, category } }
}

function toCartProduct(p) {
  const raw = p?.product ?? p
  if (!raw) return null
  return {
    id: raw._id ?? raw.id,
    name: raw.name ?? raw.title ?? raw.productName ?? "Product",
    price: raw.price ?? raw.priceAmount ?? 0,
    image: raw.image ?? raw.img ?? raw.imageUrl ?? raw.thumbnail ?? "",
    category: raw.category ?? raw.subcategory ?? raw.type ?? "",
  }
}

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCart: (state, action) => {
      const payload = action.payload
      const list = Array.isArray(payload) ? payload : payload?.items ?? []
      state.items = list.map((item) => ({
        productId: item.productId ?? item.product?._id ?? item.product?.id,
        quantity: item.quantity ?? 1,
        product: toCartProduct(item) ?? toCartProduct(item?.product) ?? {
          id: item.productId ?? item.product?._id ?? item.product?.id,
          name: "Product",
          price: 0,
          image: "",
          category: "",
        },
      })).filter((i) => i.productId)
    },
    addItem: (state, action) => {
      const { productId, quantity = 1, product } = action.payload
      const existing = state.items.find((i) => i.productId === productId)
      if (existing) {
        existing.quantity += quantity
      } else {
        state.items.push({
          productId,
          quantity,
          product: product ?? { id: productId, name: "Product", price: 0, image: "", category: "" },
        })
      }
    },
    updateItem: (state, action) => {
      const { productId, quantity } = action.payload
      const item = state.items.find((i) => i.productId === productId)
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((i) => i.productId !== productId)
        } else {
          item.quantity = quantity
        }
      }
    },
    removeItem: (state, action) => {
      const productId = action.payload
      state.items = state.items.filter((i) => i.productId !== productId)
    },
    clearCart: (state) => {
      state.items = []
    },
  },
})

export const { setCart, addItem, updateItem, removeItem, clearCart } = cartSlice.actions
export const selectCartItems = (state) => state.cart.items
export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + (i.quantity || 0), 0)
export default cartSlice.reducer
