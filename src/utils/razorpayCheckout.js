const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js"

/** Load Razorpay Checkout script once. */
export function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"))
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

/**
 * Open Razorpay modal using checkout_ready.data from POST /api/chat, then verify on success.
 * @param {object} data — { razorpayOrderId, keyId, amount, currency, orderId } (app order id)
 * @param {(body: object) => Promise} verifyPayment — POST /payment/verify
 */
export function openRazorpayFromCheckoutReady(data, verifyPayment) {
  const { razorpayOrderId, keyId, amount, currency, orderId } = data ?? {}
  if (!razorpayOrderId || !keyId || !orderId) {
    return Promise.reject(new Error("Missing payment session. Try checkout again."))
  }
  const amt = amount != null ? Number(amount) : NaN
  if (Number.isNaN(amt)) {
    return Promise.reject(new Error("Invalid payment amount."))
  }

  return loadRazorpayScript().then(
    () =>
      new Promise((resolve, reject) => {
        const options = {
          key: keyId,
          amount: amt,
          currency: currency || "INR",
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
      }),
  ).then((payload) => verifyPayment(payload))
}
