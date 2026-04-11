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
  formatCategoryDisplay,
  formatPrice,
  normalizeProduct,
} from "../utils/catalog"
import Header from "./Header"
import HomeChat from "./HomeChat"

const HERO_SLIDE_COUNT = 3
const HERO_AUTO_MS = 2000

function HeroProductSwiper({ slides }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = slides.length

  useEffect(() => {
    if (n <= 1 || paused) return undefined
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % n)
    }, HERO_AUTO_MS)
    return () => window.clearInterval(id)
  }, [n, paused])

  useEffect(() => {
    setIndex(0)
  }, [slides])

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div
        className="overflow-hidden rounded-sm border border-neutral-200/90 bg-neutral-100 shadow-sm"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="relative aspect-[21/9] min-h-[168px] w-full md:min-h-[240px] lg:aspect-[2.5/1]">
          {slides.map((s, idx) => (
            <Link
              key={s.id}
              to={`/product/${s.id}`}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                idx === index ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
              }`}
              tabIndex={idx === index ? 0 : -1}
              aria-hidden={idx !== index}
            >
              <img src={s.image} alt={s.name} className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <p className="pointer-events-none absolute bottom-10 left-4 right-4 text-left text-sm font-semibold leading-snug text-white drop-shadow-sm line-clamp-2 md:bottom-12 md:text-base">
                {s.name}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {n > 1 && (
        <div
          className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2"
          role="tablist"
          aria-label="Hero slides"
        >
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={idx === index}
              aria-label={`Show product ${idx + 1}`}
              onClick={() => setIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === index ? "w-7 bg-white shadow" : "w-1.5 bg-white/55 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:gap-x-8 md:gap-y-12 lg:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-sm bg-neutral-200" />
          <div className="mx-auto mt-5 h-4 max-w-[85%] rounded bg-neutral-200" />
          <div className="mx-auto mt-3 h-3 w-16 rounded bg-neutral-200" />
        </div>
      ))}
    </div>
  )
}

function ProductCard({ product }) {
  const categoryLine = formatCategoryDisplay(product.category)
  return (
    <Link to={`/product/${product.id}`} className="group block">
      <article className="flex flex-col items-center text-center">
        <div className="aspect-square w-full overflow-hidden rounded-sm border border-neutral-200/90 bg-neutral-100 mb-5 transition-shadow duration-300 group-hover:shadow-md">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
              No image
            </div>
          )}
        </div>
        <h3 className="line-clamp-2 min-h-[2.5rem] max-w-[18rem] text-[15px] font-semibold leading-snug text-neutral-900">
          {product.name}
        </h3>
        <p className="mt-3 text-[15px] font-normal tabular-nums text-neutral-800">${formatPrice(product.price)}</p>
        {categoryLine && (
          <p className="mt-2.5 max-w-full text-[11px] uppercase tracking-[0.14em] text-neutral-400">{categoryLine}</p>
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
    <div className="relative w-full min-w-[min(100%,220px)] sm:min-w-[240px]">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Sort by</p>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-sm border border-neutral-300 bg-white px-4 py-2.5 text-left text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50/80"
      >
        <span className="truncate">{buttonLabel}</span>
        <span className="shrink-0 text-neutral-400" aria-hidden>
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

  const heroSlides = useMemo(() => {
    return allProducts
      .filter((p) => p.image)
      .slice(0, HERO_SLIDE_COUNT)
      .map((p) => ({ id: p.id, image: p.image, name: p.name }))
  }, [allProducts])

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

  const openFilterControls = useCallback(() => {
    setCategoryMenuOpen(true)
    dispatch(loadCategories(allProducts))
  }, [dispatch, allProducts])

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />

      <main className="mx-auto max-w-[1400px] px-5 pb-16 pt-2 sm:px-8 lg:px-10">
        <section className="border-b border-neutral-200/90 py-8 md:py-10 lg:py-12">
          {loading ? (
            <div
              className="mx-auto aspect-[21/9] min-h-[168px] max-w-5xl animate-pulse rounded-sm border border-neutral-200/80 bg-neutral-200 md:min-h-[240px]"
              aria-hidden
            />
          ) : heroSlides.length > 0 ? (
            <HeroProductSwiper slides={heroSlides} />
          ) : (
            <h1 className="mx-auto max-w-4xl text-center text-2xl font-bold uppercase leading-[1.15] tracking-[0.08em] text-neutral-900 sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-tight">
              Decorate your life with arts
            </h1>
          )}
        </section>

        <section className="border-b border-neutral-200/90 py-6 md:py-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-10">
            <div className="w-full max-w-sm flex-1 md:max-w-md">
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
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              <button
                type="button"
                onClick={openFilterControls}
                className="rounded-sm border border-neutral-900 bg-white px-6 py-2.5 text-center text-[13px] font-medium uppercase tracking-[0.12em] text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white sm:min-w-[11rem]"
              >
                Filter &amp; sort
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-800"
              >
                Reset filters
              </button>
            </div>
          </div>
        </section>

        <section className="pt-10 md:pt-12">
          {loading && <ProductGridSkeleton />}
          {error && <p className="text-red-600 py-8">{error}</p>}
          {!loading && !error && (
            <>
              <div className={`relative ${filterLoading ? "opacity-60 pointer-events-none" : ""}`}>
                {filterLoading && (
                  <p className="absolute inset-x-0 -top-8 z-10 text-sm text-neutral-500">Loading products…</p>
                )}
                <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:gap-x-8 md:gap-y-12 lg:grid-cols-4">
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
              <div className="mt-14 flex flex-col items-center gap-4 border-t border-neutral-200/80 pt-10">
                {hasMore && (
                  <button
                    type="button"
                    onClick={showMore}
                    className="text-sm font-medium uppercase tracking-[0.12em] text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-900"
                  >
                    Show more
                  </button>
                )}
                <p className="text-xs uppercase tracking-[0.1em] text-neutral-400">
                  {displayed.length} of {total} products
                </p>
              </div>
            </>
          )}
        </section>
      </main>

      <HomeChat />
    </div>
  )
}
