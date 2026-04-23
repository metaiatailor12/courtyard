const { ApiError } = require('./middleware');
const { createSupabaseAdminClient } = require('./supabase');
const {
  buildDailySlots,
  getSubscriptionWeekdays,
  isWeekday,
  normalizeTimeRange,
  toUtcDateKey,
} = require('./lib');

const DEFAULT_SETTINGS = {
  key: 'default',
  pricing: { offPeak: 500, peak: 800, subscription: 2500 },
  courts: ['Court 1', 'Court 2', 'Court 3'],
  operating_hours: { startHour: 5, endHour: 22 },
  landing: {},
};

function getClient() {
  return createSupabaseAdminClient();
}

function mapSettingsRow(row) {
  return {
    key: row.key,
    pricing: row.pricing,
    courts: row.courts,
    operatingHours: row.operating_hours,
    landing: row.landing,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureSettingsRow() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'default')
    .maybeSingle();

  if (error) {
    throw new ApiError(500, error.message);
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('settings')
    .insert(DEFAULT_SETTINGS)
    .select('*')
    .single();

  if (insertError) {
    throw new ApiError(500, insertError.message);
  }

  return inserted;
}

async function getAppSettings() {
  const row = await ensureSettingsRow();
  return mapSettingsRow(row);
}

async function updateAppSettings(payload) {
  const current = await ensureSettingsRow();
  const next = {
    pricing: payload.pricing ? { ...current.pricing, ...payload.pricing } : current.pricing,
    courts: Array.isArray(payload.courts) && payload.courts.length ? payload.courts : current.courts,
    operating_hours: payload.operatingHours
      ? { ...current.operating_hours, ...payload.operatingHours }
      : current.operating_hours,
    landing: payload.landing ? { ...current.landing, ...payload.landing } : current.landing,
  };

  const supabase = getClient();
  const { data, error } = await supabase
    .from('settings')
    .update(next)
    .eq('key', 'default')
    .select('*')
    .single();

  if (error) {
    throw new ApiError(500, error.message);
  }

  return mapSettingsRow(data);
}

async function getAvailability(date, court) {
  if (!date || !court) {
    throw new ApiError(400, 'date and court are required');
  }

  const settings = await getAppSettings();
  const dateKey = toUtcDateKey(date);
  const courtNumber = Number(court);
  const allSlots = buildDailySlots(
    dateKey,
    courtNumber,
    settings.pricing,
    settings.operatingHours.startHour,
    settings.operatingHours.endHour
  );

  const supabase = getClient();
  const { data: bookedRows, error: bookedError } = await supabase
    .from('booking_slots')
    .select('slot_time_key')
    .eq('date', dateKey)
    .eq('court', courtNumber)
    .eq('status', 'booked');

  if (bookedError) {
    throw new ApiError(500, bookedError.message);
  }

  const blockedKeys = new Set((bookedRows || []).map(row => row.slot_time_key));

  if (isWeekday(dateKey)) {
    const { data: subRows, error: subError } = await supabase
      .from('subscriptions')
      .select('time_slot_key')
      .eq('court', courtNumber)
      .eq('status', 'active')
      .lte('start_date', dateKey)
      .gte('end_date', dateKey);

    if (subError) {
      throw new ApiError(500, subError.message);
    }

    for (const row of subRows || []) {
      blockedKeys.add(row.time_slot_key);
    }
  }

  return allSlots.map(slot => ({
    ...slot,
    status: blockedKeys.has(normalizeTimeRange(slot.time)) ? 'booked' : 'available',
  }));
}

function mapSlotInput(slot, fallbackDate) {
  const dateKey = toUtcDateKey(slot.date || fallbackDate);
  const normalizedTimeKey = normalizeTimeRange(slot.time);
  
  if (!normalizedTimeKey) {
    throw new ApiError(400, `Invalid time format: "${slot.time}". Expected format: "H:MM AM/PM - H:MM AM/PM" (e.g., "5:00 AM - 6:00 AM")`);
  }
  
  return {
    slot_id: slot.slotId || slot.id || `${dateKey}-${slot.court}-${Math.random().toString(36).slice(2, 8)}`,
    slot_time: slot.time,
    slot_time_key: normalizedTimeKey,
    court: Number(slot.court),
    date: dateKey,
    price: Number(slot.price || 0),
    status: 'booked',
  };
}

async function assertNoSlotConflicts(slots) {
  const supabase = getClient();

  for (const slot of slots) {
    const { data: existingSlot, error: slotError } = await supabase
      .from('booking_slots')
      .select('id')
      .eq('date', slot.date)
      .eq('court', slot.court)
      .eq('slot_time_key', slot.slot_time_key)
      .eq('status', 'booked')
      .maybeSingle();

    if (slotError) {
      throw new ApiError(500, slotError.message);
    }

    if (existingSlot) {
      throw new ApiError(409, `Slot ${slot.slot_time} on ${slot.date} is already booked`);
    }

    if (!isWeekday(slot.date)) {
      continue;
    }

    const { data: subConflict, error: subError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('court', slot.court)
      .eq('time_slot_key', slot.slot_time_key)
      .eq('status', 'active')
      .lte('start_date', slot.date)
      .gte('end_date', slot.date)
      .maybeSingle();

    if (subError) {
      throw new ApiError(500, subError.message);
    }

    if (subConflict) {
      throw new ApiError(409, `Slot ${slot.slot_time} on ${slot.date} is blocked by a subscription`);
    }
  }
}

function mapBookingRow(row, slotRows) {
  return {
    id: row.id,
    userId: row.user_id,
    courtName: row.court_name,
    date: row.date,
    slots: slotRows
      .filter(slot => slot.booking_id === row.id)
      .map(slot => ({
        id: slot.slot_id,
        time: slot.slot_time,
        court: slot.court,
        date: slot.date,
        price: Number(slot.price),
        status: slot.status,
      })),
    totalAmount: Number(row.total_amount),
    status: row.status,
    paymentId: row.payment_id,
    createdAt: row.created_at,
    userName: row.user_name,
    userEmail: row.user_email,
    userPhone: row.user_phone,
  };
}

async function createBookingRecord({ userId, userName, userEmail, userPhone, courtName, date, slots, totalAmount, paymentId, status = 'upcoming', idempotencyKey }) {
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!Array.isArray(slots) || !slots.length) {
    throw new ApiError(400, 'At least one slot is required');
  }

  const dateKey = toUtcDateKey(date);
  
  let normalizedSlots;
  try {
    normalizedSlots = slots.map(slot => mapSlotInput(slot, dateKey));
  } catch (err) {
    throw err;
  }

  await assertNoSlotConflicts(normalizedSlots);

  const supabase = getClient();

  if (idempotencyKey) {
    const { data: existing, error: existingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingError) {
      throw new ApiError(500, existingError.message);
    }

    if (existing) {
      const { data: existingSlots, error: existingSlotsError } = await supabase
        .from('booking_slots')
        .select('*')
        .eq('booking_id', existing.id);

      if (existingSlotsError) {
        throw new ApiError(500, existingSlotsError.message);
      }

      return mapBookingRow(existing, existingSlots || []);
    }
  }

  const bookingPayload = {
    user_id: userId,
    court_name: courtName,
    date: dateKey,
    total_amount: Number(totalAmount),
    status,
    payment_id: paymentId,
    idempotency_key: idempotencyKey,
    user_name: userName,
    user_email: userEmail,
    user_phone: userPhone,
  };

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert(bookingPayload)
    .select('*')
    .single();

  if (bookingError) {
    const detail = bookingError.details || bookingError.message || 'Unknown error';
    const message = detail.includes('violates foreign key') 
      ? 'User profile not found. Please log out and log in again.'
      : detail.includes('RLS policy')
      ? 'You do not have permission to create bookings. Please contact support.'
      : `Booking creation failed: ${detail}`;
    throw new ApiError(500, message);
  }

  const slotPayload = normalizedSlots.map(slot => ({ ...slot, booking_id: booking.id }));
  const { data: createdSlots, error: slotsError } = await supabase
    .from('booking_slots')
    .insert(slotPayload)
    .select('*');

  if (slotsError) {
    const detail = slotsError.details || slotsError.message || 'Unknown error';
    throw new ApiError(500, `Failed to save booking slots: ${detail}`);
  }

  return mapBookingRow(booking, createdSlots || []);
}

async function listBookings(user, filters = {}) {
  const supabase = getClient();
  let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });

  if (user.role !== 'admin') {
    query = query.eq('user_id', user.sub);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.date) {
    query = query.eq('date', toUtcDateKey(filters.date));
  }

  const { data: bookings, error: bookingError } = await query;
  if (bookingError) {
    throw new ApiError(500, bookingError.message);
  }

  if (!bookings?.length) {
    return [];
  }

  const bookingIds = bookings.map(booking => booking.id);
  const { data: slots, error: slotsError } = await supabase
    .from('booking_slots')
    .select('*')
    .in('booking_id', bookingIds);

  if (slotsError) {
    throw new ApiError(500, slotsError.message);
  }

  return bookings.map(booking => mapBookingRow(booking, slots || []));
}

