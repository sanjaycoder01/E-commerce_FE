import { useCallback, useEffect, useId, useRef, useState } from "react"
import { useDispatch, useStore } from "react-redux"
import { Link, useNavigate } from "react-router-dom"
import { MessageCircle, Send, X } from "lucide-react"
import { getCart, getToken, getProductById, sendChatMessage, verifyPayment, clearCart as clearCartApi } from "../services/api"
import { setCart, clearCart } from "../store/cartSlice"
import { openRazorpayFromCheckoutReady } from "../utils/razorpayCheckout"
import ChatCheckoutEmbed from "./ChatCheckoutEmbed"

function parseProductFromApi(res) {
  const data = res?.data?.data ?? res?.data
  const product = data?.product ?? data
  return typeof product === "object" && product !== null ? product : null
}

/** Axios wraps API body in `res.data`; backend may nest `{ data: { type, message, data: products[] } }`. */
function getProductListBlock(res) {
  const root = res?.data
  if (!root || typeof root !== "object") return null
  const block =
    root.data && typeof root.data === "object" && root.data.type === "product_list"
      ? root.data
      : root.type === "product_list"
        ? root
        : null
  if (!block || block.type !== "product_list" || !Array.isArray(block.data)) return null
  return {
    message: typeof block.message === "string" ? block.message : "",
    products: block.data,
  }
}

/**
 * Cart agent: `{ type: "cart", message, data: { items, totalPrice }, suggestions }` on `res.data`
 * (or nested under `res.data.data` when the API wraps the payload).
 */
function getChatCartAgentBlock(res) {
  const root = res?.data
  if (!root || typeof root !== "object") return null
  const block =
    root.type === "cart"
      ? root
      : root.data && typeof root.data === "object" && root.data.type === "cart"
        ? root.data
        : null
  if (!block || block.type !== "cart") return null
  const payload = block.data && typeof block.data === "object" ? block.data : {}
  return {
    message: typeof block.message === "string" ? block.message : "",
    data: {
      items: Array.isArray(payload.items) ? payload.items : [],
      totalPrice: payload.totalPrice,
    },
    suggestions: Array.isArray(block.suggestions) ? block.suggestions : [],
  }
}

/**
 * Payment agent: `{ type: "checkout_ready", message, data: { razorpayOrderId, keyId, amount, currency, orderId }, suggestions }`.
 */
function getCheckoutReadyBlock(res) {
  const root = res?.data
  if (!root || typeof root !== "object") return null
  const block =
    root.type === "checkout_ready"
      ? root
      : root.data && typeof root.data === "object" && root.data.type === "checkout_ready"
        ? root.data
        : null
  if (!block || block.type !== "checkout_ready") return null
  const payload = block.data && typeof block.data === "object" ? block.data : {}
  return {
    message: typeof block.message === "string" ? block.message : "",
    data: {
      razorpayOrderId: payload.razorpayOrderId,
      keyId: payload.keyId,
      amount: payload.amount,
      currency: payload.currency,
      orderId: payload.orderId,
    },
    suggestions: Array.isArray(block.suggestions) ? block.suggestions : [],
  }
}

/** Map cart agent line items (product + quantity + priceSnapshot) to ChatCartPanel rows. */
function chatCartLinesFromAgentItems(items) {
  if (!Array.isArray(items)) return []
  return items.map((item, idx) => {
    const p = item.product ?? {}
    const productId = p._id ?? p.id ?? `line-${idx}`
    const qty = item.quantity ?? 1
    const unit = Number(item.priceSnapshot ?? p.discountPrice ?? p.price ?? 0) || 0
    const name = p.name ?? "Product"
    const image = productImageUrl(p)
    return {
      productId,
      quantity: qty,
      name,
      image,
      price: unit,
      lineTotal: unit * qty,
    }
  })
}

