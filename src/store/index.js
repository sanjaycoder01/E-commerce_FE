import { configureStore } from "@reduxjs/toolkit"
import userReducer from "./userSlice"
import cartReducer from "./cartSlice"
import categoryReducer from "./categorySlice"

export const store = configureStore({
  reducer: {
    user: userReducer,
    cart: cartReducer,
    categories: categoryReducer,
  },
})
