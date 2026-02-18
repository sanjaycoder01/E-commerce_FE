import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import Header from "./Header"
import { getProfile, createOrder, clearCart as clearCartApi } from "../services/api"
import { clearCart, selectCartItems } from "../store/cartSlice"

const initialAddress = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
}

function profileToAddress(profile) {
  const user = profile?.user ?? profile
  const addresses = user?.addresses
  const addr = Array.isArray(addresses) && addresses.length > 0 ? addresses[0] : null
  if (!addr) return initialAddress
  return {
    fullName: addr.fullName ?? user?.name ?? "",
    phone: addr.phone ?? user?.phone ?? "",
    address: addr.street ?? addr.address ?? "",
    city: addr.city ?? "",
    state: addr.state ?? "",
    pincode: addr.pincode ?? "",
  }
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const items = useSelector(selectCartItems)
  const [shippingAddress, setShippingAddress] = useState(initialAddress)
  const [addressLoaded, setAddressLoaded] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (items.length === 0) return
    getProfile()
      .then((res) => {
        const data = res?.data?.data ?? res?.data
        setShippingAddress(profileToAddress(data))
      })
      .catch(() => {})
      .finally(() => setAddressLoaded(true))
  }, [items.length])

  const total = items.reduce((sum, i) => sum + (i.product?.price ?? 0) * (i.quantity ?? 0), 0)

  const handleChange = (field, value) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handlePlaceOrder = (e) => {
    e.preventDefault()
    setError(null)
    const { fullName, phone, address, city, state, pincode } = shippingAddress
    if (!fullName?.trim() || !phone?.trim() || !address?.trim() || !city?.trim() || !state?.trim() || !pincode?.trim()) {
      setError("Please fill in all shipping address fields.")
      return
    }
    setPlacing(true)
    createOrder({
      shippingAddress: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      },
    })
      .then(() => {
        dispatch(clearCart())
        clearCartApi().catch(() => {})
        navigate("/home", { state: { orderPlaced: true } })
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? "Failed to place order")
      })
      .finally(() => setPlacing(false))
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Header />
        <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
            <p className="text-neutral-600">Your bag is empty.</p>
            <Link
              to="/bag"
              className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              View bag
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pb-12">
        <div className="py-6">
          <Link to="/bag" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
            ← Back to bag
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-neutral-900 tracking-tight">Checkout</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Order summary – all products */}
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Order summary</h2>
            <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
              {items.map((item) => {
                const p = item.product ?? {}
                const price = typeof p.price === "number" ? p.price : 0
                const lineTotal = price * (item.quantity ?? 0)
                return (
                  <div
                    key={item.productId}
                    className="flex gap-4 rounded-lg border border-neutral-100 p-3"
                  >
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-neutral-200 overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-neutral-400 text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 truncate">{p.name ?? "Product"}</p>
                      {p.category && (
                        <p className="text-xs text-neutral-500 uppercase tracking-wide">{p.category}</p>
                      )}
                      <p className="text-sm text-neutral-600 mt-0.5">
                        ${price.toFixed(2)} × {item.quantity} = ${lineTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-lg font-semibold text-neutral-900">
              Subtotal: ${total.toFixed(2)}
            </p>
          </div>

          {/* Shipping address form */}
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Shipping address</h2>
            <form onSubmit={handlePlaceOrder} className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Full name</span>
                <input
                  type="text"
                  value={shippingAddress.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  placeholder="Full name"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Phone</span>
                <input
                  type="tel"
                  value={shippingAddress.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  placeholder="Phone"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Address</span>
                <input
                  type="text"
                  value={shippingAddress.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  placeholder="Street address"
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-500">City</span>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                    placeholder="City"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-500">State</span>
                  <input
                    type="text"
                    value={shippingAddress.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                    placeholder="State"
                    required
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Pincode</span>
                <input
                  type="text"
                  value={shippingAddress.pincode}
                  onChange={(e) => handleChange("pincode", e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  placeholder="Pincode"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={placing}
                className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:pointer-events-none"
              >
                {placing ? "Placing order…" : "Place order"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
