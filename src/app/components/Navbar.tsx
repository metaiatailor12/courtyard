import { Link, useNavigate, useLocation } from 'react-router';
import { LogOut, User, LayoutDashboard, Settings, Calendar, CreditCard, Phone, Menu, X, MessageSquare, Mail, Image } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { NotificationCenter } from './NotificationCenter';
import { useState } from 'react';
import courtyardLogo from '../../assets/courtyard-logo.png';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isAdmin = user?.role === 'admin';
  const isUser = user?.role === 'user';
  const isVerifiedUser = isUser && user?.emailVerified === true;

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to={user ? (isAdmin ? '/admin/dashboard' : isVerifiedUser ? '/user/home' : '/') : '/'} className="flex items-center gap-2">
            <img
              src={courtyardLogo}
              alt="TheCourtyard logo"
              className="w-10 h-10 object-contain"
            />
            <div className="text-2xl font-bold bg-gradient-to-r from-green-900 to-green-800 bg-clip-text text-transparent">
              thecourtyard
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
            {/* User Navigation */}
            {!isAdmin && (
              <>
                <Link
                  to={isVerifiedUser ? '/user/home' : '/'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActivePath('/') || (isVerifiedUser && isActivePath('/user/home')) ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/contact"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActivePath('/contact') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Contact
                </Link>
                {isVerifiedUser && (
                  <>
                    <Link
                      to="/user/photos"
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isActivePath('/user/photos') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Image className="w-4 h-4" />
                      Photos
                    </Link>
                    <Link
                      to="/user/booking"
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isActivePath('/user/booking') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      Book Court
                    </Link>
                    <Link
                      to="/user/subscription"
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isActivePath('/user/subscription') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      Subscription
                    </Link>
                    <Link
                      to="/user/profile"
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isActivePath('/user/profile') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                  </>
                )}
              </>
            )}

            {/* Admin Navigation */}
            {isAdmin && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActivePath('/admin/dashboard') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/admin/bookings"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActivePath('/admin/bookings') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Bookings
                </Link>
                <Link
                  to="/admin/settings"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActivePath('/admin/settings') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <Link
                  to="/admin/reviews"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActivePath('/admin/reviews') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Reviews
                </Link>
                <Link
                  to="/admin/messages"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActivePath('/admin/messages') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Messages
                </Link>
                
                {/* Notification Center for Admin */}
                {user && <NotificationCenter />}
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-red-50 text-red-600 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            )}
            
            {/* Notification Center for Users */}
            {!isAdmin && isVerifiedUser && <NotificationCenter />}
            {!isAdmin && isUser && !isVerifiedUser && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-red-50 text-red-600 font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>

          {/* Right side - Mobile Menu Button and Notification Center */}
          <div className="flex items-center gap-2 lg:hidden">
            {isAdmin || isVerifiedUser ? <NotificationCenter /> : null}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-100 pt-4">
            <div className="flex flex-col gap-2">
              {!isAdmin && (
                <>
                  <Link
                    to={isVerifiedUser ? '/user/home' : '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      isActivePath('/') || (isVerifiedUser && isActivePath('/user/home')) ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      isActivePath('/contact') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    Contact
                  </Link>
                  {isVerifiedUser && (
                    <>
                      <Link
                        to="/user/photos"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                          isActivePath('/user/photos') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Image className="w-4 h-4" />
                        Photos
                      </Link>
                      <Link
                        to="/user/booking"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                          isActivePath('/user/booking') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        Book Court
                      </Link>
                      <Link
                        to="/user/subscription"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                          isActivePath('/user/subscription') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Subscription
                      </Link>
                      <Link
                        to="/user/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                          isActivePath('/user/profile') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </>
                  )}
                  {!user && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        navigate('/user/subscription');
                        setMobileMenuOpen(false);
                      }}
                      className="mt-2 bg-gradient-to-r from-green-900 to-green-800"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </Button>
                  )}
                </>
              )}

              {isAdmin && (
                <>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      isActivePath('/admin/dashboard') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <Link
                    to="/admin/bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      isActivePath('/admin/bookings') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Bookings
                  </Link>
                  <Link
                    to="/admin/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      isActivePath('/admin/settings') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <Link
                    to="/admin/reviews"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      isActivePath('/admin/reviews') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Reviews
                  </Link>
                  <Link
                    to="/admin/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      isActivePath('/admin/messages') ? 'bg-emerald-50 text-[#10b981] font-medium' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Messages
                  </Link>
                </>
              )}

              {user && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 px-4 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-900 to-green-800 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{user?.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full text-red-500 hover:bg-red-50 justify-start px-4"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
