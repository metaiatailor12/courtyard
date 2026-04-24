const { ApiError } = require('./middleware');
const { getDb } = require('./firebase');
const {
  buildDailySlots,
  getSubscriptionWeekdays,
  isWeekday,
  normalizeTimeRange,
  toUtcDateKey,
} = require('./lib');

const DEFAULT_LANDING = {
  heroTitle: 'Book Your Perfect Court',
  heroSubtitle: 'Experience Next-Level Sports',
  heroDescription: 'Premium court booking system with real-time availability, flexible subscriptions, and seamless payment integration. Your game, your schedule, your way.',
  heroCTA: 'Login',
  heroSecondaryButton: 'Signup',
  heroImage: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=600&fit=crop',
  features: [
    {
      id: '1',
      icon: 'Calendar',
      title: 'Real-Time Booking',
      description: 'Instantly book courts with live availability updates across all locations.',
    },
    {
      id: '2',
      icon: 'CreditCard',
      title: 'Flexible Subscriptions',
      description: 'Monthly plans with fixed time slots designed for regular players.',
    },
    {
      id: '3',
      icon: 'Clock',
      title: '5 AM to 11 PM',
      description: 'Extended hours across 3 premium courts to fit your schedule.',
    },
    {
      id: '4',
      icon: 'Shield',
      title: 'Secure Payments',
      description: 'Safe and secure payment processing with instant confirmation.',
    },
  ],
  stats: [
    { id: '1', value: '1000+', label: 'Happy Players' },
    { id: '2', value: '3', label: 'Premium Courts' },
    { id: '3', value: '18hrs', label: 'Daily Availability' },
    { id: '4', value: '24/7', label: 'Support Available' },
  ],
  aboutTitle: 'Why Choose thecourtyard?',
  aboutDescription: 'We provide state-of-the-art sports facilities with a seamless booking experience. Our modern courts are equipped with professional-grade surfaces, lighting, and amenities. Whether you\'re a casual player or a serious athlete, thecourtyard offers the perfect environment for your game.',
  aboutImage: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a26?w=800&h=600&fit=crop',
  galleryTitle: 'Our Premium Courts',
  gallerySubtitle: 'Experience the best in sports facilities',
  gallery: [
    {
      id: 'gallery-1',
      url: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=1200&h=800&fit=crop',
      caption: 'Professional court lighting',
    },
    {
      id: 'gallery-2',
      url: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=1200&h=800&fit=crop',
      caption: 'Premium playing surface',
    },
    {
      id: 'gallery-3',
      url: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=1200&h=800&fit=crop',
      caption: 'Ready for competitive play',
    },
  ],
  venueName: 'thecourtyard Sports Arena',
  venueAddress: 'TheCourtyard- Pickleball Court, Megina Mane, Kandettu Rd, Kadri Hills, Bikarnakatte Kaikamba, Padavu, Mangaluru, Karnataka 575005',
  venuePhone: '+91 98765 43210',
  venueEmail: 'info@thecourtyard.com',
  venueOperatingHoursText: '5:00 AM - 11:00 PM (All Days)',
  venueRating: 4.7,
  contactQuickActions: [
    {
      id: 'contact-action-1',
      icon: 'Calendar',
      title: 'Book a Court',
      description: 'Reserve your court in minutes',
      actionType: 'navigate',
      actionValue: '/user/booking',
      color: 'emerald',
    },
    {
      id: 'contact-action-2',
      icon: 'MessageCircle',
      title: 'Chat Support',
      description: 'Get instant help',
      actionType: 'phone',
      actionValue: '+919876543210',
      color: 'blue',
    },
    {
      id: 'contact-action-3',
      icon: 'HelpCircle',
      title: 'FAQs',
      description: 'Find quick answers',
      actionType: 'scroll',
      actionValue: 'faq',
      color: 'purple',
    },
  ],
  contactFaqs: [
    {
      id: 'faq-1',
      question: 'What are your operating hours?',
      answer: 'We are open Monday-Friday from 5:00 AM to 11:00 PM, and Saturday-Sunday from 6:00 AM to 10:00 PM.',
    },
    {
      id: 'faq-2',
      question: 'How do I cancel my booking?',
      answer: 'Please contact our support team via phone at +91 98765 43210 to request a cancellation. Our team will process your request.',
    },
    {
      id: 'faq-3',
      question: 'Do you offer group bookings?',
      answer: 'Yes! We offer special rates for group bookings and tournaments. Contact us for more details.',
    },
    {
      id: 'faq-4',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit/debit cards, UPI, net banking, and digital wallets through our secure payment gateway.',
    },
  ],
  reviews: [
    { id: 'review-1', name: 'Rajesh Kumar', rating: 5, comment: 'Excellent facilities and easy booking process!', date: '2026-03-25' },
    { id: 'review-2', name: 'Priya Sharma', rating: 5, comment: 'Best courts in the city. Well maintained and affordable.', date: '2026-03-20' },
    { id: 'review-3', name: 'Amit Patel', rating: 4, comment: 'Great experience. Would recommend to everyone!', date: '2026-03-18' },
  ],
};