async function getBookingById(user, bookingId) {
  const supabase = getClient();
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError) {
    throw new ApiError(500, bookingError.message);
  }

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (user.role !== 'admin' && booking.user_id !== user.sub) {
    throw new ApiError(403, 'Forbidden');
  }

  const { data: slots, error: slotsError } = await supabase
    .from('booking_slots')
    .select('*')
    .eq('booking_id', booking.id);

  if (slotsError) {
    throw new ApiError(500, slotsError.message);
  }

  return mapBookingRow(booking, slots || []);
}

async function cancelBooking(user, bookingId, reason = 'Cancelled by user') {
  const booking = await getBookingById(user, bookingId);
  const supabase = getClient();
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: reason })
    .eq('id', booking.id)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(500, error.message);
  }

  return { ...booking, status: data.status, cancelledAt: data.cancelled_at, cancelReason: data.cancel_reason };
}

function mapSubscriptionRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    courtName: row.court_name,
    court: row.court,
    timeSlot: row.time_slot,
    startDate: row.start_date,
    endDate: row.end_date,
    weekdaysCount: row.weekdays_count,
    amount: Number(row.amount),
    status: row.status,
    paymentId: row.payment_id,
    userName: row.user_name,
    userEmail: row.user_email,
    userPhone: row.user_phone,
    createdAt: row.created_at,
  };
}