/** Suggestions may live on `data.suggestions` or `data.data.suggestions`. */
function extractSuggestionsFromResponse(res) {
  if (!res?.data || typeof res.data !== "object") return []
  const root = res.data
  const inner = root.data && typeof root.data === "object" ? root.data : null
  if (Array.isArray(inner?.suggestions)) return inner.suggestions
  if (Array.isArray(root.suggestions)) return root.suggestions
  return []
}

function extractReplyText(res) {
  const list = getProductListBlock(res)
  if (list?.message) return list.message

  const cartBlock = getChatCartAgentBlock(res)
  if (cartBlock?.message) return cartBlock.message

  const checkoutReady = getCheckoutReadyBlock(res)
  if (checkoutReady?.message) return checkoutReady.message

  const d = res?.data
  if (d == null) return ""
  if (typeof d === "string") return d
  if (typeof d?.message === "string" && !Array.isArray(d.message)) return d.message
  if (typeof d?.reply === "string") return d.reply
  if (typeof d?.response === "string") return d.response
  if (typeof d?.data === "string") return d.data
  if (d?.data != null && typeof d.data !== "object") return String(d.data)
  if (d?.data && typeof d.data === "object" && typeof d.data.message === "string") return d.data.message
  try {
    return JSON.stringify(d, null, 2)
  } catch {
    return String(d)
  }
}

function formatMoney(n) {
  if (typeof n === "number" && !Number.isNaN(n)) return n.toFixed(2)
  return String(n ?? "")
}

function productImageUrl(p) {
  if (Array.isArray(p?.images) && p.images[0]) return p.images[0]
  return p?.image ?? p?.img ?? p?.imageUrl ?? p?.thumbnail ?? ""
}

function parseCartListFromResponse(res) {
  const data = res?.data?.data ?? res?.data ?? res
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.cart)) return data.cart
  return []
}

/** Lines for in-chat cart UI */
function cartLinesFromApiList(list) {
  return list.map((item) => {
    const p = item.product ?? item
    const productId = item.productId ?? p._id ?? p.id
    const qty = item.quantity ?? 1
    const price = typeof p.price === "number" ? p.price : Number(p.price ?? p.priceAmount ?? 0) || 0
    const name = p.name ?? p.title ?? "Product"
    const image = productImageUrl(p) || p.image || ""
    return {
      productId,
      quantity: qty,
      name,
      image,
      price,
      lineTotal: price * qty,
    }
  })
}

