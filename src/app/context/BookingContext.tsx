import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, getCurrentUserToken, auth } from '../lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Calculate the effective booking status based on current date/time
 * Overrides the stored status to reflect actual booking state
 */
export const getEffectiveBookingStatus = (booking: Booking): 'upcoming' | 'completed' | 'cancelled' => {
  // If cancelled, always show as cancelled
  if (booking.status === 'cancelled') {
    return 'cancelled';
  }

  // Get the last time slot's end time
  if (booking.slots.length === 0) {
    return booking.status;
  }

  const lastSlot = booking.slots[booking.slots.length - 1];
  const slotTimeRange = lastSlot.time; // e.g., "7:00 AM - 8:00 AM"
  const endTimeStr = slotTimeRange.split(' - ')[1]?.trim(); // "8:00 AM"

  if (!endTimeStr) {
    return booking.status;
  }

  // Parse end time and create a date+time to compare with current time
  try {
    // Create a date string from booking.date (should be YYYY-MM-DD format)
    const bookingDate = new Date(booking.date);
    
    // Parse end time (e.g., "8:00 AM" or "20:00")
    const timeMatch = endTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!timeMatch) {
      return booking.status;
    }

    let hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    const period = timeMatch[3]?.toUpperCase();

    // Convert to 24-hour format if AM/PM is present
    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }

    // Create a date object for the end time of the booking
    const bookingEndDateTime = new Date(bookingDate);
    bookingEndDateTime.setHours(hour, minute, 0, 0);

    // Get current date and time
    const now = new Date();

    // If current time is past the booking end time, mark as completed
    if (now > bookingEndDateTime) {
      return 'completed';
    }

    return 'upcoming';
  } catch {
    // If parsing fails, return the stored status
    return booking.status;
  }
};

export interface TimeSlot {
  id: string;
  time: string;
  court: number;
  date: string;
  status: 'available' | 'booked' | 'selected';
  price: number;
}

export interface Booking {
  id: string;
  courtName: string;
  date: string;
  slots: TimeSlot[];
  totalAmount: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  paymentId?: string;
  paymentMethod?: 'online' | 'onsite';
  paymentStatus?: 'paid' | 'pending';
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  courtName: string;
  court: number;
  timeSlot: string;
  startDate: string;
  endDate: string;
  weekdaysCount: number;
  amount: number;
  status: 'active' | 'expired' | 'cancelled';
  paymentId?: string;
  paymentMethod?: 'online' | 'onsite';
  paymentStatus?: 'paid' | 'pending';
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  createdAt: string;
}

interface BookingContextType {
  appSettings: {
    pricing: { offPeak: number; peak: number; subscription: number };
    courts: string[];
    operatingHours: { startHour: number; endHour: number };
    landing: Record<string, unknown>;
  };
  selectedSlots: TimeSlot[];
  bookings: Booking[];
  subscriptions: Subscription[];
  addSlot: (slot: TimeSlot) => void;
  removeSlot: (slotId: string) => void;
  clearSlots: () => void;
  createBooking: (booking: Omit<Booking, 'id' | 'createdAt'>, options?: { asAdmin?: boolean }) => Promise<Booking>;
  createSubscription: (subscription: Omit<Subscription, 'id' | 'createdAt'>, options?: { asAdmin?: boolean }) => Promise<Subscription>;
  cancelBooking: (bookingId: string, options?: { asAdmin?: boolean }) => Promise<void>;
  cancelSubscription: (subscriptionId: string, options?: { asAdmin?: boolean }) => Promise<void>;
  isSlotBooked: (date: string, court: number, time: string) => boolean;
  getTotalAmount: () => number;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const viteEnv = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
const RAW_API_BASE_URL = viteEnv.env?.VITE_API_BASE_URL || '/api';
const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname.includes('localhost')
    ? '/api'
    : RAW_API_BASE_URL;

const parseApiPayload = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  if (/<!doctype html|<html/i.test(text)) {
    return { __htmlResponse: true };
  }

  return null;
};

const getApiErrorMessage = (response: Response, payload: any, fallback: string) => {
  if (payload?.error?.message) {
    return payload.error.message;
  }

  if (payload?.__htmlResponse) {
    return 'API endpoint is not reachable from this deployment. Configure VITE_API_BASE_URL to your backend URL.';
  }

  return `${fallback} (HTTP ${response.status})`;
};

