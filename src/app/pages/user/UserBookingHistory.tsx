import { useState } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { Navbar } from '../../components/Navbar';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';

export const UserBookingHistory = () => {
  const { bookings, appSettings } = useBooking();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const supportPhone = typeof appSettings.landing?.venuePhone === 'string' ? appSettings.landing.venuePhone : '';
  const supportEmail = typeof appSettings.landing?.venueEmail === 'string' ? appSettings.landing.venueEmail : '';

  const userBookings = user?.email
    ? bookings.filter(booking => booking.userEmail === user.email)
    : bookings;

  const filteredBookings = filter === 'all' 
    ? userBookings 
    : userBookings.filter(booking => booking.status === filter);

  const getStatusBadge = (status: string) => {
    const badges = {
      upcoming: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Calendar className="w-4 h-4" /> },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-4 h-4" /> },
    };
    
    const badge = badges[status as keyof typeof badges];
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Booking History</h1>
          <p className="text-gray-600">View and manage your bookings</p>
        </div>

        {/* Cancellation Info Banner */}
        <GlassCard className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-emerald-50 border-l-4 border-[#10b981]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#10b981] rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-1">Need to Cancel a Booking?</h3>
              <p className="text-sm text-gray-600 mb-2">
                Please contact our support team to request a cancellation. We're here to help!
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <a 
                          href={`tel:${supportPhone}`} 
                  className="flex items-center gap-1 text-[#10b981] hover:text-[#059669] font-medium"
                >
                  <Phone className="w-4 h-4" />
                          {supportPhone || 'support phone unavailable'}
                </a>
                <a 
                          href={`mailto:${supportEmail}`} 
                  className="flex items-center gap-1 text-[#10b981] hover:text-[#059669] font-medium"
                >
                  <Mail className="w-4 h-4" />
                          {supportEmail || 'support email unavailable'}
                </a>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Filter Tabs */}
        <GlassCard className="p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'All Bookings', value: 'all' },
              { label: 'Upcoming', value: 'upcoming' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as any)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  filter === tab.value
                    ? 'bg-[#10b981] text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <GlassCard className="p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Bookings Found</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? "You haven't made any bookings yet."
                  : `You don't have any ${filter} bookings.`}
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              // Get time slot range from slots
              const getTimeSlotRange = () => {
                if (booking.slots.length === 0) return 'No slots';
                if (booking.slots.length === 1) return booking.slots[0].time;
                
                // Get first and last slot times
                const firstSlot = booking.slots[0].time;
                const lastSlotTime = booking.slots[booking.slots.length - 1].time;
                
                // Extract end time from last slot (e.g., "7:00 AM" -> "8:00 AM")
                const lastSlotEndTime = lastSlotTime.split(' - ')[1] || lastSlotTime;
                return `${firstSlot.split(' - ')[0]} - ${lastSlotEndTime}`;
              };

              // Get court name
              const getCourtName = () => {
                if (booking.slots.length > 0) {
                  return `Court ${booking.slots[0].court}`;
                }
                return 'Court';
              };

              return (
                <GlassCard key={booking.id} className="p-6 hover:shadow-xl transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-xl font-semibold text-gray-800">{getCourtName()}</h3>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Calendar className="w-4 h-4 text-[#10b981]" />
                            <span className="text-xs font-medium text-gray-500">Date</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800">
                            {format(new Date(booking.date), 'EEEE, MMM d, yyyy')}
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Clock className="w-4 h-4 text-[#10b981]" />
                            <span className="text-xs font-medium text-gray-500">Time Slot</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800">{getTimeSlotRange()}</p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <MapPin className="w-4 h-4 text-[#10b981]" />
                            <span className="text-xs font-medium text-gray-500">Booking ID</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800">{booking.id}</p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <span className="text-xs font-medium text-gray-500">Amount</span>
                          </div>
                          <p className="text-sm font-semibold text-[#10b981]">₹{booking.totalAmount}</p>
                          <span className="text-xs text-gray-500">Paid</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col gap-2">
                      {booking.status === 'upcoming' && (
                        <a
                          href="tel:+919876543210"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors text-sm"
                        >
                          <Phone className="w-4 h-4" />
                          Contact to Cancel
                        </a>
                      )}
                      
                      {booking.status === 'completed' && (
                        <Button variant="outline" size="sm">
                          Book Again
                        </Button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};