import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Info, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [anchorStyle, setAnchorStyle] = useState<React.CSSProperties | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Compute anchor position for portal dropdown when opened, and update on resize/scroll
  useEffect(() => {
    if (!isOpen) {
      setAnchorStyle(null);
      return;
    }
    const compute = () => {
      setIsSmallScreen(window.innerWidth < 640);
      const btn = buttonRef.current;
      if (!btn) return setAnchorStyle(null);
      const rect = btn.getBoundingClientRect();
      if (window.innerWidth < 640) {
        // full-width top sheet on small screens to avoid clipping
        setAnchorStyle({ position: 'fixed', left: 8, right: 8, top: 64, zIndex: 9999 });
        return;
      }
      const right = Math.max(8, window.innerWidth - rect.right);
      const top = rect.bottom + 8;
      setAnchorStyle({ position: 'fixed', top: `${top}px`, right: `${right}px`, zIndex: 9999, maxWidth: '24rem' });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [isOpen]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-800" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((s) => !s)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              style={anchorStyle || { position: 'fixed', top: '56px', right: '8px', zIndex: 9999 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-[calc(100vw-1rem)] max-w-[24rem] sm:w-96"
            >
              <div className="bg-gradient-to-r from-green-900 to-green-800 p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">Notifications</h3>
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {notifications.length > 0 && (
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                    <button onClick={clearAll} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
                      <Trash2 className="w-3 h-3" />
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              <div className="max-h-[70vh] sm:max-h-[500px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No notifications yet</p>
                    <p className="text-xs mt-1">We'll notify you when something happens</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-green-50/30' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-sm text-gray-800 truncate">{notification.title}</h4>
                              {!notification.read && <div className="w-2 h-2 bg-green-900 rounded-full flex-shrink-0 mt-1.5" />}
                            </div>
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{notification.message}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                              <div className="flex gap-2">
                                {!notification.read && (
                                  <button onClick={() => markAsRead(notification.id)} className="text-xs text-green-900 hover:text-green-950 font-medium">
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => removeNotification(notification.id)} className="text-xs text-gray-400 hover:text-red-500">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {notification.action?.label && typeof notification.action.onClick === 'function' && (
                              <button
                                onClick={() => {
                                  notification.action?.onClick?.();
                                  markAsRead(notification.id);
                                  setIsOpen(false);
                                }}
                                className="mt-2 text-xs bg-green-900 hover:bg-green-950 text-white px-3 py-1 rounded-lg transition-colors"
                              >
                                {notification.action.label}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