async function createSubscriptionRecord({ userId, userName, userEmail, userPhone, courtName, court, timeSlot, startDate, endDate, weekdaysCount, amount, paymentId, status = 'active', idempotencyKey }) {
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const normalizedStart = toUtcDateKey(startDate);
  const normalizedEnd = toUtcDateKey(endDate);
  if (!isWeekday(normalizedStart)) {
    throw new ApiError(400, 'Subscription start date must be a weekday');
  }

  const timeKey = normalizeTimeRange(timeSlot);
  const weekdayDates = getSubscriptionWeekdays(normalizedStart, normalizedEnd);
  const courtNumber = Number(court);

  const supabase = getClient();

  for (const dateKey of weekdayDates) {
    const { data: bookingConflict, error: bookingError } = await supabase
      .from('booking_slots')
      .select('id')
      .eq('date', dateKey)
      .eq('court', courtNumber)
      .eq('slot_time_key', timeKey)
      .eq('status', 'booked')
      .maybeSingle();

    if (bookingError) {
      throw new ApiError(500, bookingError.message);
    }

    if (bookingConflict) {
      throw new ApiError(409, `Slot occupied on ${dateKey}, please choose a different slot/date range`);
    }
  }

  const { data: subOverlap, error: subError } = await supabase
    .from('subscriptions')
    .select('id,start_date,end_date')
    .eq('court', courtNumber)
    .eq('time_slot_key', timeKey)
    .eq('status', 'active')
    .lte('start_date', normalizedEnd)
    .gte('end_date', normalizedStart);

  if (subError) {
    throw new ApiError(500, subError.message);
  }

  if (subOverlap?.length) {
    throw new ApiError(409, `Slot occupied on ${subOverlap[0].start_date}, please choose a different slot/date range`);
  }

  if (idempotencyKey) {
    const { data: existing, error: existingError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingError) {
      throw new ApiError(500, existingError.message);
    }

    if (existing) {
      return mapSubscriptionRow(existing);
    }
  }

  const payload = {
    user_id: userId,
    court_name: courtName,
    court: courtNumber,
    time_slot: timeSlot,
    time_slot_key: timeKey,
    start_date: normalizedStart,
    end_date: normalizedEnd,
    weekdays_count: weekdaysCount,
    amount: Number(amount),
    status,
    payment_id: paymentId,
    idempotency_key: idempotencyKey,
    locked_dates: weekdayDates,
    user_name: userName,
    user_email: userEmail,
    user_phone: userPhone,
  };

  const { data, error } = await supabase
    .from('subscriptions')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(500, error.message);
  }

  return mapSubscriptionRow(data);
}

async function listSubscriptions(user, filters = {}) {
  const supabase = getClient();
  let query = supabase.from('subscriptions').select('*').order('created_at', { ascending: false });

  if (user.role !== 'admin') {
    query = query.eq('user_id', user.sub);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.court) {
    query = query.eq('court', Number(filters.court));
  }

  const { data, error } = await query;
  if (error) {
    throw new ApiError(500, error.message);
  }

  return (data || []).map(mapSubscriptionRow);
}

async function getSubscriptionById(user, subscriptionId) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, error.message);
  }

  if (!data) {
    throw new ApiError(404, 'Subscription not found');
  }

  if (user.role !== 'admin' && data.user_id !== user.sub) {
    throw new ApiError(403, 'Forbidden');
  }

  return mapSubscriptionRow(data);
}

