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
	deleteGalleryImage,
	getAvailability,
	listCourtBlocks,
	createCourtBlockRecord,
	deleteCourtBlock,
	createBookingRecord,
	listBookings,
	cancelBooking,
	updateBooking,
	createSubscriptionRecord,
	listSubscriptions,
	cancelSubscription,
	updateSubscription,
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
} = require('./firestoreServices');
const { uploadGalleryImage } = require('./cloudinary');
const {
	sendVerificationEmail,
	sendBookingConfirmationEmail,
	sendAdminBookingAlertEmail,
	sendBookingCancellationEmail,
	sendSubscriptionConfirmationEmail,
} = require('./emailService');
const { generateJWTVerificationToken, getTokenExpiryTime } = require('./tokenUtils');

const router = express.Router();

const { getAuth } = require('./firebase');
const { sendPasswordResetEmail } = require('./emailService');

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

async function sendEmailVerificationLink(req, res) {
	const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
	const name = typeof req.body?.name === 'string' ? req.body.name.trim() : 'User';
	
	if (!email) {
		throw new ApiError(400, 'email is required');
	}

	// Check if email is already verified
	const existingVerification = await checkEmailVerification(email);
	if (existingVerification.verified) {
		throw new ApiError(400, 'Email is already verified');
	}

	// Generate verification token
	const token = generateJWTVerificationToken(email);
	const expiryTime = getTokenExpiryTime();

	// Store token in database
	await storeVerificationToken(email, token, expiryTime);

	// Build verification link
	const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
	const verificationLink = `${clientOrigin}/verify-email?token=${encodeURIComponent(token)}`;

	// Send verification email
	try {
		await sendVerificationEmail(email, verificationLink, name);
		res.json({ 
			message: 'Verification email sent successfully',
			email,
		});
	} catch (error) {
		console.error('Failed to send verification email:', error);
		throw new ApiError(500, 'Failed to send verification email. Please try again.');
	}
}

router.post('/auth/verify-email-send', asyncHandler(sendEmailVerificationLink));
router.post('/auth/resend-verification-email', asyncHandler(sendEmailVerificationLink));

router.post('/auth/password-reset', asyncHandler(async (req, res) => {
	const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
	if (!email) {
		throw new ApiError(400, 'email is required');
	}

	const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
	const actionCodeSettings = { url: `${clientOrigin}/login`, handleCodeInApp: true };

	try {
		const authAdmin = getAuth();
		const resetLink = await authAdmin.generatePasswordResetLink(email, actionCodeSettings);

		// Try to send using server email service; if not configured, return a clear error so
		// the frontend can fallback to Firebase client SDK if desired.
		try {
			await sendPasswordResetEmail(email, resetLink);
			res.json({ message: 'Password reset email sent' });
			return;
		} catch (sendErr) {
			console.error('Server email send failed for password reset:', sendErr);
			throw new ApiError(503, 'Server email service is not configured or failed to send');
		}
	} catch (error) {
		console.error('Failed to generate or send password reset link:', error);
		throw new ApiError(500, 'Failed to process password reset request');
	}
}));

async function sendBookingConfirmationIfPossible(booking) {
	const recipientEmail = typeof booking?.userEmail === 'string' ? booking.userEmail.trim().toLowerCase() : '';
	if (!recipientEmail) {
		return false;
	}

	try {
		await sendBookingConfirmationEmail(recipientEmail, booking);
		return true;
	} catch (error) {
		console.error('Booking was created, but confirmation email failed:', error);
		return false;
	}
}

async function sendBookingCancellationIfPossible(booking) {
	const recipientEmail = typeof booking?.userEmail === 'string' ? booking.userEmail.trim().toLowerCase() : '';
	if (!recipientEmail) {
		return false;
	}

	try {
		await sendBookingCancellationEmail(recipientEmail, booking);
		return true;
	} catch (error) {
		console.error('Booking was cancelled, but cancellation email failed:', error);
		return false;
	}
}

async function sendAdminBookingAlertIfPossible(booking) {
	try {
		await sendAdminBookingAlertEmail(booking);
		return true;
	} catch (error) {
		console.error('Booking was created, but admin alert email failed:', error);
		return false;
	}
}

function requireVerifiedUser(req) {
	if (req.auth?.role === 'admin') {
		return;
	}

	if (!req.auth?.emailVerified) {
		throw new ApiError(403, 'Please verify your email before booking or subscribing.');
	}
}

async function sendSubscriptionConfirmationIfPossible(subscription) {
	const recipientEmail = typeof subscription?.userEmail === 'string' ? subscription.userEmail.trim().toLowerCase() : '';
	if (!recipientEmail) {
		return false;
	}

	try {
		await sendSubscriptionConfirmationEmail(recipientEmail, subscription);
		return true;
	} catch (error) {
		console.error('Subscription was created, but confirmation email failed:', error);
		return false;
	}
}

router.post('/auth/verify-email-confirm', asyncHandler(async (req, res) => {
	const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';

	if (!token) {
		throw new ApiError(400, 'token is required');
	}

	try {
		// Import the verifyJWTToken function
		const { verifyJWTToken } = require('./tokenUtils');
		
		// Decode the JWT to get the email
		const decoded = verifyJWTToken(token);
		
		if (!decoded || !decoded.email) {
			throw new ApiError(401, 'Invalid or expired verification token');
		}

		const email = decoded.email;

		// Verify the email using the database
		await verifyEmail(email, token);
		
		res.json({ 
			message: 'Email verified successfully',
			verified: true,
			email,
		});
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		throw new ApiError(400, 'Email verification failed: ' + (error.message || 'Unknown error'));
	}
}));

