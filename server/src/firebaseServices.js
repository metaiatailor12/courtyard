const { ApiError } = require('./middleware');
const { getDb } = require('./firebase');
const {
  buildDailySlots,
  getSubscriptionWeekdays,
  isWeekday,
  normalizeTimeRange,
  toUtcDateKey,
} = require('./lib');

const DEFAULT_SETTINGS = {
  pricing: { offPeak: 500, peak: 800, subscription: 2500 },
  courts: ['Court 1', 'Court 2', 'Court 3'],
  operatingHours: { startHour: 5, endHour: 22 },
  bookingDisabled: false,
  landing: {},
};

async function getAppSettings() {
  const db = getDb();
  const settingsRef = db.collection('settings').doc('default');
  const doc = await settingsRef.get();

  if (!doc.exists) {
    // Create default settings if not exists
    await settingsRef.set({
      ...DEFAULT_SETTINGS,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return DEFAULT_SETTINGS;
  }

  const data = doc.data();
  return {
    pricing: data.pricing,
    courts: data.courts,
    operatingHours: data.operatingHours,
    bookingDisabled: Boolean(data.bookingDisabled),
    landing: data.landing,
    createdAt: data.createdAt?.toDate?.(),
    updatedAt: data.updatedAt?.toDate?.(),
  };
}

async function updateAppSettings(payload) {
  const current = await getAppSettings();
  const db = getDb();

  const next = {
    pricing: payload.pricing ? { ...current.pricing, ...payload.pricing } : current.pricing,
    courts: Array.isArray(payload.courts) && payload.courts.length ? payload.courts : current.courts,
    operatingHours: payload.operatingHours
      ? { ...current.operatingHours, ...payload.operatingHours }
      : current.operatingHours,
    bookingDisabled: typeof payload.bookingDisabled === 'boolean' ? payload.bookingDisabled : Boolean(current.bookingDisabled),
    landing: payload.landing ? { ...current.landing, ...payload.landing } : current.landing,
    updatedAt: new Date(),
  };

  await db.collection('settings').doc('default').update(next);

  return {
    ...next,
    createdAt: current.createdAt,
  };
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

  const db = getDb();
  
  // Get booked slots
  const bookedSnapshot = await db.collection('booking_slots')
    .where('date', '==', dateKey)
    .where('court', '==', courtNumber)
    .where('status', '==', 'booked')
    .get();

  const blockedKeys = new Set(
    bookedSnapshot.docs.map(doc => doc.data().slotTimeKey)
  );

  // If weekday, also block slots reserved by subscriptions
  if (isWeekday(dateKey)) {
    const subSnapshot = await db.collection('subscriptions')
      .where('court', '==', courtNumber)
      .where('status', '==', 'active')
      .where('startDate', '<=', dateKey)
      .where('endDate', '>=', dateKey)
      .get();

    for (const doc of subSnapshot.docs) {
      blockedKeys.add(doc.data().timeSlotKey);
    }
  }

  return allSlots.map(slot => ({
    ...slot,
    status: blockedKeys.has(normalizeTimeRange(slot.time)) ? 'booked' : 'available',
  }));
}

async function getBooking(bookingId) {
  const db = getDb();
  const doc = await db.collection('bookings').doc(bookingId).get();

  if (!doc.exists) {
    throw new ApiError(404, 'Booking not found');
  }

  const data = doc.data();
  const slotsSnapshot = await db.collection('bookings').doc(bookingId)
    .collection('slots').get();

  return {
    id: doc.id,
    ...data,
    slots: slotsSnapshot.docs.map(slot => ({
      id: slot.id,
      ...slot.data(),
    })),
    createdAt: data.createdAt?.toDate?.(),
    updatedAt: data.updatedAt?.toDate?.(),
  };
}

async function getBookings(userId) {
  const db = getDb();
  const snapshot = await db.collection('bookings')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.(),
    updatedAt: doc.data().updatedAt?.toDate?.(),
  }));
}

async function createBooking(userId, bookingData) {
  const db = getDb();
  const timestamp = new Date();

  const bookingRef = await db.collection('bookings').add({
    userId,
    courtName: bookingData.courtName,
    date: bookingData.date,
    totalAmount: bookingData.totalAmount,
    status: 'upcoming',
    userName: bookingData.userName,
    userEmail: bookingData.userEmail,
    userPhone: bookingData.userPhone,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  // Add slots as subcollection
  for (const slot of bookingData.slots || []) {
    await bookingRef.collection('slots').add({
      slotId: slot.slotId,
      slotTime: slot.slotTime,
      slotTimeKey: slot.slotTimeKey,
      court: slot.court,
      price: slot.price,
      status: 'booked',
      createdAt: timestamp,
    });

    // Mark slot as booked in booking_slots collection
    await db.collection('booking_slots').add({
      bookingId: bookingRef.id,
      slotId: slot.slotId,
      slotTime: slot.slotTime,
      slotTimeKey: slot.slotTimeKey,
      court: slot.court,
      date: bookingData.date,
      price: slot.price,
      status: 'booked',
      createdAt: timestamp,
    });
  }

  return {
    id: bookingRef.id,
    ...bookingData,
    status: 'upcoming',
    createdAt: timestamp,
  };
}

async function cancelBooking(bookingId) {
  const db = getDb();
  const timestamp = new Date();

  const booking = await getBooking(bookingId);
  
  await db.collection('bookings').doc(bookingId).update({
    status: 'cancelled',
    cancelledAt: timestamp,
    updatedAt: timestamp,
  });

  // Mark slots as available
  const slotSnapshot = await db.collection('booking_slots')
    .where('bookingId', '==', bookingId)
    .get();

  for (const doc of slotSnapshot.docs) {
    await db.collection('booking_slots').doc(doc.id).update({
      status: 'available',
    });
  }

  return booking;
}

async function getSubscriptions(userId) {
  const db = getDb();
  const snapshot = await db.collection('subscriptions')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.(),
    updatedAt: doc.data().updatedAt?.toDate?.(),
  }));
}

async function createSubscription(userId, subscriptionData) {
  const db = getDb();
  const timestamp = new Date();

  const subRef = await db.collection('subscriptions').add({
    userId,
    courtName: subscriptionData.courtName,
    court: subscriptionData.court,
    timeSlot: subscriptionData.timeSlot,
    timeSlotKey: subscriptionData.timeSlotKey,
    startDate: subscriptionData.startDate,
    endDate: subscriptionData.endDate,
    weekdaysCount: subscriptionData.weekdaysCount,
    amount: subscriptionData.amount,
    status: 'active',
    userName: subscriptionData.userName,
    userEmail: subscriptionData.userEmail,
    userPhone: subscriptionData.userPhone,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return {
    id: subRef.id,
    ...subscriptionData,
    status: 'active',
    createdAt: timestamp,
  };
}

async function cancelSubscription(subscriptionId) {
  const db = getDb();
  const timestamp = new Date();

  const doc = await db.collection('subscriptions').doc(subscriptionId).get();
  const subscription = doc.data();

  await db.collection('subscriptions').doc(subscriptionId).update({
    status: 'cancelled',
    cancelledAt: timestamp,
    updatedAt: timestamp,
  });

  return {
    id: subscriptionId,
    ...subscription,
    status: 'cancelled',
  };
}

module.exports = {
  getAppSettings,
  updateAppSettings,
  getAvailability,
  getBooking,
  getBookings,
  createBooking,
  cancelBooking,
  getSubscriptions,
  createSubscription,
  cancelSubscription,
};
