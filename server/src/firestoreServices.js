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

function isFirestoreQuotaExceeded(error) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const code = Number(error?.code);

  return (
    code === 8
    || message.includes('resource_exhausted')
    || message.includes('quota exceeded')
    || details.includes('quota exceeded')
  );
}

function getFallbackSettings() {
  const now = new Date().toISOString();

  return {
    key: 'default',
    pricing: DEFAULT_SETTINGS.pricing,
    courts: DEFAULT_SETTINGS.courts,
    operatingHours: DEFAULT_SETTINGS.operatingHours,
    landing: normalizeLandingContent({
      ...DEFAULT_LANDING,
      ...DEFAULT_SITE_ASSETS,
    }),
    createdAt: now,
    updatedAt: now,
  };
}

function getFallbackGallery() {
  return DEFAULT_LANDING.gallery.map((item, index) => ({
    id: item.id || `gallery-${index + 1}`,
    url: String(item.url || '').trim(),
    caption: String(item.caption || '').trim(),
    sortOrder: index,
  })).filter(item => item.url);
}

function getFallbackReviews() {
  const now = new Date().toISOString();

  return DEFAULT_LANDING.reviews.map((item) => ({
    id: item.id,
    userId: null,
    name: item.name,
    email: '',
    rating: Number(item.rating || 0),
    comment: String(item.comment || '').trim(),
    date: String(item.date || now.slice(0, 10)),
    adminReply: null,
    adminReplyBy: null,
    adminReplyAt: null,
    createdAt: now,
    updatedAt: now,
  })).filter((review) => review.rating >= 1 && review.rating <= 5 && review.comment);
}

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
  return ref.get();
}

async function getAppSettings() {
  try {
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
  } catch (error) {
    if (!isFirestoreQuotaExceeded(error)) {
      throw error;
    }

    console.warn('[firestore] Quota exceeded while loading settings, using fallback defaults');
    return getFallbackSettings();
  }
}

