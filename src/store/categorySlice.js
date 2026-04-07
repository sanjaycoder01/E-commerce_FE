import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { getCategoryById } from "../services/api"
import { DEFAULT_CATEGORY_LABEL, fetchCategoryRows, makeCategorySourcesKey } from "../utils/catalog"

const initialState = {
  rows: [],
  loading: false,
  error: null,
  selectedKey: null,
  buttonLabel: DEFAULT_CATEGORY_LABEL,
  /** When this matches `makeCategorySourcesKey(products)`, rows are fresh for that catalog. */
  lastSourcesKey: null,
}

export const loadCategories = createAsyncThunk(
  "categories/load",
  async (products, { rejectWithValue }) => {
    try {
      const result = await fetchCategoryRows(products, getCategoryById)
      return {
        ...result,
        sourcesKey: makeCategorySourcesKey(products),
      }
    } catch (e) {
      return rejectWithValue(e?.message ?? "Failed to load categories")
    }
  },
  {
    condition: (products, { getState }) => {
      const key = makeCategorySourcesKey(products)
      const c = getState().categories
      if (c.lastSourcesKey === key && c.rows.length > 0) return false
      return true
    },
  },
)

export const categorySlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    chooseCategory: (state, action) => {
      const row = action.payload
      const key = row.key ?? row.label
      const clearing = state.selectedKey === key
      if (clearing) {
        state.selectedKey = null
        state.buttonLabel = DEFAULT_CATEGORY_LABEL
      } else {
        state.selectedKey = key
        state.buttonLabel = row.label ?? String(row.key ?? DEFAULT_CATEGORY_LABEL)
      }
    },
    clearCategoryFilter: (state) => {
      state.selectedKey = null
      state.buttonLabel = DEFAULT_CATEGORY_LABEL
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCategories.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadCategories.fulfilled, (state, action) => {
        state.loading = false
        state.rows = action.payload.rows
        state.error = action.payload.error
        state.lastSourcesKey = action.payload.sourcesKey
      })
      .addCase(loadCategories.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? action.error?.message ?? "Failed to load categories"
      })
  },
})

export const { chooseCategory, clearCategoryFilter } = categorySlice.actions

export const selectCategoryRows = (state) => state.categories.rows
export const selectCategoriesLoading = (state) => state.categories.loading
export const selectCategoriesError = (state) => state.categories.error
export const selectSelectedCategoryKey = (state) => state.categories.selectedKey
export const selectCategoryButtonLabel = (state) => state.categories.buttonLabel

export default categorySlice.reducer
