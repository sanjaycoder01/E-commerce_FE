import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { getAllProducts } from "../services/api"
import Header from "./Header"

const SUB_CATEGORIES = ["All", "Pots", "Plates", "Utensils", "Other"]
const MATERIALS = ["Copper", "Steel", "Glass", "Potter"]
const COLORS = [
  { name: "Brown", hex: "#8B4513" },
  { name: "Light Brown", hex: "#D2691E" },
  { name: "Pink", hex: "#FFB6C1" },
  { name: "Beige", hex: "#F5F5DC" },
]
const SORT_OPTIONS = ["Popularity", "Price: Low to High", "Price: High to Low", "Newest"]
const PRODUCTS_PER_PAGE = 8

function normalizeProduct(raw) {
  const p = raw?.product || raw
  if (!p) return null
  return {
    id: p._id ?? p.id,
    name: p.name ?? p.title ?? p.productName ?? "Product",
    price: p.price ?? p.priceAmount ?? 0,
    image: p.image ?? p.img ?? p.imageUrl ?? p.thumbnail ?? "",
    category: p.category ?? p.subcategory ?? p.type ?? "",
  }
}

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [subCategory, setSubCategory] = useState("All")
  const [material, setMaterial] = useState("Copper")
  const [selectedColor, setSelectedColor] = useState(0)
  const [inStock, setInStock] = useState("Yes")
  const [sortBy, setSortBy] = useState("Popularity")
  const [displayCount, setDisplayCount] = useState(PRODUCTS_PER_PAGE)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getAllProducts()
      .then((res) => {
        if (cancelled) return
        const data = res?.data
        let list = []
        if (Array.isArray(data)) list = data
        else if (Array.isArray(data?.products)) list = data.products
        else if (Array.isArray(data?.data)) list = data.data
        else if (data?.data?.products && Array.isArray(data.data.products)) list = data.data.products
        else if (Array.isArray(data?.result)) list = data.result
        else if (Array.isArray(data?.items)) list = data.items
        const normalized = list.map(normalizeProduct).filter(Boolean)
        setProducts(normalized)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load products")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const displayed = products.slice(0, displayCount)
  const total = products.length
  const hasMore = displayCount < total

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header/>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pb-12">
        {/* Hero */}
        <section className="py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight">
            DECORATE YOUR LIFE WITH ARTS
          </h1>
        </section>

        {/* Filter & sort */}
        <section className="flex flex-col gap-4 py-4 border-y border-neutral-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Materials
                </p>
                <div className="flex flex-wrap gap-2">
                  {MATERIALS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMaterial(m)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        material === m
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "border-neutral-300 text-neutral-700 hover:border-neutral-400"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Colors
                </p>
                <div className="flex gap-2">
                  {COLORS.map((c, i) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(i)}
                      className="w-8 h-8 rounded-full border-2 border-neutral-300 shrink-0 flex items-center justify-center hover:border-neutral-500"
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {selectedColor === i && (
                        <span className="text-white text-sm font-bold drop-shadow">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  In Stock
                </p>
                <div className="flex gap-2">
                  {["Yes", "No"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setInStock(opt)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        inStock === opt
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "border-neutral-300 text-neutral-700"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Sort By
                </p>
                <button
                  type="button"
                  className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  {sortBy}
                </button>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                className="rounded bg-neutral-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-neutral-800"
              >
                Filter & sort
              </button>
              <button type="button" className="text-xs text-neutral-500 hover:text-neutral-700 underline">
                RESET FILTERS
              </button>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="pt-8">
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-neutral-200 rounded" />
                  <div className="h-4 bg-neutral-200 rounded mt-3 w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded mt-2 w-1/2" />
                </div>
              ))}
            </div>
          )}
          {error && (
            <p className="text-red-600 py-8">
              {error}
            </p>
          )}
          {!loading && !error && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {displayed.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="group block"
                  >
                    <article>
                      <div className="aspect-square bg-neutral-200 rounded overflow-hidden mb-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
                            No image
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-neutral-900 text-base leading-tight">
                        {product.name}
                      </h3>
                      <p className="text-neutral-800 font-medium mt-1">
                        ${typeof product.price === "number" ? product.price.toFixed(2) : product.price}
                      </p>
                      {product.category && (
                        <p className="text-xs text-neutral-500 mt-0.5 uppercase tracking-wide">
                          {product.category}
                        </p>
                      )}
                    </article>
                  </Link>
                ))}
              </div>
              <div className="flex flex-col items-center gap-2 mt-10">
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setDisplayCount((c) => c + PRODUCTS_PER_PAGE)}
                    className="text-neutral-900 font-medium hover:underline"
                  >
                    Show More →
                  </button>
                )}
                <p className="text-sm text-neutral-500">
                  Displaying {displayed.length} products out of {total}
                </p>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