function ChatCartPanel({ items, totalPrice }) {
  const computed = items.reduce((sum, line) => sum + line.lineTotal, 0)
  const total = totalPrice != null && totalPrice !== "" ? Number(totalPrice) : computed
  return (
    <div className="mt-2 rounded-xl border border-neutral-200 bg-white p-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Your cart</p>
      <ul className="mt-2 max-h-44 space-y-2 overflow-y-auto">
        {items.length === 0 && (
          <li className="text-xs text-neutral-500">No items in your bag yet.</li>
        )}
        {items.map((line) => (
          <li
            key={line.productId}
            className="flex gap-2 rounded-lg border border-neutral-100 bg-neutral-50/80 p-1.5"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-200">
              {line.image ? (
                <img src={line.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[9px] text-neutral-400">—</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[11px] font-medium text-neutral-900">{line.name}</p>
              <p className="text-[10px] text-neutral-500">
                ${formatMoney(line.price)} × {line.quantity} = ${formatMoney(line.lineTotal)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 0 && (
        <p className="mt-2 text-xs font-semibold text-neutral-900">
          {totalPrice != null && totalPrice !== "" ? "Total" : "Subtotal"}: ${formatMoney(total)}
        </p>
      )}
      <Link
        to="/bag"
        className="mt-2 inline-block text-xs font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-600"
      >
        Open full bag →
      </Link>
    </div>
  )
}

function ChatProductCard({ product, loadingId, onSelect }) {
  const id = product._id ?? product.id
  const name = product.name ?? "Product"
  const img = productImageUrl(product)
  const price = product.price
  const discount = product.discountPrice
  const out = product.outOfStock === true
  const busy = loadingId === id

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      disabled={busy}
      className="flex w-full gap-2 rounded-xl border border-neutral-200 bg-white p-2 text-left shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-60"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        {img ? (
          <img src={img} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">—</div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[10px] font-medium text-neutral-600">
            …
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-medium text-neutral-900">{name}</p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
          {discount != null && discount !== "" && Number(discount) !== Number(price) ? (
            <>
              <span className="text-xs font-semibold text-neutral-900">${formatMoney(discount)}</span>
              <span className="text-[11px] text-neutral-400 line-through">${formatMoney(price)}</span>
            </>
          ) : (
            <span className="text-xs font-semibold text-neutral-900">${formatMoney(price)}</span>
          )}
          {out && <span className="text-[10px] text-amber-700">Out of stock</span>}
        </div>
        <p className="mt-1 text-[10px] text-neutral-400">Tap for details</p>
      </div>
    </button>
  )
}

function ChatProductDetailPanel({ product, onAddToCart }) {
  const [adding, setAdding] = useState(false)
  const [bagError, setBagError] = useState(null)

  const id = product._id ?? product.id
  const name = product.name ?? product.title ?? product.productName ?? "Product"
  const img = productImageUrl(product)
  const price = product.price ?? product.priceAmount ?? 0
  const discount = product.discountPrice
  const desc = product.description ?? product.desc ?? ""
  const stock = product.stock
  const out = product.outOfStock === true

  const handleAddToCart = async () => {
    if (!id || out || adding) return
    if (!getToken()) return
    setBagError(null)
    setAdding(true)
    try {
      await onAddToCart(product)
    } catch (err) {
      setBagError(
        err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? "Failed to add to cart",
      )
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-neutral-200 bg-white p-2">
      <div className="overflow-hidden rounded-lg bg-neutral-100">
        {img ? (
          <img src={img} alt="" className="max-h-40 w-full object-contain" />
        ) : (
          <div className="flex h-32 items-center justify-center text-xs text-neutral-400">No image</div>
        )}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-neutral-900 leading-snug">{name}</h4>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          {discount != null && discount !== "" && Number(discount) !== Number(price) ? (
            <>
              <span className="text-sm font-semibold text-neutral-900">${formatMoney(discount)}</span>
              <span className="text-xs text-neutral-400 line-through">${formatMoney(price)}</span>
            </>
          ) : (
            <span className="text-sm font-semibold text-neutral-900">${formatMoney(price)}</span>
          )}
        </div>
        {desc && <p className="mt-2 text-xs text-neutral-600 leading-relaxed line-clamp-6">{desc}</p>}
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neutral-500">
          {stock != null && <span>Stock: {stock}</span>}
          {out && <span className="text-amber-700">Out of stock</span>}
        </div>

        {!out && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={adding || !getToken()}
            className="mt-3 w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:pointer-events-none disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add to cart"}
          </button>
        )}
        {!out && !getToken() && (
          <p className="mt-1.5 text-center text-[11px] text-neutral-500">
            <Link to="/login" className="font-medium text-neutral-800 underline">
              Sign in
            </Link>{" "}
            to add items to your bag.
          </p>
        )}
        {bagError && (
          <p className="mt-1.5 text-center text-xs text-red-600" role="alert">
            {bagError}
          </p>
        )}
        <Link
          to={`/product/${id}`}
          className="mt-2 inline-block text-xs font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-600"
        >
          Open full product page →
        </Link>
      </div>
    </div>
  )
}

function AssistantSuggestionChips({ suggestions, msg, detailLoadingId, onPick, disabledAll }) {
  if (!suggestions?.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Suggested actions">
      {suggestions.map((s) => {
        const isViewDetails = /view\s*details/i.test(s)
        const canViewDetails =
          isViewDetails && msg.products?.length === 1 && !detailLoadingId
        const disabled = disabledAll || (isViewDetails && !canViewDetails)

        return (
          <button
            key={`${msg.id}-${s}`}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s, msg)}
            className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {s}
          </button>
        )
      })}
    </div>
  )
}

/** Append assistant bubble(s) from POST /api/chat response and sync Redux cart when the cart agent returns items. */
function appendAssistantMessagesFromChatResponse(res, setMessages, dispatch) {
  const cartAgent = getChatCartAgentBlock(res)
  if (cartAgent) {
    if (cartAgent.data.items?.length) {
      dispatch(setCart(cartAgent.data.items))
    }
    const lines = chatCartLinesFromAgentItems(cartAgent.data.items)
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: cartAgent.message || "Your cart",
        cartItems: lines,
        cartTotal: cartAgent.data.totalPrice,
        suggestions: cartAgent.suggestions ?? [],
      },
    ])
    return
  }
  const checkoutReady = getCheckoutReadyBlock(res)
  if (checkoutReady && checkoutReady.data?.razorpayOrderId && checkoutReady.data?.keyId && checkoutReady.data?.orderId) {
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: checkoutReady.message || "Proceed to payment.",
        checkoutReady: checkoutReady.data,
        suggestions: checkoutReady.suggestions ?? [],
      },
    ])
    return
  }
  const productBlock = getProductListBlock(res)
  if (productBlock && productBlock.products.length > 0) {
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: productBlock.message || "Here are some products.",
        products: productBlock.products,
        suggestions: productBlock.suggestions,
      },
    ])
    return
  }
  const reply = extractReplyText(res) || "No response from assistant."
  const suggestions = extractSuggestionsFromResponse(res)
  setMessages((m) => [
    ...m,
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text: reply,
      ...(suggestions.length > 0 ? { suggestions } : {}),
    },
  ])
}

