import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import { X } from "lucide-react"
import { getProfile, updateProfile, logout as logoutApi, setToken } from "../services/api"
import { clearUser } from "../store/userSlice"
import { clearCart } from "../store/cartSlice"

function getInitials(name) {
  if (!name || typeof name !== "string") return "?"
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

const emptyAddress = () => ({
  fullName: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
  country: "",
})

function parseProfile(res) {
  const data = res?.data?.data ?? res?.data
  const user = data?.user ?? data
  return typeof user === "object" && user !== null ? user : null
}

export default function ProfileModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState(null)

  const handleLogout = () => {
    setLoggingOut(true)
    logoutApi()
      .catch(() => {})
      .finally(() => {
        setToken(null)
        dispatch(clearUser())
        dispatch(clearCart())
        setLoggingOut(false)
        onClose()
        navigate("/login")
      })
  }

  // Editable form state (only updatable fields)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [addresses, setAddresses] = useState([emptyAddress()])

  const loadProfile = useCallback(() => {
    setLoading(true)
    setError(null)
    getProfile()
      .then((res) => {
        const user = parseProfile(res)
        setProfile(user)
        if (user) {
          setName(user.name ?? "")
          setEmail(user.email ?? "")
          setPhone(user.phone ?? "")
          const addrs = user.addresses?.length ? user.addresses : [emptyAddress()]
          setAddresses(addrs.map((a) => ({ ...emptyAddress(), ...a })))
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? "Failed to load profile")
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isOpen) {
      setProfile(null)
      setAddresses([emptyAddress()])
      loadProfile()
    }
  }, [isOpen, loadProfile])

  const handleAddressChange = (index, field, value) => {
    setAddresses((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleAddAddress = () => {
    setAddresses((prev) => [...prev, emptyAddress()])
  }

  const handleRemoveAddress = (index) => {
    if (addresses.length <= 1) return
    setAddresses((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const payload = {
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      addresses: addresses.map((a) => ({
        fullName: a.fullName?.trim(),
        phone: a.phone?.trim(),
        street: a.street?.trim(),
        city: a.city?.trim(),
        state: a.state?.trim(),
        pincode: a.pincode?.trim(),
        country: a.country?.trim(),
      })),
    }
    updateProfile(payload)
      .then((res) => {
        const updated = parseProfile(res)
        if (updated) setProfile(updated)
        onClose()
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? "Failed to update profile")
      })
      .finally(() => setSaving(false))
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl ring-1 ring-neutral-200">
        <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-neutral-100">
          <h2 id="profile-modal-title" className="text-lg font-semibold text-neutral-900">
            Profile
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="h-16 w-16 animate-pulse rounded-full bg-neutral-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-neutral-200" />
              <div className="h-3 w-48 animate-pulse rounded bg-neutral-100" />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          {!loading && profile && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar + read-only meta */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-900 text-2xl font-semibold text-white">
                  {getInitials(name || profile?.name)}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500">
                  {profile.role && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 font-medium text-neutral-600">
                      {profile.role}
                    </span>
                  )}
                  {profile.isVerified !== undefined && (
                    <span className={profile.isVerified ? "text-emerald-600" : "text-amber-600"}>
                      {profile.isVerified ? "Verified" : "Unverified"}
                    </span>
                  )}
                </div>
              </div>

              {/* Editable: Name, Email, Phone */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Basic info
                </h3>
                <div className="grid gap-4 sm:grid-cols-1">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-500">Name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                      placeholder="Your name"
                    />
                  </label>
                  {/* <label className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-500">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                      placeholder="you@example.com"
                    />
                  </label> */}
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-500">Phone</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                      placeholder="Phone number"
                    />
                  </label>
                </div>
              </div>

              {/* Addresses */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                    Addresses
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddAddress}
                    className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
                  >
                    + Add address
                  </button>
                </div>
                {addresses.map((addr, index) => (
                  <fieldset
                    key={index}
                    className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-neutral-500">Address {index + 1}</span>
                      {addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAddress(index)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="sm:col-span-2">
                        <span className="mb-0.5 block text-xs text-neutral-500">Full name</span>
                        <input
                          type="text"
                          value={addr.fullName}
                          onChange={(e) => handleAddressChange(index, "fullName", e.target.value)}
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                          placeholder="Full name"
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block text-xs text-neutral-500">Phone</span>
                        <input
                          type="tel"
                          value={addr.phone}
                          onChange={(e) => handleAddressChange(index, "phone", e.target.value)}
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                          placeholder="Phone"
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="mb-0.5 block text-xs text-neutral-500">Street</span>
                        <input
                          type="text"
                          value={addr.street}
                          onChange={(e) => handleAddressChange(index, "street", e.target.value)}
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                          placeholder="Street address"
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block text-xs text-neutral-500">City</span>
                        <input
                          type="text"
                          value={addr.city}
                          onChange={(e) => handleAddressChange(index, "city", e.target.value)}
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                          placeholder="City"
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block text-xs text-neutral-500">State</span>
                        <input
                          type="text"
                          value={addr.state}
                          onChange={(e) => handleAddressChange(index, "state", e.target.value)}
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                          placeholder="State"
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block text-xs text-neutral-500">Pincode</span>
                        <input
                          type="text"
                          value={addr.pincode}
                          onChange={(e) => handleAddressChange(index, "pincode", e.target.value)}
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                          placeholder="Pincode"
                        />
                      </label>
                      <label>
                        <span className="mb-0.5 block text-xs text-neutral-500">Country</span>
                        <input
                          type="text"
                          value={addr.country}
                          onChange={(e) => handleAddressChange(index, "country", e.target.value)}
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                          placeholder="Country"
                        />
                      </label>
                    </div>
                  </fieldset>
                ))}
              </div>

              {/* Read-only: createdAt / updatedAt */}
              {(profile.createdAt || profile.updatedAt) && (
                <div className="border-t border-neutral-100 pt-4 text-xs text-neutral-400">
                  {profile.createdAt && (
                    <p>Joined {new Date(profile.createdAt).toLocaleDateString()}</p>
                  )}
                  {profile.updatedAt && (
                    <p>Last updated {new Date(profile.updatedAt).toLocaleDateString()}</p>
                  )}
                </div>
              )}

              <div className="sticky bottom-0 flex gap-3 bg-white pt-2 pb-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
