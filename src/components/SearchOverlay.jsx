import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X } from "lucide-react"
import { searchProducts } from "../services/api"
import { pickPrimaryImage } from "../utils/catalog"

function parseSearchResults(res) {
  const data = res?.data?.data ?? res?.data ?? res
  const list = Array.isArray(data) ? data : data?.products ?? []
  return Array.isArray(list) ? list : []
}

function normalizeProduct(p) {
  if (!p || typeof p !== "object") return null
  return {
    id: p._id ?? p.id,
    name: p.name ?? p.title ?? p.productName ?? "Product",
    price: p.price ?? p.priceAmount ?? 0,
    image: pickPrimaryImage(p),
    category: p.category ?? p.subcategory ?? p.type ?? "",
  }
}

export default function SearchOverlay({ isOpen, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState("")
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setProducts([])
      setSearched(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      setProducts([])
      setSearched(false)
      return
    }
    const t = setTimeout(() => {
      setLoading(true)
      setSearched(true)
      searchProducts(query)
        .then((res) => setProducts(parseSearchResults(res).map(normalizeProduct).filter(Boolean)))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const handleSelectProduct = (id) => {
    onClose()
    navigate(`/product/${id}`)
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl">
        <div className="rounded-2xl bg-white shadow-xl ring-1 ring-neutral-200 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
            <Search className="h-5 w-5 text-neutral-400 shrink-0" strokeWidth={1.5} />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="flex-1 min-w-0 bg-transparent text-neutral-900 placeholder-neutral-400 outline-none text-base"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Close search"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin" />
              </div>
            )}
            {!loading && searched && query.trim() && products.length === 0 && (
              <p className="py-8 text-center text-neutral-500">No products found.</p>
            )}
            {!loading && products.length > 0 && (
              <ul className="py-2">
                {products.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectProduct(product.id)}
                      className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-neutral-200 overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-neutral-400 text-xs">
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-neutral-900 truncate">{product.name}</p>
                        {product.category && (
                          <p className="text-xs text-neutral-500 uppercase tracking-wide truncate">
                            {product.category}
                          </p>
                        )}
                        <p className="text-sm font-medium text-neutral-700 mt-0.5">
                          ${typeof product.price === "number" ? product.price.toFixed(2) : product.price}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
