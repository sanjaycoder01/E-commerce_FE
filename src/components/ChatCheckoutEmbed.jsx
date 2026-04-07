import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import { getProfile, createOrder, createPaymentOrder, verifyPayment, clearCart as clearCartApi } from "../services/api"
import { clearCart, selectCartItems } from "../store/cartSlice"

const initialAddress = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js"

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = RAZORPAY_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay"))
    document.body.appendChild(script)
  })
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

/**
 * Compact checkout form for use inside HomeChat (same API flow as CheckoutPage).
 */
export default function ChatCheckoutEmbed({ onSuccess }) {
  const dispatch = useDispatch()
  const items = useSelector(selectCartItems)
  const [shippingAddress, setShippingAddress] = useState(initialAddress)
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
      setError("Please fill in all shipping fields.")
      return
    }
    setPlacing(true)
    const addressPayload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
    }
    createOrder({ shippingAddress: addressPayload })
      .then((res) => {
        const resData = res?.data?.data ?? res?.data
        const order = resData?.order ?? resData
        const orderId = order?._id ?? order?.id
        if (!orderId) throw new Error("Order ID missing")
        return createPaymentOrder(orderId).then((payRes) => {
          const data = payRes?.data?.data ?? payRes?.data
          return { orderId, ...data }
        })
      })
      .then(({ orderId, razorpayOrderId, keyId, amount, currency }) => {
        return loadRazorpay().then(() => ({
          orderId,
          razorpayOrderId,
          keyId,
          amount: amount != null ? Number(amount) : Math.round(total * 100),
          currency: currency || "INR",
        }))
      })
      .then(({ orderId, razorpayOrderId, keyId, amount, currency }) => {
        return new Promise((resolve, reject) => {
          const options = {
            key: keyId,
            amount,
            currency,
            order_id: razorpayOrderId,
            name: "E-commerce",
            handler(res) {
              resolve({
                orderId,
                razorpayOrderId,
                razorpayPaymentId: res.razorpay_payment_id,
                razorpaySignature: res.razorpay_signature,
              })
            },
          }
          const rzp = new window.Razorpay(options)
          rzp.on("payment.failed", () => reject(new Error("Payment failed")))
          rzp.open()
        })
      })
      .then(({ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
        return verifyPayment({
          orderId,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        })
      })
      .then(() => {
        dispatch(clearCart())
        clearCartApi().catch(() => {})
        onSuccess?.("Payment successful. Your order is confirmed!")
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? "Payment could not be completed")
      })
      .finally(() => setPlacing(false))
  }

  if (items.length === 0) {
    return (
      <div className="mt-2 rounded-xl border border-neutral-200 bg-white p-3 text-center">
        <p className="text-xs text-neutral-600">Your bag is empty.</p>
        <Link to="/bag" className="mt-2 inline-block text-xs font-medium text-neutral-900 underline">
          View bag
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-2 max-h-[min(70vh,520px)] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Checkout</p>
      <p className="mt-1 text-[11px] text-neutral-500">
        Subtotal: <span className="font-semibold text-neutral-900">${total.toFixed(2)}</span> · {items.length}{" "}
        line(s)
      </p>

      <form onSubmit={handlePlaceOrder} className="mt-3 space-y-2">
        {error && (
          <div className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] text-red-700" role="alert">
            {error}
          </div>
        )}
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-medium text-neutral-500">Full name</span>
          <input
            type="text"
            value={shippingAddress.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900"
            required
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-medium text-neutral-500">Phone</span>
          <input
            type="tel"
            value={shippingAddress.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900"
            required
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-medium text-neutral-500">Address</span>
          <input
            type="text"
            value={shippingAddress.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900"
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-medium text-neutral-500">City</span>
            <input
              type="text"
              value={shippingAddress.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900"
              required
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-medium text-neutral-500">State</span>
            <input
              type="text"
              value={shippingAddress.state}
              onChange={(e) => handleChange("state", e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900"
              required
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-medium text-neutral-500">Pincode</span>
          <input
            type="text"
            value={shippingAddress.pincode}
            onChange={(e) => handleChange("pincode", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900"
            required
          />
        </label>
        <button
          type="submit"
          disabled={placing}
          className="mt-1 w-full rounded-lg bg-neutral-900 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {placing ? "Processing…" : "Pay & place order"}
        </button>
      </form>
      <Link to="/checkout" className="mt-2 inline-block text-[10px] text-neutral-500 underline">
        Open full checkout page
      </Link>
    </div>
  )
}
