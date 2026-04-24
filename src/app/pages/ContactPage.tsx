import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle, MessageCircle, HelpCircle, Calendar, Navigation, ChevronDown } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useLandingPage } from '../context/LandingPageContext';
import { useEffect } from 'react';

const quickActionIcons = {
  Calendar,
  MessageCircle,
  HelpCircle,
};

const actionStyles: Record<string, { container: string; icon: string }> = {
  emerald: { container: 'bg-emerald-100', icon: 'text-emerald-600' },
  blue: { container: 'bg-blue-100', icon: 'text-blue-600' },
  purple: { container: 'bg-purple-100', icon: 'text-purple-600' },
};

export const ContactPage = () => {
  const navigate = useNavigate();
  const { content } = useLandingPage();
  const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
  const API_BASE_URL =
    typeof window !== 'undefined' && window.location.hostname.includes('localhost')
      ? '/api'
      : RAW_API_BASE_URL;
  const venueAddress = content.venueAddress || '';
  const mapsLink = venueAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}` : 'https://www.google.com/maps';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [isCheckRepliesOpen, setIsCheckRepliesOpen] = useState(false);
  const [checkEmail, setCheckEmail] = useState('');
  const [checkMessages, setCheckMessages] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckReplies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkEmail.trim()) return;

    setIsChecking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contact-messages-by-email?email=${encodeURIComponent(checkEmail)}`);
      const payload = await response.json().catch(() => null);
      if (response.ok && Array.isArray(payload?.messages)) {
        setCheckMessages(payload.messages.filter((msg: any) => msg.adminReply));
      } else {
        setCheckMessages([]);
      }
    } catch {
      setCheckMessages([]);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch(`${API_BASE_URL}/contact-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Unable to send your message right now. Please try again.');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send your message right now. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const loadUserMessages = async (email: string) => {
    if (!email.trim()) {
      setUserMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contact-messages-by-email?email=${encodeURIComponent(email)}`);
      const payload = await response.json().catch(() => null);
      if (response.ok && Array.isArray(payload?.messages)) {
        setUserMessages(payload.messages.filter((msg: any) => msg.adminReply));
      } else {
        setUserMessages([]);
      }
    } catch {
      setUserMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email) {
        void loadUserMessages(formData.email);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.email, API_BASE_URL]);

  const quickActions = Array.isArray(content.contactQuickActions) ? content.contactQuickActions : [];
  const faqs = Array.isArray(content.contactFaqs) ? content.contactFaqs : [];

  const handleQuickAction = (action: typeof quickActions[number]) => {
    if (action.actionType === 'navigate') {
      navigate(action.actionValue || '/');
      return;
    }

    if (action.actionType === 'phone') {
      window.open(`tel:${action.actionValue}`);
      return;
    }

    if (action.actionType === 'scroll') {
      document.getElementById('contact-faqs')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-bold mb-4"
          >
            Get in Touch
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-emerald-50 max-w-2xl mx-auto"
          >
            We're here to help! Whether you have questions, need support, or want to give feedback
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-12 -mt-8">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard
                className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={() => handleQuickAction(action)}
              >
                <div className={`w-12 h-12 ${actionStyles[action.color]?.container || 'bg-gray-100'} rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {(() => {
                    const ActionIcon = quickActionIcons[action.icon as keyof typeof quickActionIcons] || Calendar;
                    return <ActionIcon className={`w-6 h-6 ${actionStyles[action.color]?.icon || 'text-gray-600'}`} />;
                  })()}
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Contact Info Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Phone */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="p-5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">Call Us</h3>
                    <a
                      href={content.venuePhone ? `tel:${content.venuePhone}` : '#'}
                      className="block text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-1 transition-colors"
                    >
                      {content.venuePhone || ''}
                    </a>
                    <a
                      href={content.venueEmail ? `mailto:${content.venueEmail}` : '#'}
                      className="block text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      {content.venueEmail || ''}
                    </a>
                    <p className="text-xs text-gray-500 mt-2">Available 7 days a week</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Email */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard className="p-5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">Email Us</h3>
                    <a
                      href={content.venueEmail ? `mailto:${content.venueEmail}` : '#'}
                      className="block text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-1 transition-colors"
                    >
                      {content.venueEmail || ''}
                    </a>
                    <p className="text-xs text-gray-500 mt-2">Response within 24 hours</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Location */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <GlassCard className="p-5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">Visit Us</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {content.venueName || ''}<br />
                      {venueAddress}
                    </p>
                    <button
                      onClick={() => window.open(mapsLink, '_blank')}
                      className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      Get Directions
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Hours */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <GlassCard className="p-5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">Operating Hours</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{content.venueOperatingHoursText || '5:00 AM - 11:00 PM (All Days)'}</p>
                    <div className="mt-3 px-2 py-1 bg-green-100 rounded text-xs font-medium text-green-700 inline-block">
                      Open Now
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard className="p-6 md:p-8">
                <div className="mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Send us a Message</h2>
                  <p className="text-gray-600">Fill out the form below and we'll get back to you as soon as possible</p>
                </div>

                {submitted ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Message Sent Successfully!</h3>
                    <p className="text-gray-600 text-center max-w-md mb-6">
                      Thank you for reaching out to us. Our team will review your message and respond within 24 hours.
                    </p>
                    <Button
                      onClick={() => setSubmitted(false)}
                      variant="outline"
                      className="mt-4"
                    >
                      Send Another Message
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {submitError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {submitError}
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Your Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                          placeholder="John Doe"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                          placeholder="+91 98765 43210"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Subject <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        >
                          <option value="">Select a subject</option>
                          <option value="booking">Booking Inquiry</option>
                          <option value="cancellation">Cancellation Request</option>
                          <option value="payment">Payment Issue</option>
                          <option value="feedback">Feedback</option>
                          <option value="general">General Question</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Your Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all"
                        placeholder="Tell us how we can help you..."
                      />
                      <p className="text-xs text-gray-500 mt-2">Please provide as much detail as possible</p>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        className="px-8 py-3 text-base"
                        disabled={submitting}
                      >
                        <Send className="w-5 h-5 mr-2" />
                        {submitting ? 'Sending...' : 'Send Message'}
                      </Button>
                      <p className="text-sm text-gray-500 hidden sm:block">We typically respond within 24 hours</p>
                      <button
                        type="button"
                        onClick={() => setIsCheckRepliesOpen(true)}
                        className="ml-auto flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition-all duration-300 font-semibold border border-emerald-200 hover:shadow-md active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Check Replies
                      </button>
                    </div>
                  </form>
                )}
              </GlassCard>
            </motion.div>

            {/* Your Messages Section */}
            {formData.email && userMessages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
                id="your-messages"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Messages</h2>
                <div className="space-y-3">
                  {userMessages.map((msg) => (
                    <GlassCard key={msg.id} className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm">{msg.subject}</h3>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                msg.adminReply
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {msg.adminReply ? '✓ Replied' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{msg.createdAt?.split('T')[0]}</p>
                          <p className="text-xs text-gray-700">{msg.message}</p>
                        </div>

                        {msg.adminReply && (
                          <div className="bg-green-100 border border-green-200 p-3 rounded-lg">
                            <p className="text-xs font-semibold text-green-800 mb-1">💚 Admin Reply</p>
                            <p className="text-xs text-green-800">{msg.adminReply}</p>
                            <p className="text-xs text-green-600 mt-1">by {msg.adminReplyBy}</p>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </motion.div>
            )}

            {/* FAQs Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <div id="contact-faqs" />
              <GlassCard className="p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  {faqs.length > 0 ? faqs.map((faq) => (
                    <div key={faq.id} className="pb-4 border-b border-gray-200 last:border-0">
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-start gap-2">
                        <HelpCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        {faq.question}
                      </h4>
                      <p className="text-gray-600 text-sm ml-7">{faq.answer}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500">FAQ content will appear once it is added in Firestore.</p>
                  )}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center">
                    Can't find what you're looking for?{' '}
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      Contact us directly
                    </button>
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>

      <Dialog open={isCheckRepliesOpen} onOpenChange={setIsCheckRepliesOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">Check Your Messages</DialogTitle>
            <DialogDescription>
              Enter the email address you used to send your message to see our replies.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCheckReplies} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={checkEmail}
                  onChange={(e) => setCheckEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <Button type="submit" variant="primary" disabled={isChecking}>
                  {isChecking ? 'Checking...' : 'Check'}
                </Button>
              </div>
            </div>
          </form>

          {checkMessages.length > 0 ? (
            <div className="mt-6 space-y-3">
              <h4 className="font-semibold text-gray-800">Your Messages</h4>
              {checkMessages.map((msg) => (
                <div key={msg.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm">{msg.subject}</h3>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        msg.adminReply
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {msg.adminReply ? '✓ Replied' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{msg.createdAt?.split('T')[0]}</p>
                  <p className="text-xs text-gray-700">{msg.message}</p>

                  {msg.adminReply && (
                    <div className="mt-3 bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-green-800 mb-1">💚 Admin Reply</p>
                      <p className="text-xs text-green-800">{msg.adminReply}</p>
                      {msg.adminReplyBy && <p className="text-xs text-green-600 mt-1">by {msg.adminReplyBy}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : checkEmail && !isChecking && (
            <div className="mt-4 p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
              No replies found for this email address.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};