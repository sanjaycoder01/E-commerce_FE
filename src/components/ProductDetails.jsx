import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import { ArrowLeft } from "lucide-react"
import { getProductById, addCartItem } from "../services/api"
import { addItem } from "../store/cartSlice"
import { pickPrimaryImage } from "../utils/catalog"
import Header from "./Header"

function parseProduct(res) {
  const data = res?.data?.data ?? res?.data
  const product = data?.product ?? data
  return typeof product === "object" && product !== null ? product : null
}

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addingToBag, setAddingToBag] = useState(false)
  const [bagError, setBagError] = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getProductById(id)
      .then((res) => {
        if (!cancelled) setProduct(parseProduct(res))
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? err?.message ?? "Failed to load product")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  const name = product?.name ?? product?.title ?? product?.productName ?? "Product"
  const price = product?.price ?? product?.priceAmount ?? 0
  const image = product ? pickPrimaryImage(product) : ""
  const category = product?.category ?? product?.subcategory ?? product?.type ?? ""
  const description = product?.description ?? product?.desc ?? ""

  const handleAddToBag = () => {
    if (!product || !id) return
    setBagError(null)
    setAddingToBag(true)
    const productId = product._id ?? product.id ?? id
    const productPayload = {
      id: productId,
      name,
      price,
      image,
      category,
    }
    addCartItem(productId, 1)
      .then(() => {
        dispatch(addItem({ productId, quantity: 1, product: productPayload }))
        navigate("/bag")
      })
      .catch((err) => {
        setBagError(err?.response?.data?.message ?? err?.message ?? "Failed to add to bag")
      })
      .finally(() => setAddingToBag(false))
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pb-12">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 mt-6 text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Back to home
        </Link>

        {loading && (
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="aspect-square max-w-xl rounded-2xl bg-neutral-200 animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded bg-neutral-200 animate-pulse" />
              <div className="h-6 w-1/4 rounded bg-neutral-200 animate-pulse" />
              <div className="h-4 w-full rounded bg-neutral-100 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-neutral-100 animate-pulse" />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && product && (
          <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-12">
            {/* Image */}
            <div className="aspect-square max-w-xl w-full rounded-2xl bg-white overflow-hidden border border-neutral-200 shadow-sm">
              {image ? (
                <img
                  src={image}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                  No image
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col">
              {category && (
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2">
                  {category}
                </p>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
                {name}
              </h1>
              <p className="mt-4 text-xl font-semibold text-neutral-900">
                ${typeof price === "number" ? price.toFixed(2) : price}
              </p>
              {description && (
                <p className="mt-6 text-neutral-600 leading-relaxed">
                  {description}
                </p>
              )}
              {bagError && (
                <p className="mt-4 text-sm text-red-600">{bagError}</p>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAddToBag}
                  disabled={addingToBag}
                  className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {addingToBag ? "Adding…" : "Add to bag"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  Save for later
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