async function cancelSubscription(user, subscriptionId) {
  const subscription = await getSubscriptionById(user, subscriptionId);
  const supabase = getClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', subscription.id)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(500, error.message);
  }

  return mapSubscriptionRow(data);
}

async function getDashboardStats() {
  const supabase = getClient();

  const [
    { count: totalBookings, error: bErr },
    { count: activeSubscriptions, error: sErr },
    { count: cancelledBookings, error: cErr },
    { data: bookingRevenueRows, error: brErr },
    { data: subscriptionRevenueRows, error: srErr },
  ] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }).neq('status', 'cancelled'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('bookings').select('total_amount').neq('status', 'cancelled'),
    supabase.from('subscriptions').select('amount').neq('status', 'cancelled'),
  ]);

  for (const err of [bErr, sErr, cErr, brErr, srErr]) {
    if (err) {
      throw new ApiError(500, err.message);
    }
  }

  const bookingRevenue = (bookingRevenueRows || []).reduce((sum, row) => sum + Number(row.total_amount), 0);
  const subscriptionRevenue = (subscriptionRevenueRows || []).reduce((sum, row) => sum + Number(row.amount), 0);

  return {
    totalBookings: totalBookings || 0,
    activeSubscriptions: activeSubscriptions || 0,
    cancelledBookings: cancelledBookings || 0,
    totalRevenue: bookingRevenue + subscriptionRevenue,
    bookingRevenue,
    subscriptionRevenue,
  };
}

async function getRevenueSeries(month) {
  const monthKey = month || toUtcDateKey(new Date()).slice(0, 7);
  const startDate = `${monthKey}-01`;
  const startMonth = new Date(`${startDate}T00:00:00.000Z`);
  const endMonth = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + 1, 0));
  const endDate = toUtcDateKey(endMonth);
  const supabase = getClient();

  const { data: bookings, error: bookingError } = await supabase
    .from('bookings')
    .select('date,total_amount,status')
    .gte('date', startDate)
    .lte('date', endDate)
    .neq('status', 'cancelled');

  if (bookingError) {
    throw new ApiError(500, bookingError.message);
  }

  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('start_date,amount,status')
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .neq('status', 'cancelled');

  if (subError) {
    throw new ApiError(500, subError.message);
  }

  const byDate = new Map();

  for (const booking of bookings || []) {
    const current = byDate.get(booking.date) || { date: booking.date, revenue: 0, bookings: 0 };
    current.revenue += Number(booking.total_amount);
    current.bookings += 1;
    byDate.set(booking.date, current);
  }

  for (const subscription of subscriptions || []) {
    const current = byDate.get(subscription.start_date) || { date: subscription.start_date, revenue: 0, bookings: 0 };
    current.revenue += Number(subscription.amount);
    byDate.set(subscription.start_date, current);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function listUsers() {
  const supabase = getClient();

  const [profilesResponse, bookingsResponse, subscriptionsResponse] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,app_role,name,email,phone,created_at,updated_at'),
    supabase.from('bookings').select('user_id,user_email,status,created_at'),
    supabase.from('subscriptions').select('user_id,user_email,status,created_at'),
  ]);

  for (const response of [profilesResponse, bookingsResponse, subscriptionsResponse]) {
    if (response.error) {
      throw new ApiError(500, response.error.message);
    }
  }

  const profiles = profilesResponse.data || [];
  const bookings = bookingsResponse.data || [];
  const subscriptions = subscriptionsResponse.data || [];

  return profiles
    .map(profile => {
      const bookedCount = bookings.filter(item => item.user_id === profile.id || item.user_email === profile.email).length;
      const activeSubscriptionCount = subscriptions.filter(item => (item.user_id === profile.id || item.user_email === profile.email) && item.status === 'active').length;

      const status = profile.app_role === 'admin'
        ? 'Admin'
        : activeSubscriptionCount > 0
          ? 'Subscriber'
          : bookedCount > 0
            ? 'Active'
            : 'Inactive';

      return {
        id: profile.id,
        name: profile.name || profile.email || 'User',
        email: profile.email || '',
        phone: profile.phone || null,
        role: profile.app_role || 'user',
        status,
        bookings: bookedCount,
        subscriptions: activeSubscriptionCount,
        joinedAt: profile.created_at,
        updatedAt: profile.updated_at,
      };
    })
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
}

module.exports = {
  getAppSettings,
  updateAppSettings,
  getAvailability,
  createBookingRecord,
  listBookings,
  getBookingById,
  cancelBooking,
  createSubscriptionRecord,
  listSubscriptions,
  getSubscriptionById,
  cancelSubscription,
  getDashboardStats,
  getRevenueSeries,
  listUsers,
};
