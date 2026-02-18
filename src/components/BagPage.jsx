import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import { Trash2, Minus, Plus } from "lucide-react"
import Header from "./Header"
import { getCart, updateCartItem, removeCartItem, clearCart } from "../services/api"
import { setCart, updateItem, removeItem, clearCart as clearCartAction, selectCartItems } from "../store/cartSlice"

export default function BagPage() {
  const dispatch = useDispatch()
  const location = useLocation()
  const items = useSelector(selectCartItems)
  const orderPlaced = location.state?.orderPlaced
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getCart()
      .then((res) => {
        if (cancelled) return
        const data = res?.data?.data ?? res?.data ?? res
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.cart)
              ? data.cart
              : []
        dispatch(setCart(list))
      })
      .catch(() => {
        if (!cancelled) {
          setError(null)
          // No error shown if getCart fails (e.g. not logged in); slice may still have local items
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [dispatch])

  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty < 1) return
    setUpdatingId(productId)
    updateCartItem(productId, newQty)
      .then(() => dispatch(updateItem({ productId, quantity: newQty })))
      .catch(() => {})
      .finally(() => setUpdatingId(null))
  }

  const handleRemove = (productId) => {
    setUpdatingId(productId)
    removeCartItem(productId)
      .then(() => dispatch(removeItem(productId)))
      .catch(() => dispatch(removeItem(productId)))
      .finally(() => setUpdatingId(null))
  }

  const handleClearCart = () => {
    setClearing(true)
    clearCart()
      .then(() => dispatch(clearCartAction()))
      .catch(() => dispatch(clearCartAction()))
      .finally(() => setClearing(false))
  }

  const total = items.reduce((sum, i) => sum + (i.product?.price ?? 0) * (i.quantity ?? 0), 0)

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pb-12">
        <div className="py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Your bag</h1>
          {orderPlaced && (
            <p className="text-sm font-medium text-emerald-600">Order placed successfully.</p>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              disabled={clearing}
              className="text-sm text-neutral-500 hover:text-red-600 disabled:opacity-50"
            >
              {clearing ? "Clearing…" : "Clear cart"}
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 animate-pulse">
                <div className="h-24 w-24 rounded-lg bg-neutral-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-neutral-200" />
                  <div className="h-3 w-1/4 rounded bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
            <p className="text-neutral-600">Your bag is empty.</p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Continue shopping
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item) => {
              const p = item.product ?? {}
              const price = typeof p.price === "number" ? p.price : 0
              const lineTotal = price * (item.quantity ?? 0)
              const busy = updatingId === item.productId
              return (
                <div
                  key={item.productId}
                  className="flex flex-col sm:flex-row gap-4 rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <Link to={`/product/${item.productId}`} className="shrink-0">
                    <div className="h-24 w-24 rounded-lg bg-neutral-200 overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-neutral-400 text-xs">
                          No image
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.productId}`} className="font-semibold text-neutral-900 hover:underline">
                      {p.name ?? "Product"}
                    </Link>
                    {p.category && (
                      <p className="text-xs text-neutral-500 uppercase tracking-wide mt-0.5">{p.category}</p>
                    )}
                    <p className="mt-1 font-medium text-neutral-900">
                      ${price.toFixed(2)} × {item.quantity} = ${lineTotal.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center rounded-lg border border-neutral-300">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.productId, (item.quantity ?? 1) - 1)}
                        disabled={busy || (item.quantity ?? 1) <= 1}
                        className="p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 disabled:pointer-events-none"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-medium">{item.quantity ?? 1}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.productId, (item.quantity ?? 1) + 1)}
                        disabled={busy}
                        className="p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 disabled:pointer-events-none"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.productId)}
                      disabled={busy}
                      className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
            <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
              <p className="text-lg font-semibold text-neutral-900">
                Subtotal: ${total.toFixed(2)}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/checkout"
                  className="inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Checkout
                </Link>
                <Link
                  to="/"
                  className="inline-block text-sm font-medium text-neutral-600 hover:text-neutral-900"
                >
                  ← Continue shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
