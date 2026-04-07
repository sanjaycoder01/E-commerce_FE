import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-dom"
import { getAllProducts, getProductsByCategory } from "../services/api"
import {
  chooseCategory,
  clearCategoryFilter,
  loadCategories,
  selectCategoriesError,
  selectCategoriesLoading,
  selectCategoryButtonLabel,
  selectCategoryRows,
  selectSelectedCategoryKey,
} from "../store/categorySlice"
import {
  DEFAULT_CATEGORY_LABEL,
  PRODUCTS_PER_PAGE,
  extractProductList,
  formatPrice,
  normalizeProduct,
} from "../utils/catalog"
import Header from "./Header"

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square bg-neutral-200 rounded" />
          <div className="h-4 bg-neutral-200 rounded mt-3 w-3/4" />
          <div className="h-3 bg-neutral-200 rounded mt-2 w-1/2" />
        </div>
      ))}
    </div>
  )
}

function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.id}`} className="group block">
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
        <h3 className="font-semibold text-neutral-900 text-base leading-tight">{product.name}</h3>
        <p className="text-neutral-800 font-medium mt-1">${formatPrice(product.price)}</p>
        {product.category && (
          <p className="text-xs text-neutral-500 mt-0.5 uppercase tracking-wide">{product.category}</p>
        )}
      </article>
    </Link>
  )
}

function CategoryMenu({
  open,
  onToggle,
  buttonLabel,
  rows,
  loading,
  listError,
  selectedKey,
  onSelectRow,
}) {
  return (
    <div className="relative min-w-[200px]">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Sort By</p>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 w-full text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">{buttonLabel}</span>
        <span className="text-neutral-400 text-xs shrink-0" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded border border-neutral-200 bg-white shadow-lg max-h-64 overflow-y-auto py-1">
          {loading && <p className="px-3 py-2 text-sm text-neutral-500">Loading categories…</p>}
          {listError && !loading && <p className="px-3 py-2 text-sm text-amber-700">{listError}</p>}
          {!loading &&
            rows.map((row) => {
              const key = row.key ?? row.label
              const active = selectedKey === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectRow(row)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${
                    active ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-800"
                  }`}
                >
                  {row.label}
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const dispatch = useDispatch()
  const categoryRows = useSelector(selectCategoryRows)
  const categoriesLoading = useSelector(selectCategoriesLoading)
  const categoriesError = useSelector(selectCategoriesError)
  const selectedCategoryKey = useSelector(selectSelectedCategoryKey)
  const categoryButtonLabel = useSelector(selectCategoryButtonLabel)

  const [allProducts, setAllProducts] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterLoading, setFilterLoading] = useState(false)
  const [filterError, setFilterError] = useState(null)
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false)
  const [displayCount, setDisplayCount] = useState(PRODUCTS_PER_PAGE)
  const allProductsRef = useRef([])
  allProductsRef.current = allProducts

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getAllProducts()
      .then((res) => {
        if (cancelled) return
        const list = extractProductList(res?.data)
        const normalized = list.map(normalizeProduct).filter(Boolean)
        setAllProducts(normalized)
        setProducts(normalized)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load products")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (selectedCategoryKey != null) return
    setProducts(allProducts)
    setFilterError(null)
    setFilterLoading(false)
  }, [allProducts, selectedCategoryKey])

  useEffect(() => {
    if (selectedCategoryKey == null) return

    const name =
      categoryButtonLabel && categoryButtonLabel !== DEFAULT_CATEGORY_LABEL
        ? categoryButtonLabel
        : null
    if (!name) return

    let cancelled = false
    setFilterLoading(true)
    setFilterError(null)

    getProductsByCategory(name)
      .then((res) => {
        if (cancelled) return
        const list = extractProductList(res?.data)
        setProducts(list.map(normalizeProduct).filter(Boolean))
      })
      .catch((err) => {
        if (!cancelled) {
          setFilterError(err?.message ?? "Failed to load products for this category")
          setProducts(allProductsRef.current)
        }
      })
      .finally(() => {
        if (!cancelled) setFilterLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedCategoryKey, categoryButtonLabel])

  const displayed = useMemo(() => products.slice(0, displayCount), [products, displayCount])

  const total = products.length
  const hasMore = displayCount < total

  const toggleCategoryMenu = useCallback(() => {
    setCategoryMenuOpen((open) => {
      const next = !open
      if (next) dispatch(loadCategories(allProducts))
      return next
    })
  }, [dispatch, allProducts])

  const onSelectCategoryRow = useCallback(
    (row) => {
      dispatch(chooseCategory(row))
      setCategoryMenuOpen(false)
      setDisplayCount(PRODUCTS_PER_PAGE)
    },
    [dispatch],
  )

  const resetFilters = useCallback(() => {
    dispatch(clearCategoryFilter())
    setDisplayCount(PRODUCTS_PER_PAGE)
    setFilterError(null)
    setProducts(allProducts)
  }, [dispatch, allProducts])

  const showMore = useCallback(() => {
    setDisplayCount((c) => c + PRODUCTS_PER_PAGE)
  }, [])

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pb-12">
        <section className="py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight">
            DECORATE YOUR LIFE WITH ARTS
          </h1>
        </section>

        <section className="flex flex-col gap-4 py-4 border-y border-neutral-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <CategoryMenu
                open={categoryMenuOpen}
                onToggle={toggleCategoryMenu}
                buttonLabel={categoryButtonLabel}
                rows={categoryRows}
                loading={categoriesLoading}
                listError={categoriesError}
                selectedKey={selectedCategoryKey}
                onSelectRow={onSelectCategoryRow}
              />
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                className="rounded bg-neutral-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-neutral-800"
              >
                Filter & sort
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-neutral-500 hover:text-neutral-700 underline"
              >
                RESET FILTERS
              </button>
            </div>
          </div>
        </section>

        <section className="pt-8">
          {loading && <ProductGridSkeleton />}
          {error && <p className="text-red-600 py-8">{error}</p>}
          {!loading && !error && (
            <>
              <div className={`relative ${filterLoading ? "opacity-60 pointer-events-none" : ""}`}>
                {filterLoading && (
                  <p className="absolute inset-x-0 -top-7 text-sm text-neutral-500 z-10">
                    Loading products…
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {displayed.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
              {filterError && (
                <p className="text-amber-800 text-sm mt-4" role="alert">
                  {filterError}
                </p>
              )}
              <div className="flex flex-col items-center gap-2 mt-10">
                {hasMore && (
                  <button
                    type="button"
                    onClick={showMore}
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