router.get('/auth/verify-email-check', asyncHandler(async (req, res) => {
	const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';

	if (!email) {
		throw new ApiError(400, 'email is required');
	}

	const verification = await checkEmailVerification(email);
	res.json(verification);
}));

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

router.get('/reviews', asyncHandler(async (req, res) => {
	const reviews = await listReviews(req.query?.limit);
	res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
	res.json({ reviews });
}));

router.post('/reviews', requireAuth, asyncHandler(async (req, res) => {
	const review = await createReview(req.body || {}, req.auth);
	res.status(201).json({ review });
}));

router.get('/settings', asyncHandler(async (_req, res) => {
	const settings = await getAppSettings();
	res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
	res.json({ settings });
}));

router.patch('/settings', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const settings = await updateAppSettings(req.body || {});
	res.json({ settings });
}));

router.get('/gallery', asyncHandler(async (req, res) => {
	const gallery = await getGalleryImages(req.query?.limit);
	res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
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

router.delete('/admin/gallery/:imageId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const imageUrl = typeof req.query?.url === 'string' ? req.query.url.trim() : '';
	const imageCaption = typeof req.query?.caption === 'string' ? req.query.caption.trim() : '';
	const imageIndex = Number.parseInt(String(req.query?.index || ''), 10);
	const gallery = await deleteGalleryImage(req.params.imageId, imageUrl, imageCaption, imageIndex);
	res.json({ gallery });
}));

router.get('/availability', asyncHandler(async (req, res) => {
	const { date, court } = req.query;
	const availability = await getAvailability(date, court);
	res.json({ availability });
}));

router.get('/court-blocks', asyncHandler(async (_req, res) => {
	const blocks = await listCourtBlocks();
	res.json({ blocks });
}));

router.get('/bookings', requireAuth, asyncHandler(async (req, res) => {
	const bookings = await listBookings(req.auth, req.query || {});
	res.json({ bookings });
}));

router.post('/bookings', requireAuth, asyncHandler(async (req, res) => {
	requireVerifiedUser(req);

	const booking = await createBookingRecord({
		...req.body,
		source: 'user-app',
		userId: req.auth.sub,
		userName: req.body?.userName || req.auth.name,
		userEmail: req.body?.userEmail || req.auth.email,
		userPhone: req.body?.userPhone || null,
	});
	const [confirmationEmailSent, adminAlertEmailSent] = await Promise.all([
		sendBookingConfirmationIfPossible(booking),
		sendAdminBookingAlertIfPossible(booking),
	]);

	res.status(201).json({ booking: { ...booking, confirmationEmailSent, adminAlertEmailSent } });
}));

router.delete('/bookings/:bookingId', requireAuth, asyncHandler(async (req, res) => {
	const booking = await cancelBooking(req.auth, req.params.bookingId);
	const cancellationEmailSent = await sendBookingCancellationIfPossible(booking);
	res.json({ booking: { ...booking, cancellationEmailSent } });
}));

router.post('/subscriptions', requireAuth, asyncHandler(async (req, res) => {
	requireVerifiedUser(req);

	const subscription = await createSubscriptionRecord({
		...req.body,
		source: 'user-app',
		userId: req.auth.sub,
		userName: req.body?.userName || req.auth.name,
		userEmail: req.body?.userEmail || req.auth.email,
		userPhone: req.body?.userPhone || null,
	});
	const confirmationEmailSent = await sendSubscriptionConfirmationIfPossible(subscription);

	res.status(201).json({ subscription: { ...subscription, confirmationEmailSent } });
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

router.delete('/admin/reviews/:reviewId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const result = await deleteReview(req.params.reviewId, req.auth);
	res.json({ deleted: result });
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
	const [confirmationEmailSent, adminAlertEmailSent] = await Promise.all([
		sendBookingConfirmationIfPossible(booking),
		sendAdminBookingAlertIfPossible(booking),
	]);

	res.status(201).json({ booking: { ...booking, confirmationEmailSent, adminAlertEmailSent } });
}));

router.get('/admin/court-blocks', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
	const blocks = await listCourtBlocks();
	res.json({ blocks });
}));

router.post('/admin/court-blocks', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const result = await createCourtBlockRecord(req.body || {}, req.auth);
	res.status(201).json(result);
}));

router.delete('/admin/court-blocks/:blockId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const result = await deleteCourtBlock(req.params.blockId, req.auth);
	res.json(result);
}));

router.delete('/admin/bookings/:bookingId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const booking = await cancelBooking(req.auth, req.params.bookingId);
	const cancellationEmailSent = await sendBookingCancellationIfPossible(booking);
	res.json({ booking: { ...booking, cancellationEmailSent } });
}));

router.patch('/admin/bookings/:bookingId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const booking = await updateBooking(req.auth, req.params.bookingId, req.body || {});
	res.json({ booking });
}));

router.post('/admin/subscriptions', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const subscription = await createSubscriptionRecord({
		...req.body,
		source: 'admin-desk',
		userId: await resolveAdminTargetUserId(req),
		userName: req.body?.userName || req.auth.name,
		userEmail: req.body?.userEmail || req.auth.email,
		userPhone: req.body?.userPhone || null,
	});
	const confirmationEmailSent = await sendSubscriptionConfirmationIfPossible(subscription);

	res.status(201).json({ subscription: { ...subscription, confirmationEmailSent } });
}));

router.delete('/admin/subscriptions/:subscriptionId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
	const subscription = await cancelSubscription(req.auth, req.params.subscriptionId);
	res.json({ subscription });
}));

router.patch('/admin/subscriptions/:subscriptionId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const subscription = await updateSubscription(req.auth, req.params.subscriptionId, req.body || {});
  res.json({ subscription });
}));

router.use((req, _res, next) => {
	next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

module.exports = router;