const DEFAULT_APP_SETTINGS = {
  pricing: { offPeak: 500, peak: 800, subscription: 2500 },
  courts: ['Court 1', 'Court 2', 'Court 3'],
  operatingHours: { startHour: 5, endHour: 22 },
  landing: {},
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => new Date(`${dateKey}T12:00:00`);

const normalizeTimeSlot = (timeSlot: string) => {
  const [startPart, endPart] = timeSlot.split(' - ').map(part => part.trim());

  if (endPart) {
    return `${startPart} - ${endPart}`;
  }

  const startMatch = startPart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!startMatch) {
    return timeSlot;
  }

  const startHour = Number(startMatch[1]);
  const meridiem = startMatch[3].toUpperCase();
  let hour24 = startHour % 12;

  if (meridiem === 'PM') {
    hour24 += 12;
  }

  const endHour24 = (hour24 + 1) % 24;
  const endMeridiem = endHour24 >= 12 ? 'PM' : 'AM';
  const endHour12 = endHour24 % 12 || 12;

  return `${startPart} - ${endHour12}:00 ${endMeridiem}`;
};

const isWeekday = (dateKey: string) => {
  const day = parseDateKey(dateKey).getDay();
  return day !== 0 && day !== 6;
};

const isWithinInclusiveRange = (dateKey: string, startDate: string, endDate: string) => {
  const target = parseDateKey(dateKey).getTime();
  const start = parseDateKey(startDate).getTime();
  const end = parseDateKey(endDate).getTime();
  return target >= start && target <= end;
};