const DEFAULT_SETTINGS = {
  pricing: { offPeak: 500, peak: 800, subscription: 2500 },
  courts: ['Court 1', 'Court 2', 'Court 3'],
  operatingHours: { startHour: 5, endHour: 22 },
  landing: DEFAULT_LANDING,
};

const GALLERY_COLLECTION = 'gallery';
const SITE_ASSETS_COLLECTION = 'site_assets';
const DEFAULT_SITE_ASSETS = {
  heroImage: DEFAULT_LANDING.heroImage,
  aboutImage: DEFAULT_LANDING.aboutImage,
};

function sanitizeDocumentId(value, fallback) {
  const raw = String(value || '').trim();
  const cleaned = raw.replace(/[\\/#?\[\]]/g, '-').slice(0, 120);
  return cleaned || fallback;
}

function toIso(value) {
  if (!value) {
    return new Date().toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function normalizeLandingContent(landing = {}) {
  return {
    ...DEFAULT_LANDING,
    ...landing,
    features: Array.isArray(landing.features) && landing.features.length ? landing.features : DEFAULT_LANDING.features,
    stats: Array.isArray(landing.stats) && landing.stats.length ? landing.stats : DEFAULT_LANDING.stats,
    gallery: Array.isArray(landing.gallery) && landing.gallery.length ? landing.gallery : DEFAULT_LANDING.gallery,
    contactQuickActions: Array.isArray(landing.contactQuickActions) && landing.contactQuickActions.length ? landing.contactQuickActions : DEFAULT_LANDING.contactQuickActions,
    contactFaqs: Array.isArray(landing.contactFaqs) && landing.contactFaqs.length ? landing.contactFaqs : DEFAULT_LANDING.contactFaqs,
    reviews: Array.isArray(landing.reviews) && landing.reviews.length ? landing.reviews : DEFAULT_LANDING.reviews,
  };
}

function normalizeSiteAssets(assets = {}) {
  return {
    heroImage: typeof assets.heroImage === 'string' && assets.heroImage.trim() ? assets.heroImage.trim() : DEFAULT_SITE_ASSETS.heroImage,
    aboutImage: typeof assets.aboutImage === 'string' && assets.aboutImage.trim() ? assets.aboutImage.trim() : DEFAULT_SITE_ASSETS.aboutImage,
  };
}

async function ensureSiteAssetsDoc() {
  const db = getDb();
  const ref = db.collection(SITE_ASSETS_COLLECTION).doc('default');
  const doc = await ref.get();

  if (doc.exists) {
    return doc;
  }

  await ref.set({
    ...DEFAULT_SITE_ASSETS,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return ref.get();
}

function mapSettings(doc) {
  const data = doc.data() || {};

  return {
    key: doc.id,
    pricing: data.pricing || DEFAULT_SETTINGS.pricing,
    courts: Array.isArray(data.courts) && data.courts.length ? data.courts : DEFAULT_SETTINGS.courts,
    operatingHours: data.operatingHours || DEFAULT_SETTINGS.operatingHours,
    landing: normalizeLandingContent(data.landing),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

async function ensureSettingsDoc() {
  const db = getDb();
  const ref = db.collection('settings').doc('default');
  const doc = await ref.get();

  if (doc.exists) {
    return doc;
  }

  await ref.set({
    ...DEFAULT_SETTINGS,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return ref.get();
}

async function getAppSettings() {
  const [settingsDoc, assetsDoc] = await Promise.all([ensureSettingsDoc(), ensureSiteAssetsDoc()]);
  const settings = mapSettings(settingsDoc);
  const assets = normalizeSiteAssets(assetsDoc.data() || {});

  return {
    ...settings,
    landing: normalizeLandingContent({
      ...settings.landing,
      ...assets,
    }),
  };
}

async function updateAppSettings(payload) {
  const db = getDb();
  const current = await getAppSettings();
  const landingPayload = payload.landing || {};
  const siteAssets = normalizeSiteAssets({
    heroImage: landingPayload.heroImage,
    aboutImage: landingPayload.aboutImage,
  });
  const nextLanding = {
    ...current.landing,
    ...landingPayload,
    heroImage: siteAssets.heroImage,
    aboutImage: siteAssets.aboutImage,
  };
  const next = {
    pricing: payload.pricing ? { ...current.pricing, ...payload.pricing } : current.pricing,
    courts: Array.isArray(payload.courts) && payload.courts.length ? payload.courts : current.courts,
    operatingHours: payload.operatingHours
      ? { ...current.operatingHours, ...payload.operatingHours }
      : current.operatingHours,
    landing: nextLanding,
    updatedAt: new Date(),
  };

  await db.collection('settings').doc('default').set(next, { merge: true });
  await db.collection(SITE_ASSETS_COLLECTION).doc('default').set({
    ...siteAssets,
    updatedAt: new Date(),
  }, { merge: true });

  return {
    key: 'default',
    ...next,
    createdAt: current.createdAt,
  };
}

async function getGalleryImages() {
  const db = getDb();
  const collection = db.collection(GALLERY_COLLECTION);
  let snapshot = await collection.orderBy('sortOrder', 'asc').get();

  if (snapshot.empty) {
    const settingsDoc = await ensureSettingsDoc();
    const settingsData = settingsDoc.data() || {};
    const seedGallery = Array.isArray(settingsData.landing?.gallery) && settingsData.landing.gallery.length
      ? settingsData.landing.gallery
      : Array.isArray(settingsData.galleryItems) && settingsData.galleryItems.length
        ? settingsData.galleryItems
        : Array.isArray(settingsData.galleryUrls) && settingsData.galleryUrls.length
          ? settingsData.galleryUrls.map((url, index) => ({ id: String(index + 1), url, caption: `Court ${index + 1}` }))
          : [];

    if (seedGallery.length) {
      const batch = db.batch();
      seedGallery.forEach((item, index) => {
        const id = String(item?.id || `${Date.now()}-${index}`);
        batch.set(collection.doc(id), {
          id,
          url: String(item?.url || '').trim(),
          caption: String(item?.caption || `Court ${index + 1}`).trim(),
          sortOrder: index,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      await batch.commit();
      snapshot = await collection.orderBy('sortOrder', 'asc').get();
    }
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      url: String(data.url || '').trim(),
      caption: String(data.caption || '').trim(),
      sortOrder: Number(data.sortOrder || 0),
    };
  }).filter(item => item.url);
}

async function replaceGalleryImages(items) {
  const db = getDb();
  const usedIds = new Set();
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item, index) => ({
          id: sanitizeDocumentId(item?.id, `gallery-${Date.now()}-${index}`),
          url: String(item?.url || '').trim(),
          caption: String(item?.caption || '').trim(),
          sortOrder: index,
        }))
        .map((item, index) => {
          let nextId = item.id;
          if (usedIds.has(nextId)) {
            nextId = `${item.id}-${index}`;
          }
          usedIds.add(nextId);
          return {
            ...item,
            id: nextId,
          };
        })
        .filter(item => item.url)
    : [];

  const collection = db.collection(GALLERY_COLLECTION);
  const existing = await collection.get();

  // Firestore batches are limited to 500 writes; keep a safety margin.
  const writeOperations = [
    ...existing.docs.map(doc => ({ type: 'delete', ref: doc.ref })),
    ...normalizedItems.map(item => ({
      type: 'set',
      ref: collection.doc(item.id),
      data: {
        id: item.id,
        url: item.url,
        caption: item.caption,
        sortOrder: item.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })),
  ];

  const chunkSize = 400;
  for (let index = 0; index < writeOperations.length; index += chunkSize) {
    const batch = db.batch();
    const chunk = writeOperations.slice(index, index + chunkSize);

    chunk.forEach((operation) => {
      if (operation.type === 'delete') {
        batch.delete(operation.ref);
      } else {
        batch.set(operation.ref, operation.data);
      }
    });

    await batch.commit();
  }

  await db.collection('settings').doc('default').set({
    landing: {
      gallery: normalizedItems.map(item => ({
        id: item.id,
        url: item.url,
        caption: item.caption,
      })),
    },
    updatedAt: new Date(),
  }, { merge: true });

  return normalizedItems.map(item => ({
    id: item.id,
    url: item.url,
    caption: item.caption,
    sortOrder: item.sortOrder,
  }));
}

function mapSlot(slot) {
  return {
    id: slot.id || slot.slotId || slot.slot_id,
    time: slot.time || slot.slotTime || slot.slot_time || '',
    court: Number(slot.court),
    date: slot.date,
    price: Number(slot.price || 0),
    status: slot.status || 'booked',
  };
}

function mapBookingDoc(doc, slotDocs) {
  const data = doc.data() || {};
  const slots = slotDocs
    .filter(slot => (slot.bookingId || slot.booking_id) === doc.id)
    .map(mapSlot);

  return {
    id: doc.id,
    userId: data.userId || data.user_id || '',
    courtName: data.courtName || data.court_name || '',
    date: data.date || '',
    slots,
    totalAmount: Number(data.totalAmount || data.total_amount || 0),
    status: data.status || 'upcoming',
    paymentId: data.paymentId || data.payment_id,
    paymentMethod: data.paymentMethod || data.payment_method,
    paymentStatus: data.paymentStatus || data.payment_status,
    source: data.source || 'user-app',
    createdAt: toIso(data.createdAt || data.created_at),
    userName: data.userName || data.user_name,
    userEmail: data.userEmail || data.user_email,
    userPhone: data.userPhone || data.user_phone,
    cancelledAt: data.cancelledAt ? toIso(data.cancelledAt) : undefined,
    cancelReason: data.cancelReason || data.cancel_reason,
  };
}

function mapSubscriptionDoc(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    userId: data.userId || data.user_id || '',
    courtName: data.courtName || data.court_name || '',
    court: Number(data.court || 0),
    timeSlot: data.timeSlot || data.time_slot || '',
    startDate: data.startDate || data.start_date || '',
    endDate: data.endDate || data.end_date || '',
    weekdaysCount: Number(data.weekdaysCount || data.weekdays_count || 0),
    amount: Number(data.amount || 0),
    status: data.status || 'active',
    paymentId: data.paymentId || data.payment_id,
    paymentMethod: data.paymentMethod || data.payment_method,
    paymentStatus: data.paymentStatus || data.payment_status,
    userName: data.userName || data.user_name,
    userEmail: data.userEmail || data.user_email,
    userPhone: data.userPhone || data.user_phone,
    createdAt: toIso(data.createdAt || data.created_at),
    cancelledAt: data.cancelledAt ? toIso(data.cancelledAt) : undefined,
  };
}

function normalizeBookingSlot(slot, fallbackDate) {
  const dateKey = toUtcDateKey(slot.date || fallbackDate);
  const normalizedTimeKey = normalizeTimeRange(slot.time || slot.slotTime || '');
  const courtNumber = Number(slot.court);

  if (!normalizedTimeKey) {
    throw new ApiError(400, `Invalid time format: "${slot.time}". Expected format: "H:MM AM/PM - H:MM AM/PM"`);
  }

  if (!Number.isFinite(courtNumber) || courtNumber <= 0) {
    throw new ApiError(400, `Invalid court value: "${slot.court}"`);
  }

  // Use deterministic slot IDs so the same date/court/time maps to the same record.
  const safeTimeKey = normalizedTimeKey
    .replace(/\s+/g, '')
    .replace(/:/g, '')
    .replace(/-/g, '_')
    .toLowerCase();
  const deterministicSlotId = `${dateKey}__c${courtNumber}__${safeTimeKey}`;

  return {
    slotId: deterministicSlotId,
    slotTime: slot.time || slot.slotTime,
    slotTimeKey: normalizedTimeKey,
    court: courtNumber,
    date: dateKey,
    price: Number(slot.price || 0),
    status: 'booked',
  };
}

async function getBookedSlotsForDate(dateKey) {
  const db = getDb();
  const snapshot = await db.collection('booking_slots').where('date', '==', dateKey).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getActiveSubscriptions() {
  const db = getDb();
  const snapshot = await db.collection('subscriptions').where('status', '==', 'active').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  const bookedSlots = await getBookedSlotsForDate(dateKey);
  const blockedKeys = new Set(
    bookedSlots
      .filter(slot => Number(slot.court) === courtNumber && slot.status === 'booked')
      .map(slot => slot.slotTimeKey)
  );

  if (isWeekday(dateKey)) {
    const subscriptions = await getActiveSubscriptions();

    for (const sub of subscriptions) {
      if (Number(sub.court) !== courtNumber) {
        continue;
      }

      if (!sub.timeSlotKey || !sub.startDate || !sub.endDate) {
        continue;
      }

      if (dateKey >= sub.startDate && dateKey <= sub.endDate) {
        blockedKeys.add(sub.timeSlotKey);
      }
    }
  }

  return allSlots.map(slot => ({
    ...slot,
    status: blockedKeys.has(normalizeTimeRange(slot.time)) ? 'booked' : 'available',
  }));
}

async function assertNoSlotConflicts(slots) {
  const requestedKeys = new Set();
  const bookedDates = new Map();
  for (const slot of slots) {
    const requestKey = `${slot.date}|${slot.court}|${slot.slotTimeKey}`;
    if (requestedKeys.has(requestKey)) {
      throw new ApiError(400, `Duplicate slot selected for ${slot.slotTime} on ${slot.date}`);
    }
    requestedKeys.add(requestKey);

    if (!bookedDates.has(slot.date)) {
      bookedDates.set(slot.date, await getBookedSlotsForDate(slot.date));
    }

    const dateSlots = bookedDates.get(slot.date) || [];
    const bookingConflict = dateSlots.find(existing => (
      Number(existing.court) === slot.court
      && existing.status === 'booked'
      && existing.slotTimeKey === slot.slotTimeKey
    ));

    if (bookingConflict) {
      throw new ApiError(409, `Slot ${slot.slotTime} on ${slot.date} is already booked`);
    }

    if (!isWeekday(slot.date)) {
      continue;
    }

    const subscriptions = await getActiveSubscriptions();
    const subConflict = subscriptions.find(sub => (
      Number(sub.court) === slot.court
      && sub.timeSlotKey === slot.slotTimeKey
      && sub.startDate <= slot.date
      && sub.endDate >= slot.date
    ));

    if (subConflict) {
      throw new ApiError(409, `Slot ${slot.slotTime} on ${slot.date} is blocked by a subscription`);
    }
  }
}

async function createBookingRecord({ userId, userName, userEmail, userPhone, courtName, date, slots, totalAmount, paymentId, status = 'upcoming', idempotencyKey, source = 'user-app' }) {
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!Array.isArray(slots) || !slots.length) {
    throw new ApiError(400, 'At least one slot is required');
  }

  const db = getDb();
  const dateKey = toUtcDateKey(date);
  const normalizedSlots = slots.map(slot => normalizeBookingSlot(slot, dateKey));

  await assertNoSlotConflicts(normalizedSlots);

  if (idempotencyKey) {
    const existingQuery = await db.collection('bookings')
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const existingDoc = existingQuery.docs[0];
      const slotSnapshot = await db.collection('booking_slots').where('bookingId', '==', existingDoc.id).get();
      return mapBookingDoc(existingDoc, slotSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
  }

  const bookingRef = db.collection('bookings').doc();
  const now = new Date();
  const bookingPayload = {
    userId,
    courtName,
    date: dateKey,
    totalAmount: Number(totalAmount),
    status,
    paymentId: paymentId || null,
    paymentMethod: paymentId?.startsWith('ONSITE-') ? 'onsite' : 'online',
    paymentStatus: paymentId?.startsWith('ONSITE-') ? 'pending' : 'paid',
    source,
    idempotencyKey: idempotencyKey || null,
    userName: userName || null,
    userEmail: userEmail || null,
    userPhone: userPhone || null,
    createdAt: now,
    updatedAt: now,
  };

  await db.runTransaction(async (transaction) => {
    const slotRefs = normalizedSlots.map(slot => db.collection('booking_slots').doc(slot.slotId));
    const existingBySlotId = new Map();

    // Firestore transactions require all reads to happen before writes.
    for (let index = 0; index < normalizedSlots.length; index += 1) {
      const slot = normalizedSlots[index];
      const slotRef = slotRefs[index];
      const slotSnapshot = await transaction.get(slotRef);
      const existingSlot = slotSnapshot.exists ? slotSnapshot.data() || {} : null;

      if (existingSlot && existingSlot.status === 'booked') {
        throw new ApiError(409, `Slot ${slot.slotTime} on ${slot.date} is already booked`);
      }

      existingBySlotId.set(slot.slotId, existingSlot);
    }

    transaction.set(bookingRef, bookingPayload);

    for (let index = 0; index < normalizedSlots.length; index += 1) {
      const slot = normalizedSlots[index];
      const slotRef = slotRefs[index];
      const existingSlot = existingBySlotId.get(slot.slotId);
      const slotPayload = {
        bookingId: bookingRef.id,
        slotId: slot.slotId,
        slotTime: slot.slotTime,
        slotTimeKey: slot.slotTimeKey,
        court: slot.court,
        date: slot.date,
        price: slot.price,
        status: 'booked',
        createdAt: existingSlot?.createdAt || now,
        updatedAt: now,
      };

      transaction.set(slotRef, slotPayload);
      transaction.set(bookingRef.collection('slots').doc(slot.slotId), slotPayload);
    }
  });

  const slotDocs = normalizedSlots.map(slot => ({
    id: slot.slotId,
    bookingId: bookingRef.id,
    ...slot,
  }));

  return mapBookingDoc({ id: bookingRef.id, data: () => bookingPayload }, slotDocs);
}

async function listBookings(user, filters = {}) {
  const db = getDb();
  const [bookingSnapshot, slotSnapshot] = await Promise.all([
    db.collection('bookings').get(),
    db.collection('booking_slots').get(),
  ]);

  const slotRows = slotSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const bookings = bookingSnapshot.docs.map(doc => mapBookingDoc(doc, slotRows));

  const filtered = bookings.filter(booking => {
    if (user.role !== 'admin' && booking.userId !== user.sub) {
      return false;
    }

    if (filters.status && booking.status !== filters.status) {
      return false;
    }

    if (filters.date && booking.date !== toUtcDateKey(filters.date)) {
      return false;
    }

    return true;
  });

  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function getBookingById(user, bookingId) {
  const db = getDb();
  const doc = await db.collection('bookings').doc(bookingId).get();

  if (!doc.exists) {
    throw new ApiError(404, 'Booking not found');
  }

  const data = doc.data() || {};
  if (user.role !== 'admin' && data.userId !== user.sub) {
    throw new ApiError(403, 'Forbidden');
  }

  const slotSnapshot = await db.collection('booking_slots').where('bookingId', '==', bookingId).get();
  return mapBookingDoc(doc, slotSnapshot.docs.map(slotDoc => ({ id: slotDoc.id, ...slotDoc.data() })));
}

async function cancelBooking(user, bookingId, reason = 'Cancelled by user') {
  const db = getDb();
  const booking = await getBookingById(user, bookingId);
  const bookingRef = db.collection('bookings').doc(booking.id);
  const slotSnapshot = await db.collection('booking_slots').where('bookingId', '==', booking.id).get();
  const subSnapshot = await bookingRef.collection('slots').get();
  const now = new Date();

  const batch = db.batch();
  batch.update(bookingRef, {
    status: 'cancelled',
    cancelledAt: now,
    cancelReason: reason,
    updatedAt: now,
  });

  for (const slotDoc of slotSnapshot.docs) {
    batch.update(slotDoc.ref, { status: 'cancelled', updatedAt: now });
  }

  for (const slotDoc of subSnapshot.docs) {
    batch.update(slotDoc.ref, { status: 'cancelled', updatedAt: now });
  }

  await batch.commit();

  return { ...booking, status: 'cancelled', cancelledAt: now.toISOString(), cancelReason: reason };
}

async function createSubscriptionRecord({ userId, userName, userEmail, userPhone, courtName, court, timeSlot, startDate, endDate, weekdaysCount, amount, paymentId, status = 'active', idempotencyKey }) {
  if (!userId) {
    throw new ApiError(401, 'Authentication required');
  }

  const db = getDb();
  const normalizedStart = toUtcDateKey(startDate);
  const normalizedEnd = toUtcDateKey(endDate);

  if (!isWeekday(normalizedStart)) {
    throw new ApiError(400, 'Subscription start date must be a weekday');
  }

  const timeKey = normalizeTimeRange(timeSlot);
  const weekdayDates = getSubscriptionWeekdays(normalizedStart, normalizedEnd);
  const courtNumber = Number(court);
  const bookedSlotSnapshots = await Promise.all(weekdayDates.map(dateKey => db.collection('booking_slots').where('date', '==', dateKey).get()));

  for (let index = 0; index < weekdayDates.length; index += 1) {
    const dateKey = weekdayDates[index];
    const bookedRows = bookedSlotSnapshots[index].docs.map(doc => doc.data());
    const conflict = bookedRows.find(slot => Number(slot.court) === courtNumber && slot.status === 'booked' && slot.slotTimeKey === timeKey);

    if (conflict) {
      throw new ApiError(409, `Slot occupied on ${dateKey}, please choose a different slot/date range`);
    }
  }

  const existingSubs = await db.collection('subscriptions').where('status', '==', 'active').get();
  const overlappingSubscription = existingSubs.docs.map(doc => doc.data()).find(sub => (
    Number(sub.court) === courtNumber
    && sub.timeSlotKey === timeKey
    && sub.startDate <= normalizedEnd
    && sub.endDate >= normalizedStart
  ));

  if (overlappingSubscription) {
    throw new ApiError(409, `Slot occupied on ${overlappingSubscription.startDate}, please choose a different slot/date range`);
  }

  if (idempotencyKey) {
    const existingQuery = await db.collection('subscriptions').where('idempotencyKey', '==', idempotencyKey).limit(1).get();
    if (!existingQuery.empty) {
      return mapSubscriptionDoc(existingQuery.docs[0]);
    }
  }

  const now = new Date();
  const payload = {
    userId,
    courtName,
    court: courtNumber,
    timeSlot,
    timeSlotKey: timeKey,
    startDate: normalizedStart,
    endDate: normalizedEnd,
    weekdaysCount: Number(weekdaysCount),
    amount: Number(amount),
    status,
    paymentId: paymentId || null,
    paymentMethod: paymentId?.startsWith('ONSITE-') ? 'onsite' : 'online',
    paymentStatus: paymentId?.startsWith('ONSITE-') ? 'pending' : 'paid',
    idempotencyKey: idempotencyKey || null,
    lockedDates: weekdayDates,
    userName: userName || null,
    userEmail: userEmail || null,
    userPhone: userPhone || null,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection('subscriptions').add(payload);
  const created = await ref.get();
  return mapSubscriptionDoc(created);
}

async function listSubscriptions(user, filters = {}) {
  const db = getDb();
  const snapshot = await db.collection('subscriptions').get();
  const subscriptions = snapshot.docs.map(mapSubscriptionDoc);

  return subscriptions
    .filter(subscription => {
      if (user.role !== 'admin' && subscription.userId !== user.sub) {
        return false;
      }

      if (filters.status && subscription.status !== filters.status) {
        return false;
      }

      if (filters.court && subscription.court !== Number(filters.court)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function getSubscriptionById(user, subscriptionId) {
  const db = getDb();
  const doc = await db.collection('subscriptions').doc(subscriptionId).get();

  if (!doc.exists) {
    throw new ApiError(404, 'Subscription not found');
  }

  const subscription = mapSubscriptionDoc(doc);
  if (user.role !== 'admin' && subscription.userId !== user.sub) {
    throw new ApiError(403, 'Forbidden');
  }

  return subscription;
}

async function cancelSubscription(user, subscriptionId) {
  const db = getDb();
  const subscription = await getSubscriptionById(user, subscriptionId);
  const ref = db.collection('subscriptions').doc(subscription.id);
  const now = new Date();

  await ref.update({
    status: 'cancelled',
    cancelledAt: now,
    updatedAt: now,
  });

  return { ...subscription, status: 'cancelled', cancelledAt: now.toISOString() };
}

async function getDashboardStats() {
  const db = getDb();
  const [bookingSnapshot, subscriptionSnapshot] = await Promise.all([
    db.collection('bookings').get(),
    db.collection('subscriptions').get(),
  ]);

  const bookings = bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const subscriptions = subscriptionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const activeBookings = bookings.filter(item => item.status !== 'cancelled');
  const activeSubscriptions = subscriptions.filter(item => item.status === 'active');
  const cancelledBookings = bookings.filter(item => item.status === 'cancelled');
  const bookingRevenue = activeBookings.reduce((sum, row) => sum + Number(row.totalAmount || row.total_amount || 0), 0);
  const subscriptionRevenue = subscriptions
    .filter(item => item.status !== 'cancelled')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return {
    totalBookings: activeBookings.length,
    activeSubscriptions: activeSubscriptions.length,
    cancelledBookings: cancelledBookings.length,
    totalRevenue: bookingRevenue + subscriptionRevenue,
    bookingRevenue,
    subscriptionRevenue,
  };
}

async function getRevenueSeries(month) {
  const db = getDb();
  const monthKey = month || toUtcDateKey(new Date()).slice(0, 7);
  const [bookingSnapshot, subscriptionSnapshot] = await Promise.all([
    db.collection('bookings').get(),
    db.collection('subscriptions').get(),
  ]);

  const bookings = bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(row => row.status !== 'cancelled');
  const subscriptions = subscriptionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(row => row.status !== 'cancelled');
  const byDate = new Map();

  for (const booking of bookings) {
    const dateKey = String(booking.date || '').slice(0, 7);
    if (dateKey !== monthKey) {
      continue;
    }

    const current = byDate.get(booking.date) || { date: booking.date, revenue: 0, bookings: 0 };
    current.revenue += Number(booking.totalAmount || booking.total_amount || 0);
    current.bookings += 1;
    byDate.set(booking.date, current);
  }

  for (const subscription of subscriptions) {
    const dateKey = String(subscription.startDate || subscription.start_date || '').slice(0, 7);
    if (dateKey !== monthKey) {
      continue;
    }

    const date = subscription.startDate || subscription.start_date;
    const current = byDate.get(date) || { date, revenue: 0, bookings: 0 };
    current.revenue += Number(subscription.amount || 0);
    byDate.set(date, current);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function listUsers() {
  const db = getDb();
  const [profileSnapshot, bookingSnapshot, subscriptionSnapshot] = await Promise.all([
    db.collection('users').get(),
    db.collection('bookings').get(),
    db.collection('subscriptions').get(),
  ]);

  const bookings = bookingSnapshot.docs.map(doc => doc.data());
  const subscriptions = subscriptionSnapshot.docs.map(doc => doc.data());

  return profileSnapshot.docs
    .map(doc => {
      const profile = doc.data() || {};
      const bookedCount = bookings.filter(item => item.userId === doc.id || item.userEmail === profile.email).length;
      const activeSubscriptionCount = subscriptions.filter(item => (item.userId === doc.id || item.userEmail === profile.email) && item.status === 'active').length;

      const status = profile.role === 'admin'
        ? 'Admin'
        : activeSubscriptionCount > 0
          ? 'Subscriber'
          : bookedCount > 0
            ? 'Active'
            : 'Inactive';

      return {
        id: doc.id,
        name: profile.name || profile.email || 'User',
        email: profile.email || '',
        phone: profile.phone || null,
        role: profile.role || 'user',
        status,
        bookings: bookedCount,
        subscriptions: activeSubscriptionCount,
        joinedAt: toIso(profile.createdAt || profile.updatedAt),
        updatedAt: toIso(profile.updatedAt || profile.createdAt),
      };
    })
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
}

async function createContactMessage(payload) {
  const name = String(payload?.name || '').trim();
  const email = String(payload?.email || '').trim().toLowerCase();
  const phone = String(payload?.phone || '').trim();
  const subject = String(payload?.subject || '').trim();
  const message = String(payload?.message || '').trim();

  if (!name || !email || !subject || !message) {
    throw new ApiError(400, 'name, email, subject, and message are required');
  }

  const db = getDb();
  const now = new Date();

  const ref = await db.collection('contact_messages').add({
    name,
    email,
    phone: phone || null,
    subject,
    message,
    status: 'new',
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: ref.id,
    name,
    email,
    phone: phone || null,
    subject,
    message,
    status: 'new',
    createdAt: now.toISOString(),
  };
}

module.exports = {
  getAppSettings,
  updateAppSettings,
  getGalleryImages,
  replaceGalleryImages,
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
  createContactMessage,
};