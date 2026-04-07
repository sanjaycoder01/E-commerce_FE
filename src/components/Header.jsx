import { useEffect, useState } from "react"
import { Menu, ShoppingBag, User, Package } from "lucide-react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectUser } from "../store/userSlice"
import ProfileModal from "./ProfileModal"
import OrdersModal from "./OrdersModal"
import SearchOverlay from "./SearchOverlay"
import { getProfile } from "../services/api"

export default function Header() {
  const user = useSelector(selectUser)
  const [profileOpen, setProfileOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    getProfile()
      .then((res) => {
        const data = res?.data?.data?.user
        setProfile(data)
      })
      .catch(() => {})
  }, [])
  return (
    <header className="bg-white border-b border-neutral-200">
      {/* Top bar: logo, menu, search, profile, bag */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-2 -ml-2 rounded hover:bg-neutral-100"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 text-neutral-800" strokeWidth={1.5} />
          </button>
          <Link to="/home" className="font-semibold text-neutral-900 tracking-tight text-lg">
            {profile?.name ?? user?.name}
          </Link>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-neutral-700">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hover:text-neutral-900"
          >
            SEARCH
          </button>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-1 rounded p-2 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            aria-label="Profile"
          >
            <User className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => setOrdersOpen(true)}
            className="flex items-center gap-1 rounded p-2 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            aria-label="Orders"
          >
            <Package className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <Link to="/bag" className="flex items-center gap-1 hover:text-neutral-900">
            <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
            <span className="sr-only md:not-sr-only">BAG</span>
          </Link>
        </div>
      </div>
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
      <OrdersModal isOpen={ordersOpen} onClose={() => setOrdersOpen(false)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      {/* Main nav: category pills */}

    </header>
  )
}