export default function HomeChat() {
  const dispatch = useDispatch()
  const store = useStore()
  const navigate = useNavigate()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [banner, setBanner] = useState(null)
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [orderId, setOrderId] = useState("")
  const [shippingAddressRaw, setShippingAddressRaw] = useState("")
  const [detailLoadingId, setDetailLoadingId] = useState(null)
  const [razorpayBusy, setRazorpayBusy] = useState(false)
  const listRef = useRef(null)

  const handleChatAddToCart = useCallback(
    async (product) => {
      const id = product?._id ?? product?.id
      if (!id) throw new Error("Invalid product")
      if (!getToken()) {
        setBanner("Sign in to add to cart.")
        throw new Error("Sign in required")
      }
      setBanner(null)

      const chatRes = await sendChatMessage({
        message: "add to cart",
        productId: id,
        quantity: 1,
      })

      const checkoutReady = getCheckoutReadyBlock(chatRes)
      if (checkoutReady?.data?.razorpayOrderId && checkoutReady.data?.keyId && checkoutReady.data?.orderId) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: checkoutReady.message || "Proceed to payment.",
            checkoutReady: checkoutReady.data,
            suggestions: checkoutReady.suggestions ?? [],
          },
        ])
        return
      }

      const cartAgent = getChatCartAgentBlock(chatRes)

      let list = []
      try {
        const cartRes = await getCart()
        list = parseCartListFromResponse(cartRes)
      } catch (e) {
        console.error("[chat] getCart after add to cart failed", e)
      }
      const merged = list.length ? list : cartAgent?.data?.items ?? []
      dispatch(setCart(merged))

      const cartItems = cartAgent
        ? chatCartLinesFromAgentItems(cartAgent.data.items)
        : cartLinesFromApiList(list)
      const cartTotal = cartAgent?.data?.totalPrice
      const summary = extractReplyText(chatRes) || "Your bag has been updated."
      let suggestions = extractSuggestionsFromResponse(chatRes)
      if (cartAgent?.suggestions?.length) suggestions = cartAgent.suggestions

      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: summary,
          cartItems,
          ...(cartTotal != null && cartTotal !== "" ? { cartTotal } : {}),
          ...(suggestions.length > 0 ? { suggestions } : {}),
        },
      ])
    },
    [dispatch],
  )

  const openProductDetailInChat = useCallback(async (product) => {
    const id = product?._id ?? product?.id
    if (!id) return
    if (!getToken()) {
      setBanner("Sign in to load product details.")
      return
    }
    setBanner(null)
    setDetailLoadingId(id)
    try {
      const res = await getProductById(id)
      const full = parseProductFromApi(res)
      if (!full) {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: "Could not load this product.",
            isError: true,
          },
        ])
        return
      }
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "",
          productDetail: full,
        },
      ])
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        "Failed to load product"
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: msg, isError: true },
      ])
    } finally {
      setDetailLoadingId(null)
    }
  }, [])

  const handleSuggestionPick = useCallback(
    (label, msg) => {
      const t = label.trim()
      if (/view\s*details/i.test(t) && msg.products?.length === 1) {
        openProductDetailInChat(msg.products[0])
        return
      }
      if (/view\s*cart/i.test(t)) {
        navigate("/bag")
        return
      }
      if (/place\s*order/i.test(t)) {
        if (!getToken()) {
          setBanner("Sign in to use the shopping assistant.")
          return
        }
        setBanner(null)
        const userEntry = { id: crypto.randomUUID(), role: "user", text: t }
        setMessages((m) => [...m, userEntry])
        void (async () => {
          setSending(true)
          try {
            const res = await sendChatMessage({ message: "Place order" })
            appendAssistantMessagesFromChatResponse(res, setMessages, dispatch)
            const items = store.getState().cart.items
            if (items.length > 0) {
              setMessages((m) => [
                ...m,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  text: "Complete your order below.",
                  showCheckoutEmbed: true,
                },
              ])
            }
          } catch (err) {
            const msg =
              err?.response?.data?.message ??
              err?.response?.data?.error ??
              err?.message ??
              "Something went wrong."
            setMessages((m) => [
              ...m,
              { id: crypto.randomUUID(), role: "assistant", text: msg, isError: true },
            ])
          } finally {
            setSending(false)
          }
        })()
        return
      }
      if (/continue\s*shopping/i.test(t)) {
        navigate("/home")
        return
      }
      if (/complete\s*payment/i.test(t)) {
        const payload = msg.checkoutReady
        if (!payload?.razorpayOrderId || !payload?.keyId || !payload?.orderId) {
          setBanner("Payment session missing. Run checkout from the assistant again.")
          return
        }
        void (async () => {
          setRazorpayBusy(true)
          try {
            await openRazorpayFromCheckoutReady(payload, verifyPayment)
            dispatch(clearCart())
            clearCartApi().catch(() => {})
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                text: "Payment successful. Your order is confirmed!",
              },
            ])
          } catch (err) {
            const errMsg =
              err?.response?.data?.message ?? err?.message ?? "Payment could not be completed."
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                text: errMsg,
                isError: true,
              },
            ])
          } finally {
            setRazorpayBusy(false)
          }
        })()
        return
      }
      if (/view\s*order/i.test(t)) {
        navigate("/home")
        return
      }
      setDraft(label)
    },
    [dispatch, navigate, openProductDetailInChat, setBanner, store],
  )

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    if (open) scrollToBottom()
  }, [messages, open, sending, scrollToBottom])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    if (!getToken()) {
      setBanner("Sign in to use the shopping assistant.")
      return
    }
    setBanner(null)
    setDraft("")
    const userEntry = { id: crypto.randomUUID(), role: "user", text }
    setMessages((m) => [...m, userEntry])
    setSending(true)
    try {
      const body = { message: text }
      const pid = productId.trim()
      if (pid) body.productId = pid
      const q = quantity.trim()
      if (q !== "" && !Number.isNaN(Number(q))) body.quantity = Number(q)
      const oid = orderId.trim()
      if (oid) body.orderId = oid
      const ship = shippingAddressRaw.trim()
      if (ship) {
        try {
          body.shippingAddress = JSON.parse(ship)
        } catch {
          body.shippingAddress = ship
        }
      }

      const res = await sendChatMessage(body)
      appendAssistantMessagesFromChatResponse(res, setMessages, dispatch)
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        "Something went wrong."
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: msg, isError: true },
      ])
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Shopping assistant"
          className="flex w-[min(100vw-2rem,440px)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 bg-neutral-900 px-4 py-3 text-white">
            <p className="text-sm font-semibold tracking-tight">Assistant</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 hover:bg-white/10"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={listRef}
            className="max-h-[min(52vh,420px)] min-h-[200px] space-y-3 overflow-y-auto px-3 py-3"
          >
            {messages.length === 0 && (
              <p className="text-sm text-neutral-500">
                Ask about products, your cart, checkout, or order status — one message routes to the
                right agent automatically.
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
                    msg.role === "user"
                      ? "bg-neutral-900 text-white whitespace-pre-wrap"
                      : msg.isError
                        ? "border border-red-200 bg-red-50 text-red-900 whitespace-pre-wrap"
                        : "border border-neutral-100 bg-neutral-50 text-neutral-800"
                  }`}
                >
                  {msg.text ? <p className="whitespace-pre-wrap">{msg.text}</p> : null}
                  {msg.role === "assistant" && msg.productDetail && (
                    <ChatProductDetailPanel product={msg.productDetail} onAddToCart={handleChatAddToCart} />
                  )}
                  {msg.role === "assistant" && Array.isArray(msg.cartItems) && (
                    <ChatCartPanel items={msg.cartItems} totalPrice={msg.cartTotal} />
                  )}
                  {msg.role === "assistant" && msg.showCheckoutEmbed && (
                    <ChatCheckoutEmbed
                      onSuccess={(successText) => {
                        setMessages((m) => [
                          ...m,
                          {
                            id: crypto.randomUUID(),
                            role: "assistant",
                            text: successText,
                          },
                        ])
                      }}
                    />
                  )}
                  {msg.role === "assistant" && msg.products?.length > 0 && (
                    <div className="mt-2 max-h-[min(40vh,320px)] space-y-2 overflow-y-auto pr-0.5">
                      {msg.products.map((p) => (
                        <ChatProductCard
                          key={p._id ?? p.id}
                          product={p}
                          loadingId={detailLoadingId}
                          onSelect={openProductDetailInChat}
                        />
                      ))}
                    </div>
                  )}
                  {msg.role === "assistant" && msg.suggestions?.length > 0 && (
                    <AssistantSuggestionChips
                      suggestions={msg.suggestions}
                      msg={msg}
                      detailLoadingId={detailLoadingId}
                      onPick={handleSuggestionPick}
                      disabledAll={razorpayBusy}
                    />
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <p className="text-xs text-neutral-400" aria-live="polite">
                Thinking…
              </p>
            )}
          </div>

          {banner && (
            <div className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {banner}{" "}
              <Link to="/login" className="font-medium underline">
                Sign in
              </Link>
            </div>
          )}


          <div className="border-t border-neutral-100 p-3">
            <div className="flex gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                placeholder="e.g. Show me laptops under 50000"
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                disabled={sending}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !draft.trim()}
                className="shrink-0 self-end rounded-xl bg-neutral-900 px-3 py-2 text-white hover:bg-neutral-800 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            {!getToken() && (
              <p className="mt-2 text-xs text-neutral-500">
                <Link to="/login" className="font-medium text-neutral-800 underline">
                  Sign in
                </Link>{" "}
                to send messages.
              </p>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          setBanner(null)
        }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg hover:bg-neutral-800"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close assistant" : "Open assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  )
}
