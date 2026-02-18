import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { getOrders, getOrderById } from "../services/api"

function parseOrdersList(res) {
  const data = res?.data?.data ?? res?.data ?? res
  const list = Array.isArray(data) ? data : data?.orders ?? data?.data ?? []
  return Array.isArray(list) ? list : []
}

function parseOrderDetail(res) {
  const data = res?.data?.data ?? res?.data ?? res
  const order = data?.order ?? data
  return order && typeof order === "object" ? order : null
}

export default function OrdersModal({ isOpen, onClose }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [orderDetail, setOrderDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setOrders([])
    setSelectedId(null)
    setOrderDetail(null)
    setLoading(true)
    getOrders()
      .then((res) => setOrders(parseOrdersList(res)))
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? "Failed to load orders")
      })
      .finally(() => setLoading(false))
  }, [isOpen])

  useEffect(() => {
    if (!selectedId) {
      setOrderDetail(null)
      return
    }
    setDetailLoading(true)
    getOrderById(selectedId)
      .then((res) => setOrderDetail(parseOrderDetail(res)))
      .catch(() => setOrderDetail(null))
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  if (!isOpen) return null

  const orderId = (o) => o._id ?? o.id ?? o.orderId
  const orderDate = (o) => {
    const d = o.createdAt ?? o.date ?? o.orderDate
    return d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"
  }
  const orderTotal = (o) => {
    const t = o.total ?? o.totalAmount ?? o.amount
    return t != null ? `$${Number(t).toFixed(2)}` : "—"
  }
  const orderStatus = (o) => o.status ?? o.orderStatus ?? "—"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orders-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl ring-1 ring-neutral-200">
        <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-neutral-100">
          <h2 id="orders-modal-title" className="text-lg font-semibold text-neutral-900">
            Orders
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <div className="py-10 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <p className="py-8 text-center text-neutral-500">No orders yet.</p>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="space-y-2">
              {orders.map((o) => {
                const id = orderId(o)
                const isSelected = selectedId === id
                return (
                  <div
                    key={id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isSelected ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:bg-neutral-50/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(isSelected ? null : id)}
                      className="w-full text-left flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="font-medium text-neutral-900">
                        Order {String(id).slice(-8)}
                      </span>
                      <span className="text-sm text-neutral-500">{orderDate(o)}</span>
                      <span className="text-sm font-medium text-neutral-700">{orderTotal(o)}</span>
                      {orderStatus(o) && (
                        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                          {orderStatus(o)}
                        </span>
                      )}
                    </button>
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-neutral-200">
                        {detailLoading && (
                          <div className="h-20 rounded-lg bg-neutral-100 animate-pulse" />
                        )}
                        {!detailLoading && orderDetail && (
                          <div className="space-y-4 text-sm">
                            {orderDetail.items?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                                  Items
                                </p>
                                <ul className="space-y-2">
                                  {orderDetail.items.map((item, i) => {
                                    const p = item.product ?? item
                                    const name = p.name ?? p.title ?? "Item"
                                    const qty = item.quantity ?? 1
                                    const price = item.price ?? p.price ?? 0
                                    return (
                                      <li key={i} className="flex justify-between text-neutral-700">
                                        <span>{name} × {qty}</span>
                                        <span>${Number(price * qty).toFixed(2)}</span>
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            )}
                            {orderDetail.shippingAddress && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                                  Shipping
                                </p>
                                <p className="text-neutral-700">
                                  {[
                                    orderDetail.shippingAddress.fullName,
                                    orderDetail.shippingAddress.address,
                                    orderDetail.shippingAddress.city,
                                    orderDetail.shippingAddress.state,
                                    orderDetail.shippingAddress.pincode,
                                  ].filter(Boolean).join(", ")}
                                </p>
                                {orderDetail.shippingAddress.phone && (
                                  <p className="text-neutral-600 mt-0.5">
                                    {orderDetail.shippingAddress.phone}
                                  </p>
                                )}
                              </div>
                            )}
                            {orderDetail.total != null && (
                              <p className="font-semibold text-neutral-900 pt-2 border-t border-neutral-100">
                                Total: ${Number(orderDetail.total).toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}
                        {!detailLoading && !orderDetail && (
                          <p className="text-neutral-500">Could not load order details.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
