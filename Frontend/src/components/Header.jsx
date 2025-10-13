import { Link, useNavigate } from 'react-router-dom'
import { Brain, User, ChevronDown, LogOut, Settings, Play, PlusCircle, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navigate = useNavigate()
  const profileRef = useRef(null)

  // ✅ Mobile-friendly click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    
    // ✅ Use both mouse and touch events for mobile
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // ✅ Mobile-friendly profile toggle
  const toggleProfile = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsProfileOpen(!isProfileOpen)
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      setToast('Signed out successfully')
      setTimeout(() => setToast(''), 3000)
      navigate('/')
      setIsProfileOpen(false)
    } catch (error) {
      console.error('Logout failed:', error)
      setToast('Sign out failed')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setIsLoggingOut(false)
    }
  }

  // ✅ Mobile-friendly link handler
  const handleLinkClick = (path) => {
    setIsProfileOpen(false)
    navigate(path)
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="font-medium text-sm">{toast}</span>
          </div>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2.5 group"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                <Brain size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Deductive
              </span>
            </Link>

            {/* Center Navigation */}
            {user && (
              <nav className="hidden md:flex items-center gap-2">
                <Link 
                  to="/play"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/80 transition-all duration-200 group"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Play size={18} className="group-hover:scale-110 transition-transform duration-200" />
                  <span>Play</span>
                </Link>
                <Link 
                  to="/editor-test"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50/80 transition-all duration-200 group"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <PlusCircle size={18} className="group-hover:scale-110 transition-transform duration-200" />
                  <span>Create</span>
                </Link>
              </nav>
            )}

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* Desktop Profile Menu */}
                  <div className="hidden md:block relative" ref={profileRef}>
                    <button
                      onClick={toggleProfile}
                      onTouchStart={() => {}} // ✅ Enable touch events on iOS
                      className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-gray-50/80 transition-all duration-200 group cursor-pointer"
                      style={{ 
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center ring-2 ring-white shadow-sm">
                        <span className="text-sm font-bold text-white">
                          {user.username?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        {user.username}
                      </span>
                      <ChevronDown 
                        size={16} 
                        className={`text-gray-400 transition-all duration-200 ${
                          isProfileOpen ? 'rotate-180 text-gray-600' : 'group-hover:text-gray-600'
                        }`} 
                      />
                    </button>

                    {/* Dropdown */}
                    {isProfileOpen && (
                      <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 py-2 animate-in slide-in-from-top-2 fade-in duration-200 z-[60]">
                        {/* User Info Header */}
                        <div className="px-6 py-4 border-b border-gray-100/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                              <span className="text-sm font-bold text-white">
                                {user.username?.[0]?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">{user.username}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="py-2">
                          <Link
                            to="/profile"
                            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-indigo-50/80 hover:text-indigo-600 transition-all duration-200 cursor-pointer"
                            onClick={() => setIsProfileOpen(false)}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                          >
                            <User size={18} />
                            <span>Your Profile</span>
                          </Link>

                          {(user.role === 'admin' || user.role === 'moderator') && (
                            <Link
                              to="/admin/review"
                              className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50/80 hover:text-purple-600 transition-all duration-200 cursor-pointer"
                              onClick={() => setIsProfileOpen(false)}
                              style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                              <Settings size={18} />
                              <span>Admin Panel</span>
                            </Link>
                          )}
                        </div>

                        {/* Logout - Desktop */}
                        <div className="border-t border-gray-100/50 pt-2 pb-2">
                          <button
                            onClick={handleLogout}
                            onTouchStart={() => {}} // ✅ Enable touch events
                            disabled={isLoggingOut}
                            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-red-600 hover:bg-red-50/80 transition-all duration-200 w-full text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group relative overflow-hidden"
                            style={{ 
                              WebkitTapHighlightColor: 'transparent',
                              touchAction: 'manipulation'
                            }}
                          >
                            {isLoggingOut ? (
                              <Loader2 size={18} className="animate-spin text-red-500" />
                            ) : (
                              <LogOut size={18} className="group-hover:scale-110 transition-transform duration-200" />
                            )}
                            
                            <span className={`transition-all duration-200 ${isLoggingOut ? 'text-red-500' : ''}`}>
                              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                            </span>
                            
                            {isLoggingOut && (
                              <div className="absolute inset-0 bg-gradient-to-r from-red-50/0 via-red-50/50 to-red-50/0 animate-pulse"></div>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Profile Button */}
                  <div className="md:hidden">
                    <button
                      onClick={toggleProfile}
                      onTouchStart={() => {}} // ✅ Critical for iOS
                      className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center ring-2 ring-white shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
                      style={{ 
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
                    >
                      <span className="text-sm font-bold text-white">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link 
                    to="/login"
                    className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50/80 transition-all duration-200"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    Sign In
                  </Link>
                  <Link 
                    to="/signup"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
                      Get Started
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          {user && isProfileOpen && (
            <div className="md:hidden border-t border-gray-100/50 bg-white/50 backdrop-blur-sm">
              <div className="py-4 space-y-1">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100/50 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Navigation Links - ✅ Mobile optimized */}
                <button 
                  onClick={() => handleLinkClick('/play')}
                  onTouchStart={() => {}}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 active:bg-indigo-50/80 active:text-indigo-600 transition-all duration-200 rounded-2xl mx-2 w-full text-left cursor-pointer"
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <Play size={18} />
                  <span>Play</span>
                </button>

                <button 
                  onClick={() => handleLinkClick('/editor-test')}
                  onTouchStart={() => {}}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 active:bg-purple-50/80 active:text-purple-600 transition-all duration-200 rounded-2xl mx-2 w-full text-left cursor-pointer"
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <PlusCircle size={18} />
                  <span>Create</span>
                </button>

                <button 
                  onClick={() => handleLinkClick('/profile')}
                  onTouchStart={() => {}}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 active:bg-gray-50/80 active:text-gray-900 transition-all duration-200 rounded-2xl mx-2 w-full text-left cursor-pointer"
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <User size={18} />
                  <span>Profile</span>
                </button>

                {(user.role === 'admin' || user.role === 'moderator') && (
                  <button 
                    onClick={() => handleLinkClick('/admin/review')}
                    onTouchStart={() => {}}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 active:bg-gray-50/80 active:text-gray-900 transition-all duration-200 rounded-2xl mx-2 w-full text-left cursor-pointer"
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    <Settings size={18} />
                    <span>Admin Panel</span>
                  </button>
                )}

                {/* Logout - Mobile */}
                <div className="border-t border-gray-100/50 mt-3 pt-3">
                  <button
                    onClick={handleLogout}
                    onTouchStart={() => {}}
                    disabled={isLoggingOut}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 active:bg-red-50/80 transition-all duration-200 rounded-2xl mx-2 w-full text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group relative overflow-hidden"
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    {isLoggingOut ? (
                      <Loader2 size={18} className="animate-spin text-red-500" />
                    ) : (
                      <LogOut size={18} className="group-hover:scale-110 transition-transform duration-200" />
                    )}
                    
                    <span className={`transition-all duration-200 ${isLoggingOut ? 'text-red-500' : ''}`}>
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </span>
                    
                    {isLoggingOut && (
                      <div className="absolute inset-0 bg-gradient-to-r from-red-50/0 via-red-50/50 to-red-50/0 animate-pulse"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  )
}
