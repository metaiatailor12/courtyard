const express = require('express');
const {
	asyncHandler,
	requireAuth,
	requireRole,
	ApiError,
} = require('./middleware');
const {
	getAppSettings,
	updateAppSettings,
	getGalleryImages,
	replaceGalleryImages,
	getAvailability,
	createBookingRecord,
	listBookings,
	cancelBooking,
	createSubscriptionRecord,
	listSubscriptions,
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
} = require('./firestoreServices');
const { uploadGalleryImage } = require('./cloudinary');

const router = express.Router();

async function resolveAdminTargetUserId(req) {
	const body = req.body || {};
	const explicitUserId = typeof body.userId === 'string' ? body.userId.trim() : '';
	if (explicitUserId && /^[0-9a-fA-F-]{36}$/.test(explicitUserId)) {
		return explicitUserId;
	}

	const email = typeof body.userEmail === 'string' ? body.userEmail.trim().toLowerCase() : '';
	const phone = typeof body.userPhone === 'string' ? body.userPhone.trim() : '';
	if (!email && !phone) {
		return req.auth.sub;
	}

	const users = await listUsers();
	const match = users.find(user => (email && user.email === email) || (phone && user.phone === phone));
	return match?.id || req.auth.sub;
}

router.get('/', (_req, res) => {
	res.json({ status: 'ok', service: 'tcy-backend', api: '/api' });
});

router.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

router.post('/contact-messages', asyncHandler(async (req, res) => {
	const message = await createContactMessage(req.body || {});
	res.status(201).json({ message });
}));

router.get('/contact-messages-by-email', asyncHandler(async (req, res) => {
	const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
	if (!email) {
		return res.json({ messages: [] });
	}
	const messages = await listContactMessagesByEmail(email);
	res.json({ messages });
}));

router.get('/reviews', asyncHandler(async (_req, res) => {
	const reviews = await listReviews();
	res.json({ reviews });
}));

router.post('/reviews', requireAuth, asyncHandler(async (req, res) => {
	const review = await createReview(req.body || {}, req.auth);
	res.status(201).json({ review });
}));

router.get('/settings', asyncHandler(async (_req, res) => {
	const settings = await getAppSettings();
	res.json({ settings });
}));

router.patch('/settings', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const settings = await updateAppSettings(req.body || {});
	res.json({ settings });
}));

router.get('/gallery', asyncHandler(async (_req, res) => {
	const gallery = await getGalleryImages();
	res.json({ gallery });
}));

router.post('/admin/gallery/upload', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const imageDataUrl = typeof req.body?.image === 'string' ? req.body.image.trim() : '';
	const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : '';

	if (!imageDataUrl.startsWith('data:image/')) {
		throw new ApiError(400, 'A valid image data URL is required');
	}

	const upload = await uploadGalleryImage({ imageDataUrl, fileName });
	res.status(201).json({ upload });
}));

router.patch('/admin/gallery', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const gallery = await replaceGalleryImages(Array.isArray(req.body?.gallery) ? req.body.gallery : []);
	res.json({ gallery });
}));

router.get('/availability', asyncHandler(async (req, res) => {
	const { date, court } = req.query;
	const availability = await getAvailability(date, court);
	res.json({ availability });
}));

router.get('/bookings', requireAuth, asyncHandler(async (req, res) => {
	const bookings = await listBookings(req.auth, req.query || {});
	res.json({ bookings });
}));

router.post('/bookings', requireAuth, asyncHandler(async (req, res) => {
	const booking = await createBookingRecord({
		...req.body,
		source: 'user-app',
		userId: req.auth.sub,
		userName: req.body?.userName || req.auth.name,
		userEmail: req.body?.userEmail || req.auth.email,
		userPhone: req.body?.userPhone || null,
	});

	res.status(201).json({ booking });
}));

router.delete('/bookings/:bookingId', requireAuth, asyncHandler(async (req, res) => {
	const booking = await cancelBooking(req.auth, req.params.bookingId);
	res.json({ booking });
}));

router.post('/subscriptions', requireAuth, asyncHandler(async (req, res) => {
	const subscription = await createSubscriptionRecord({
		...req.body,
		userId: req.auth.sub,
		userName: req.body?.userName || req.auth.name,
		userEmail: req.body?.userEmail || req.auth.email,
		userPhone: req.body?.userPhone || null,
	});

	res.status(201).json({ subscription });
}));

router.get('/subscriptions', requireAuth, asyncHandler(async (req, res) => {
	const subscriptions = await listSubscriptions(req.auth, req.query || {});
	res.json({ subscriptions });
}));

router.delete('/subscriptions/:subscriptionId', requireAuth, asyncHandler(async (req, res) => {
	const subscription = await cancelSubscription(req.auth, req.params.subscriptionId);
	res.json({ subscription });
}));

router.get('/admin/dashboard/stats', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
	const stats = await getDashboardStats();
	res.json({ stats });
}));

router.get('/admin/dashboard/revenue', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const { month } = req.query;
	const revenue = await getRevenueSeries(month);
	res.json({ revenue });
}));

router.get('/admin/users', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
	const users = await listUsers();
	res.json({ users });
}));

router.get('/admin/reviews', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
	const reviews = await listReviews();
	res.json({ reviews });
}));

router.patch('/admin/reviews/:reviewId/reply', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const review = await replyToReview(req.params.reviewId, req.body || {}, req.auth);
	res.json({ review });
}));

router.get('/admin/messages', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
	const messages = await listContactMessages();
	res.json({ messages });
}));

router.patch('/admin/messages/:messageId/reply', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const message = await replyToContactMessage(req.params.messageId, req.body || {}, req.auth);
	res.json({ message });
}));

router.post('/admin/bookings', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const booking = await createBookingRecord({
		...req.body,
		source: 'admin-desk',
		userId: await resolveAdminTargetUserId(req),
		userName: req.body?.userName || req.auth.name,
		userEmail: req.body?.userEmail || req.auth.email,
		userPhone: req.body?.userPhone || null,
	});

	res.status(201).json({ booking });
}));

router.delete('/admin/bookings/:bookingId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const booking = await cancelBooking(req.auth, req.params.bookingId);
	res.json({ booking });
}));

router.post('/admin/subscriptions', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const subscription = await createSubscriptionRecord({
		...req.body,
		userId: await resolveAdminTargetUserId(req),
		userName: req.body?.userName || req.auth.name,
		userEmail: req.body?.userEmail || req.auth.email,
		userPhone: req.body?.userPhone || null,
	});

	res.status(201).json({ subscription });
}));

router.delete('/admin/subscriptions/:subscriptionId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const subscription = await cancelSubscription(req.auth, req.params.subscriptionId);
	res.json({ subscription });
}));

router.use((req, _res, next) => {
	next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

module.exports = router;
