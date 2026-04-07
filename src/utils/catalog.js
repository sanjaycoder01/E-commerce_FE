/** Shared product / category helpers for catalog views. */

export const PRODUCTS_PER_PAGE = 8
export const DEFAULT_CATEGORY_LABEL = "Category"

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i

/** Pull an array of product records from varying API envelope shapes. */
export function extractProductList(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.products)) return payload.products
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.data?.products)) return payload.data.products
  if (Array.isArray(payload.result)) return payload.result
  if (Array.isArray(payload.items)) return payload.items
  return []
}

export function normalizeProduct(raw) {
  const p = raw?.product || raw
  if (!p) return null

  const cat = p.category ?? p.subcategory ?? p.type
  let category = ""
  let categoryId = null

  if (cat != null && typeof cat === "object") {
    categoryId = cat._id ?? cat.id ?? null
    category = cat.name ?? cat.categoryName ?? cat.title ?? ""
  } else if (typeof cat === "string") {
    category = cat
    if (OBJECT_ID_RE.test(cat.trim())) categoryId = cat.trim()
  }

  return {
    id: p._id ?? p.id,
    name: p.name ?? p.title ?? p.productName ?? "Product",
    price: p.price ?? p.priceAmount ?? 0,
    image: p.image ?? p.img ?? p.imageUrl ?? p.thumbnail ?? "",
    category,
    categoryId,
  }
}

/** Axios response → display string (supports `{ data: "Electronics" }`). */
export function parseCategoryNameFromApi(res) {
  const d = res?.data
  if (typeof d === "string") return d
  if (typeof d?.data === "string") return d.data
  if (d?.name) return d.name
  if (d?.categoryName) return d.categoryName
  if (d?.data && typeof d.data === "object" && d.data?.name) return d.data.name
  return ""
}

export function categoryKeyFromId(id) {
  return `id:${id}`
}

export function productMatchesCategoryKey(product, key) {
  if (key == null) return true
  if (key.startsWith("id:")) return product.categoryId === key.slice(3)
  return product.category === key
}

export function formatPrice(value) {
  if (typeof value === "number" && !Number.isNaN(value)) return value.toFixed(2)
  return String(value ?? "")
}

/** Stable fingerprint of category sources on the current product list (for cache invalidation). */
export function makeCategorySourcesKey(products) {
  if (!products?.length) return ""
  const ids = [...new Set(products.map((p) => p.categoryId).filter(Boolean))]
  if (ids.length > 0) {
    ids.sort()
    return `ids:${ids.join("|")}`
  }
  const labels = [...new Set(products.map((p) => p.category).filter(Boolean))]
  labels.sort()
  return `labels:${labels.join("|")}`
}

/** In-memory id → label cache so repeated opens / partial list changes avoid redundant HTTP. */
const categoryLabelById = new Map()

/** Build dropdown rows; resolves labels via GET /category/getcategoryname/:id when ids exist. */
export async function fetchCategoryRows(products, getCategoryById) {
  const fallbackLabels = [...new Set(products.map((p) => p.category).filter(Boolean))]
  const ids = [...new Set(products.map((p) => p.categoryId).filter(Boolean))]

  if (ids.length === 0) {
    return {
      rows: fallbackLabels.map((label) => ({ key: label, label })),
      error: null,
    }
  }

  try {
    const results = await Promise.all(
      ids.map(async (id) => {
        if (categoryLabelById.has(id)) {
          const label = categoryLabelById.get(id)
          return { key: categoryKeyFromId(id), id, label }
        }
        try {
          const res = await getCategoryById(id)
          const label = parseCategoryNameFromApi(res) || id
          categoryLabelById.set(id, label)
          return { key: categoryKeyFromId(id), id, label }
        } catch {
          categoryLabelById.set(id, id)
          return { key: categoryKeyFromId(id), id, label: id }
        }
      }),
    )

    const byKey = new Map(results.map((r) => [r.key, r]))
    for (const p of products) {
      if (p.categoryId && p.category && !byKey.has(categoryKeyFromId(p.categoryId))) {
        byKey.set(categoryKeyFromId(p.categoryId), {
          key: categoryKeyFromId(p.categoryId),
          id: p.categoryId,
          label: p.category,
        })
      }
    }
    return { rows: [...byKey.values()], error: null }
  } catch (e) {
    return {
      rows: fallbackLabels.map((label) => ({ key: label, label })),
      error: e?.message ?? "Could not load categories",
    }
  }
}
