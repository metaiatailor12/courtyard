import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Phone, Mail, Star, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { useLandingPage } from '../../context/LandingPageContext';

export const UserHome = () => {
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const { appSettings } = useBooking();
  const { content } = useLandingPage();
  const { user } = useAuth();

  const landing = appSettings.landing as Record<string, unknown>;
  const venueName = content.venueName || (typeof landing.venueName === 'string' ? landing.venueName : '');
  const venueAddress = content.venueAddress || (typeof landing.venueAddress === 'string' ? landing.venueAddress : '');
  const venuePhone = content.venuePhone || (typeof landing.venuePhone === 'string' ? landing.venuePhone : '');
  const venueEmail = content.venueEmail || (typeof landing.venueEmail === 'string' ? landing.venueEmail : '');
  const venueHours = content.venueOperatingHoursText || (typeof landing.venueOperatingHoursText === 'string' ? landing.venueOperatingHoursText : '');
  const ratingValue = typeof content.venueRating === 'number'
    ? content.venueRating
    : (typeof landing.venueRating === 'number' ? landing.venueRating : 0);
  const mapsEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(venueAddress)}&z=17&output=embed`;
  const availableCourts = appSettings.courts.length;
  const priceRange = `₹${appSettings.pricing.offPeak} - ₹${appSettings.pricing.peak}/hr`;
  const homeImages = content.gallery.map(image => image.url).filter(Boolean);
  const reviews = Array.isArray(content.reviews) ? content.reviews : [];

  const nextImage = () => {
    if (homeImages.length > 0) {
      setCurrentImage((prev) => (prev + 1) % homeImages.length);
    }
  };

  const prevImage = () => {
    if (homeImages.length > 0) {
      setCurrentImage((prev) => (prev - 1 + homeImages.length) % homeImages.length);
    }
  };

  const handleSubmitFeedback = () => {
    if (feedback.trim() && rating > 0) {
      alert('Thank you for your feedback!');
      setFeedback('');
      setRating(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section with Carousel */}
        <GlassCard className="mb-8 overflow-hidden">
          <div className="relative h-[400px] md:h-[500px]">
            {homeImages.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage}
                  src={homeImages[currentImage]}
                  alt="Court"
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              </AnimatePresence>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-cyan-50 text-gray-500">
                No gallery images available.
              </div>
            )}

            {/* Carousel Controls */}
            {homeImages.length > 0 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-800" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg"
                >
                  <ChevronRight className="w-6 h-6 text-gray-800" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {homeImages.length > 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {homeImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImage(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImage ? 'bg-white w-8' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Overlay Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
              <h1 className="text-4xl font-bold text-white mb-2">{venueName}</h1>
              <div className="flex items-center gap-4 text-white/90">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-2">{ratingValue} (127 ratings)</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Court Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Location & Contact */}
            <GlassCard className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Court Details</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#10b981] mt-1" />
                  <div>
                    <p className="font-medium text-gray-800">Location</p>
                    <p className="text-gray-600 whitespace-pre-line">{venueAddress || 'Loading venue address from Firestore...'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#10b981] mt-1" />
                  <div>
                    <p className="font-medium text-gray-800">Contact Number</p>
                    <p className="text-gray-600">{venuePhone || 'Loading venue phone from Firestore...'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#10b981] mt-1" />
                  <div>
                    <p className="font-medium text-gray-800">Email</p>
                    <p className="text-gray-600">{venueEmail || 'Loading venue email from Firestore...'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#10b981] mt-1" />
                  <div>
                    <p className="font-medium text-gray-800">Operating Hours</p>
                    <p className="text-gray-600">{venueHours || 'Loading operating hours from Firestore...'}</p>
                  </div>
                </div>
              </div>

              {/* Map Preview */}
              <div className="mt-6 h-48 bg-gray-200 rounded-xl overflow-hidden">
                <iframe
                  src={mapsEmbedSrc}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  title="Court Location"
                ></iframe>
              </div>
            </GlassCard>

            {/* Reviews Section */}
            <GlassCard className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Customer Reviews</h2>
              <div className="space-y-4">
                {reviews.length > 0 ? reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-800">{review.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{review.date}</span>
                    </div>
                    <p className="text-gray-600">{review.comment}</p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">Reviews will appear here once they are stored in Firestore.</p>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Booking & Feedback Sidebar */}
          <div className="space-y-6">
            {/* Book Now Card */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold mb-4">Ready to Play?</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Available Courts</span>
                  <span className="font-semibold text-gray-800">{availableCourts} Courts</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Price Range</span>
                  <span className="font-semibold text-gray-800">{priceRange}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Time Slots</span>
                  <span className="font-semibold text-gray-800">1 Hour</span>
                </div>
              </div>
              <Button
                variant="primary"
                className="w-full mt-6"
                onClick={() => navigate('/user/booking')}
              >
                Book Now
              </Button>
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => navigate('/user/history')}
              >
                My Bookings
              </Button>
            </GlassCard>

            {/* Feedback Card */}
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold mb-4">Share Your Feedback</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your experience..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent transition-all min-h-[100px]"
                />
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={handleSubmitFeedback}
                disabled={!feedback.trim() || rating === 0}
              >
                Submit Feedback
              </Button>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};