async function updateAppSettings(payload) {
  const db = getDb();
  const current = await getAppSettings();
  const landingPayload = payload.landing || {};
  const nextHeroImage =
    typeof landingPayload.heroImage === 'string' && landingPayload.heroImage.trim()
      ? landingPayload.heroImage
      : current.landing.heroImage;
  const nextAboutImage =
    typeof landingPayload.aboutImage === 'string' && landingPayload.aboutImage.trim()
      ? landingPayload.aboutImage
      : current.landing.aboutImage;
  const siteAssets = normalizeSiteAssets({
    heroImage: nextHeroImage,
    aboutImage: nextAboutImage,
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

async function getGalleryImages(limit) {
  try {
    const db = getDb();
    const collection = db.collection(GALLERY_COLLECTION);
    const normalizedLimit = Number.parseInt(String(limit || ''), 10);
    const query = Number.isFinite(normalizedLimit) && normalizedLimit > 0
      ? collection.orderBy('sortOrder', 'asc').limit(normalizedLimit)
      : collection.orderBy('sortOrder', 'asc');
    const snapshot = await query.get();

    if (snapshot.empty) {
      return getFallbackGallery();
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
  } catch (error) {
    if (!isFirestoreQuotaExceeded(error)) {
      throw error;
    }

    console.warn('[firestore] Quota exceeded while loading gallery, using fallback defaults');
    return getFallbackGallery();
  }
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

async function deleteGalleryImage(imageId, imageUrl, imageCaption, imageIndex) {
  const [currentSettings, currentCollectionGallery] = await Promise.all([
    getAppSettings(),
    getGalleryImages(),
  ]);

  const currentSettingsGallery = Array.isArray(currentSettings?.landing?.gallery)
    ? currentSettings.landing.gallery
    : [];

  const galleryByKey = new Map();
  for (const item of [...currentCollectionGallery, ...currentSettingsGallery]) {
    if (!item || (!item.id && !item.url)) {
      continue;
    }

    const key = item.id || item.url;
    if (!galleryByKey.has(key)) {
      galleryByKey.set(key, item);
    }
  }

  const currentGallery = Array.from(galleryByKey.values());
  const normalizeValue = (value) => String(value || '').trim().toLowerCase();
  const normalizeUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }

    try {
      const parsed = new URL(raw);
      return `${parsed.origin}${parsed.pathname}`.toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  };

  const targetId = normalizeValue(imageId);
  const targetUrl = normalizeUrl(imageUrl);
  const targetCaption = normalizeValue(imageCaption);

  console.log('[gallery-delete] attempting', {
    imageId: targetId,
    imageUrl: targetUrl,
    available: currentGallery.map(item => ({
      id: item.id,
      url: item.url,
      caption: item.caption,
    })),
  });

  const nextGallery = currentGallery.filter(item => {
    const itemId = normalizeValue(item.id);
    const itemUrl = normalizeUrl(item.url);
    const itemCaption = normalizeValue(item.caption);

    if (targetId && itemId === targetId) {
      return false;
    }

    if (targetUrl && itemUrl === targetUrl) {
      return false;
    }

    if (targetUrl && item.url && normalizeUrl(item.url).includes(targetUrl)) {
      return false;
    }

    if (targetUrl && imageUrl && normalizeUrl(imageUrl).includes(itemUrl)) {
      return false;
    }

    if (targetCaption && itemCaption === targetCaption) {
      return false;
    }

    return true;
  });

  if (nextGallery.length === currentGallery.length && Number.isInteger(imageIndex) && imageIndex >= 0 && imageIndex < currentGallery.length) {
    const fallbackTarget = currentGallery[imageIndex];
    const fallbackNextGallery = currentGallery.filter((_, index) => index !== imageIndex);

    if (fallbackTarget) {
      return replaceGalleryImages(fallbackNextGallery);
    }
  }

  if (nextGallery.length === currentGallery.length) {
    throw new ApiError(404, 'Gallery image not found');
  }

  return replaceGalleryImages(nextGallery);
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

function getCurrentUtcSlotContext(now = new Date()) {
  return {
    dateKey: toUtcDateKey(now),
    minutes: (now.getUTCHours() * 60) + now.getUTCMinutes(),
  };
}

function isPastOrCurrentSlot(dateKey, slotTimeKey, currentContext = getCurrentUtcSlotContext()) {
  const [startMinutesRaw] = String(slotTimeKey).split('-');
  const startMinutes = Number(startMinutesRaw);

  if (!Number.isFinite(startMinutes)) {
    return false;
  }

  if (dateKey < currentContext.dateKey) {
    return true;
  }

  if (dateKey > currentContext.dateKey) {
    return false;
  }

  return startMinutes <= currentContext.minutes;
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

  const currentContext = getCurrentUtcSlotContext();

  return allSlots.map(slot => {
    const slotTimeKey = normalizeTimeRange(slot.time);
    const isPastSlot = slotTimeKey ? isPastOrCurrentSlot(slot.date, slotTimeKey, currentContext) : false;

    return {
      ...slot,
      status: blockedKeys.has(slotTimeKey) || isPastSlot ? 'booked' : 'available',
    };
  });
}

async function assertNoSlotConflicts(slots) {
  const requestedKeys = new Set();
  const bookedDates = new Map();
  const currentContext = getCurrentUtcSlotContext();

  for (const slot of slots) {
    if (isPastOrCurrentSlot(slot.date, slot.slotTimeKey, currentContext)) {
      throw new ApiError(400, `Slot ${slot.slotTime} on ${slot.date} is in the past. Please choose a future time slot.`);
    }

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
  let query = db.collection('bookings');

  if (user.role !== 'admin') {
    query = query.where('userId', '==', user.sub);
  }

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters.date) {
    query = query.where('date', '==', toUtcDateKey(filters.date));
  }

  const bookingSnapshot = await query.get();
  const bookingDocs = bookingSnapshot.docs;

  if (!bookingDocs.length) {
    return [];
  }

  const bookingIds = bookingDocs.map(doc => doc.id);
  const slotRows = [];

  // Firestore `in` queries have limited terms; fetch booking slots in chunks.
  const chunkSize = 10;
  for (let index = 0; index < bookingIds.length; index += chunkSize) {
    const idChunk = bookingIds.slice(index, index + chunkSize);
    const slotSnapshot = await db.collection('booking_slots').where('bookingId', 'in', idChunk).get();
    slotRows.push(...slotSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }

  const filtered = bookingDocs.map(doc => mapBookingDoc(doc, slotRows));

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
  let query = db.collection('subscriptions');

  if (user.role !== 'admin') {
    query = query.where('userId', '==', user.sub);
  }

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters.court) {
    query = query.where('court', '==', Number(filters.court));
  }

  const snapshot = await query.get();
  const subscriptions = snapshot.docs.map(mapSubscriptionDoc);

  return subscriptions
    .filter(subscription => {
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

function mapContactMessageDoc(doc) {
  const data = doc.data() || {};

  return {
    id: doc.id,
    name: String(data.name || '').trim(),
    email: String(data.email || '').trim().toLowerCase(),
    phone: String(data.phone || '').trim() || null,
    subject: String(data.subject || '').trim(),
    message: String(data.message || '').trim(),
    status: String(data.status || 'new').trim(),
    adminReply: typeof data.adminReply === 'string' ? data.adminReply.trim() : null,
    adminReplyBy: typeof data.adminReplyBy === 'string' ? data.adminReplyBy.trim() : null,
    adminReplyAt: data.adminReplyAt ? toIso(data.adminReplyAt) : null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

async function listContactMessages() {
  const db = getDb();
  const snapshot = await db.collection('contact_messages').get();

  return snapshot.docs
    .map(mapContactMessageDoc)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function listContactMessagesByEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new ApiError(400, 'email is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const snapshot = await db.collection('contact_messages').where('email', '==', normalizedEmail).get();

  return snapshot.docs
    .map(mapContactMessageDoc)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function replyToContactMessage(messageId, payload, authUser) {
  if (!authUser?.sub || authUser.role !== 'admin') {
    throw new ApiError(403, 'Forbidden');
  }

  const reply = String(payload?.reply || '').trim();
  if (!reply) {
    throw new ApiError(400, 'reply is required');
  }

  const db = getDb();
  const ref = db.collection('contact_messages').doc(messageId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new ApiError(404, 'Message not found');
  }

  const now = new Date();
  await ref.update({
    adminReply: reply,
    adminReplyBy: authUser.name || authUser.email || 'Admin',
    adminReplyAt: now,
    status: 'replied',
    updatedAt: now,
  });

  const updated = await ref.get();
  return mapContactMessageDoc(updated);
}

function mapReviewDoc(doc) {
  const data = doc.data() || {};

  return {
    id: doc.id,
    userId: data.userId || null,
    name: String(data.name || 'Anonymous').trim(),
    email: String(data.email || '').trim().toLowerCase(),
    rating: Number(data.rating || 0),
    comment: String(data.comment || '').trim(),
    date: String(data.date || toIso(data.createdAt || data.updatedAt).slice(0, 10)),
    adminReply: typeof data.adminReply === 'string' ? data.adminReply.trim() : null,
    adminReplyBy: typeof data.adminReplyBy === 'string' ? data.adminReplyBy.trim() : null,
    adminReplyAt: data.adminReplyAt ? toIso(data.adminReplyAt) : null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

async function listReviews(limit) {
  try {
    const db = getDb();
    const normalizedLimit = Number.parseInt(String(limit || ''), 10);
    const query = Number.isFinite(normalizedLimit) && normalizedLimit > 0
      ? db.collection('reviews').orderBy('createdAt', 'desc').limit(normalizedLimit)
      : db.collection('reviews').orderBy('createdAt', 'desc');
    const snapshot = await query.get();

    return snapshot.docs
      .map(mapReviewDoc)
      .filter((review) => review.rating >= 1 && review.rating <= 5 && review.comment)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    if (!isFirestoreQuotaExceeded(error)) {
      throw error;
    }

    console.warn('[firestore] Quota exceeded while loading reviews, using fallback defaults');
    return getFallbackReviews();
  }
}

async function createReview(payload, authUser) {
  if (!authUser?.sub) {
    throw new ApiError(401, 'Authentication required');
  }

  const rating = Number(payload?.rating || 0);
  const comment = String(payload?.comment || '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'rating must be an integer between 1 and 5');
  }

  if (!comment) {
    throw new ApiError(400, 'comment is required');
  }

  const db = getDb();
  const now = new Date();
  const date = toIso(now).slice(0, 10);

  const reviewPayload = {
    userId: authUser.sub,
    name: authUser.name || 'User',
    email: authUser.email || '',
    rating,
    comment,
    date,
    adminReply: null,
    adminReplyBy: null,
    adminReplyAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection('reviews').add(reviewPayload);
  const created = await ref.get();
  return mapReviewDoc(created);
}

async function replyToReview(reviewId, payload, authUser) {
  if (!authUser?.sub || authUser.role !== 'admin') {
    throw new ApiError(403, 'Forbidden');
  }

  const reply = String(payload?.reply || '').trim();
  if (!reply) {
    throw new ApiError(400, 'reply is required');
  }

  const db = getDb();
  const ref = db.collection('reviews').doc(reviewId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new ApiError(404, 'Review not found');
  }

  const now = new Date();
  await ref.update({
    adminReply: reply,
    adminReplyBy: authUser.name || authUser.email || 'Admin',
    adminReplyAt: now,
    updatedAt: now,
  });

  const updated = await ref.get();
  return mapReviewDoc(updated);
}

async function deleteReview(reviewId, authUser) {
  if (!authUser?.sub || authUser.role !== 'admin') {
    throw new ApiError(403, 'Forbidden');
  }

  const db = getDb();
  const ref = db.collection('reviews').doc(reviewId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new ApiError(404, 'Review not found');
  }

  // Optionally keep an audit record - for now just delete
  await ref.delete();
  return { id: reviewId };
}

async function storeVerificationToken(email, token, expiryTime) {
  const db = getDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  
  if (!normalizedEmail) {
    throw new ApiError(400, 'email is required');
  }

  await db.collection('email_verifications').doc(normalizedEmail).set({
    email: normalizedEmail,
    token,
    expiryTime,
    createdAt: new Date(),
    verified: false,
  });
}

async function verifyEmail(email, token) {
  const db = getDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  
  if (!normalizedEmail) {
    throw new ApiError(400, 'email is required');
  }

  const verificationRef = db.collection('email_verifications').doc(normalizedEmail);
  const verificationDoc = await verificationRef.get();

  if (!verificationDoc.exists) {
    throw new ApiError(404, 'Verification token not found');
  }

  const verificationData = verificationDoc.data();
  
  if (verificationData.token !== token) {
    throw new ApiError(401, 'Invalid verification token');
  }

  if (new Date() > new Date(verificationData.expiryTime)) {
    throw new ApiError(401, 'Verification token has expired');
  }

  // Mark email as verified
  await verificationRef.update({
    verified: true,
    verifiedAt: new Date(),
  });

  // Update user document to mark as verified
  const usersRef = db.collection('users');
  const userQuery = await usersRef.where('email', '==', normalizedEmail).limit(1).get();
  
  if (!userQuery.empty) {
    const userDoc = userQuery.docs[0];
    await userDoc.ref.update({
      emailVerified: true,
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return true;
}

async function checkEmailVerification(email) {
  const db = getDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  
  const verificationRef = db.collection('email_verifications').doc(normalizedEmail);
  const verificationDoc = await verificationRef.get();

  if (!verificationDoc.exists) {
    return { verified: false, exists: false };
  }

  const verificationData = verificationDoc.data();
  return {
    verified: verificationData.verified === true,
    exists: true,
    expiryTime: verificationData.expiryTime,
  };
}

async function updateBooking(user, bookingId, updates = {}) {
  const db = getDb();
  const booking = await getBookingById(user, bookingId);
  const bookingRef = db.collection('bookings').doc(booking.id);
  const now = new Date();

  const allowedUpdates = {};
  if ('paymentStatus' in updates) {
    allowedUpdates.paymentStatus = updates.paymentStatus;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    return booking;
  }

  allowedUpdates.updatedAt = now;

  await bookingRef.update(allowedUpdates);

  return { ...booking, ...allowedUpdates, updatedAt: now.toISOString() };
}

module.exports = {
  getAppSettings,
  updateAppSettings,
  getGalleryImages,
  replaceGalleryImages,
  deleteGalleryImage,
  getAvailability,
  createBookingRecord,
  listBookings,
  getBookingById,
  cancelBooking,
  updateBooking,
  createSubscriptionRecord,
  listSubscriptions,
  getSubscriptionById,
  cancelSubscription,
  getDashboardStats,
  getRevenueSeries,
  listUsers,
  createContactMessage,
  listContactMessages,
  listContactMessagesByEmail,
  replyToContactMessage,
  listReviews,
  createReview,
  replyToReview,
  deleteReview,
  storeVerificationToken,
  verifyEmail,
  checkEmailVerification,
};