const getDateRange = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  const current = parseDateKey(startDate);
  const end = parseDateKey(endDate);

  while (current <= end) {
    dates.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [appSettings, setAppSettings] = useState(DEFAULT_APP_SETTINGS);

  const getAccessToken = async () => {
    const token = await getCurrentUserToken();
    if (!token) {
      throw new Error('Please sign in to continue');
    }
    return token;
  };

  const fetchData = async () => {
    try {
      const accessToken = await getAccessToken();
      const headers = { Authorization: `Bearer ${accessToken}` };

      const [bookingsResponse, subscriptionsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/bookings`, { headers }),
        fetch(`${API_BASE_URL}/subscriptions`, { headers }),
      ]);

      if (bookingsResponse.ok) {
        const payload = await bookingsResponse.json();
        setBookings(payload.bookings || []);
      }

      if (subscriptionsResponse.ok) {
        const payload = await subscriptionsResponse.json();
        setSubscriptions(payload.subscriptions || []);
      }
    } catch {
      setBookings([]);
      setSubscriptions([]);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`);
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const settings = payload?.settings;

      if (!settings) {
        return;
      }

      setAppSettings({
        pricing: settings.pricing || DEFAULT_APP_SETTINGS.pricing,
        courts: Array.isArray(settings.courts) && settings.courts.length ? settings.courts : DEFAULT_APP_SETTINGS.courts,
        operatingHours: settings.operatingHours || DEFAULT_APP_SETTINGS.operatingHours,
        landing: settings.landing || DEFAULT_APP_SETTINGS.landing,
      });
    } catch {
      setAppSettings(DEFAULT_APP_SETTINGS);
    }
  };

  useEffect(() => {
    if (!auth) {
      return;
    }

    let active = true;

    const syncBookings = async () => {
      if (!active) {
        return;
      }

      void fetchSettings();
      await fetchData();
    };

    void syncBookings();

    const pollTimer = window.setInterval(() => {
      void syncBookings();
    }, 20000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!active) {
        return;
      }

      if (!user) {
        setBookings([]);
        setSubscriptions([]);
        void fetchSettings();
        return;
      }

      void syncBookings();
    });

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        void syncBookings();
      }
    };

    const handleSettingsUpdated = () => {
      void fetchSettings();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('tcy:settings-updated', handleSettingsUpdated as EventListener);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('tcy:settings-updated', handleSettingsUpdated as EventListener);
      unsubscribe();
    };
  }, [auth]);

  const isSlotBooked = (date: string, court: number, time: string) => {
    const normalizedTime = normalizeTimeSlot(time);

    const bookingConflict = bookings.some(booking => {
      if (booking.status === 'cancelled') {
        return false;
      }

      return booking.slots.some(slot => {
        return slot.date === date && slot.court === court && normalizeTimeSlot(slot.time) === normalizedTime;
      });
    });

    if (bookingConflict) {
      return true;
    }

    return subscriptions.some(subscription => {
      if (subscription.status !== 'active') {
        return false;
      }

      if (subscription.court !== court) {
        return false;
      }

      if (normalizeTimeSlot(subscription.timeSlot) !== normalizedTime) {
        return false;
      }

      if (!isWithinInclusiveRange(date, subscription.startDate, subscription.endDate)) {
        return false;
      }

      return isWeekday(date);
    });
  };

  const addSlot = (slot: TimeSlot) => {
    if (isSlotBooked(slot.date, slot.court, slot.time)) {
      return;
    }

    setSelectedSlots(prev => {
      const exists = prev.find(s => s.id === slot.id);
      if (exists) return prev;
      return [...prev, { ...slot, status: 'selected' }];
    });
  };

  const removeSlot = (slotId: string) => {
    setSelectedSlots(prev => prev.filter(slot => slot.id !== slotId));
  };

  const clearSlots = () => {
    setSelectedSlots([]);
  };

  const createBooking = async (booking: Omit<Booking, 'id' | 'createdAt'>, options?: { asAdmin?: boolean }) => {
    const conflictingSlot = booking.slots.find(slot => isSlotBooked(slot.date, slot.court, slot.time));

    if (conflictingSlot) {
      throw new Error('One or more selected slots are already booked. Please refresh the booking page and choose another slot.');
    }

    const accessToken = await getAccessToken();
    const endpoint = options?.asAdmin ? `${API_BASE_URL}/admin/bookings` : `${API_BASE_URL}/bookings`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(booking),
    });

    const payload = await parseApiPayload(response);
    if (!response.ok || !payload?.booking) {
      throw new Error(getApiErrorMessage(response, payload, 'Unable to create booking'));
    }

    const newBooking: Booking = payload.booking;
    setBookings(prev => [newBooking, ...prev.filter(existing => existing.id !== newBooking.id)]);
    clearSlots();

    return newBooking;
  };

  const createSubscription = async (subscription: Omit<Subscription, 'id' | 'createdAt'>, options?: { asAdmin?: boolean }) => {
    const normalizedTimeSlot = normalizeTimeSlot(subscription.timeSlot);
    const dates = getDateRange(subscription.startDate, subscription.endDate).filter(isWeekday);
    const conflictingDate = dates.find(date => isSlotBooked(date, subscription.court, normalizedTimeSlot));

    if (conflictingDate) {
      throw new Error('This subscription slot is already booked for part of the selected month. Please choose a different court or time slot.');
    }

    const accessToken = await getAccessToken();
    const endpoint = options?.asAdmin ? `${API_BASE_URL}/admin/subscriptions` : `${API_BASE_URL}/subscriptions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ...subscription,
        timeSlot: normalizedTimeSlot,
      }),
    });

    const payload = await parseApiPayload(response);
    if (!response.ok || !payload?.subscription) {
      throw new Error(getApiErrorMessage(response, payload, 'Unable to create subscription'));
    }

    const newSubscription: Subscription = payload.subscription;
    setSubscriptions(prev => [newSubscription, ...prev.filter(existing => existing.id !== newSubscription.id)]);

    return newSubscription;
  };

  const cancelBooking = async (bookingId: string, options?: { asAdmin?: boolean }) => {
    const accessToken = await getAccessToken();
    const endpoint = options?.asAdmin
      ? `${API_BASE_URL}/admin/bookings/${bookingId}`
      : `${API_BASE_URL}/bookings/${bookingId}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.booking) {
      throw new Error(payload?.error?.message || 'Unable to cancel booking');
    }

    setBookings(prev => prev.map(existing => (existing.id === payload.booking.id ? payload.booking : existing)));
  };

  const cancelSubscription = async (subscriptionId: string, options?: { asAdmin?: boolean }) => {
    const accessToken = await getAccessToken();
    const endpoint = options?.asAdmin
      ? `${API_BASE_URL}/admin/subscriptions/${subscriptionId}`
      : `${API_BASE_URL}/subscriptions/${subscriptionId}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.subscription) {
      throw new Error(payload?.error?.message || 'Unable to cancel subscription');
    }

    setSubscriptions(prev => prev.map(existing => (existing.id === payload.subscription.id ? payload.subscription : existing)));
  };

  const getTotalAmount = () => {
    const subtotal = selectedSlots.reduce((sum, slot) => sum + slot.price, 0);
    const gst = subtotal * 0.18;
    return subtotal + gst;
  };

  return (
    <BookingContext.Provider
      value={{
        appSettings,
        selectedSlots,
        bookings,
        subscriptions,
        addSlot,
        removeSlot,
        clearSlots,
        createBooking,
        createSubscription,
        cancelBooking,
        cancelSubscription,
        isSlotBooked,
        getTotalAmount,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return context;
};