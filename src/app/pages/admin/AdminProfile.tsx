import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { User, Shield, Mail, Phone, MapPin, LogOut, Edit2, Save, X, Lock, Calendar, CreditCard, Users } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import { deleteField, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { showErrorToast, showSuccessToast } from '../../utils/notificationHelpers';
import { isValidPhoneNumber } from '../../../utils/emailValidation';

export const AdminProfile = () => {
  const { user, logout, updatePassword, refreshCurrentUser } = useAuth();
  const { bookings, subscriptions, appSettings } = useBooking();
  const navigate = useNavigate();
  const location = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedPhone, setEditedPhone] = useState(user?.phone || '');
  const [editedLocation, setEditedLocation] = useState(user?.location || user?.address || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setEditedName(user?.name || '');
    setEditedPhone(user?.phone || '');
    setEditedLocation(user?.location || user?.address || '');
  }, [user]);

  useEffect(() => {
    const shouldEdit = Boolean((location.state as { editProfile?: boolean } | null)?.editProfile);
    if (shouldEdit) {
      setIsEditing(true);
    }
  }, [location.state]);

  const totalBookings = bookings.length;
  const totalSubscriptions = subscriptions.length;
  const activeSubscriptions = subscriptions.filter(subscription => subscription.status === 'active').length;
  const cancelledSubscriptions = subscriptions.filter(subscription => subscription.status === 'cancelled').length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSaveProfile = async () => {
    if (!user || !db) {
      showErrorToast('Error', 'Unable to save profile');
      return;
    }

    const normalizedName = editedName.trim().replace(/\s+/g, ' ');
    const normalizedPhone = editedPhone.trim();
    const normalizedLocation = editedLocation.trim();

    if (!normalizedName) {
      showErrorToast('Invalid name', 'Please enter a valid name.');
      return;
    }

    if (normalizedPhone && !isValidPhoneNumber(normalizedPhone)) {
      showErrorToast('Invalid phone number', 'Please enter a valid mobile number.');
      return;
    }

    setIsSaving(true);
    try {
      const profileUpdate = {
        name: normalizedName,
        email: user.email,
        role: user.role,
        updatedAt: new Date(),
        ...(normalizedPhone ? { phone: normalizedPhone } : { phone: deleteField() }),
        ...(normalizedLocation ? { location: normalizedLocation } : { location: deleteField() }),
      };

      await setDoc(doc(db, 'users', user.id), {
        ...profileUpdate,
      }, { merge: true });

      Object.assign(user, {
        name: normalizedName,
        phone: normalizedPhone || undefined,
        location: normalizedLocation || undefined,
      });

      await refreshCurrentUser('admin');
      showSuccessToast('Success', 'Admin profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      showErrorToast('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      showErrorToast('Error', 'Please enter a new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorToast('Error', 'Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showSuccessToast('Success', 'Password updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update password';
      showErrorToast('Error', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-800 md:text-3xl">Admin Profile</h1>
          <p className="text-sm text-gray-600 md:text-base">Manage your admin account details and security settings</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <GlassCard className="p-5 md:p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#014B33] to-[#0f6a4e] shadow-sm">
                    {user?.photoUrl ? (
                      <img src={user.photoUrl} alt={user.name} className="h-20 w-20 rounded-2xl object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <Shield className="h-3.5 w-3.5" />
                      Admin Account
                    </div>
                    {!isEditing ? (
                      <>
                        <h2 className="text-2xl font-bold text-gray-900">{user?.name || 'Admin User'}</h2>
                        <p className="text-sm text-gray-500">{user?.email || 'admin@example.com'}</p>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#014B33]"
                          placeholder="Admin name"
                        />
                        <p className="text-sm text-gray-500">{user?.email || 'admin@example.com'}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!isEditing ? (
                    <Button variant="primary" onClick={() => setIsEditing(true)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button variant="primary" onClick={handleSaveProfile} disabled={isSaving}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedName(user?.name || '');
                          setEditedPhone(user?.phone || '');
                          setEditedLocation(user?.location || user?.address || '');
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <div className="font-medium text-gray-800">{user?.email || 'Not provided'}</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                  {!isEditing ? (
                    <div className="font-medium text-gray-800">{user?.phone || 'Not provided'}</div>
                  ) : (
                    <input
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#014B33]"
                      placeholder="Enter phone number"
                    />
                  )}
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                  <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                    <MapPin className="h-4 w-4" />
                    Location
                  </div>
                  {!isEditing ? (
                    <div className="font-medium text-gray-800">{user?.location || user?.address || 'Not provided'}</div>
                  ) : (
                    <input
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#014B33]"
                      placeholder="Enter location"
                    />
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Change Password</h3>
                  <p className="text-sm text-gray-500">Update the admin account password when needed.</p>
                </div>
                <Lock className="h-5 w-5 text-[#014B33]" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#014B33]"
                  placeholder="New password"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#014B33]"
                  placeholder="Confirm password"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="primary" onClick={handleChangePassword} disabled={isChangingPassword}>
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-5 md:p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Account Overview</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Calendar className="h-4 w-4" /> Total Bookings</div>
                  <div className="mt-2 text-3xl font-bold text-[#014B33]">{totalBookings}</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500"><CreditCard className="h-4 w-4" /> Total Subscriptions</div>
                  <div className="mt-2 text-3xl font-bold text-[#014B33]">{totalSubscriptions}</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Users className="h-4 w-4" /> Active Subscriptions</div>
                  <div className="mt-2 text-3xl font-bold text-[#014B33]">{activeSubscriptions}</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Shield className="h-4 w-4" /> Cancelled Plans</div>
                  <div className="mt-2 text-3xl font-bold text-[#014B33]">{cancelledSubscriptions}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 md:p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Venue Contact</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Phone</div>
                  <div className="mt-1 font-medium text-gray-800">{typeof appSettings.landing?.venuePhone === 'string' ? appSettings.landing.venuePhone : 'Not configured'}</div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Email</div>
                  <div className="mt-1 font-medium text-gray-800">{typeof appSettings.landing?.venueEmail === 'string' ? appSettings.landing.venueEmail : 'Not configured'}</div>
                </div>
              </div>

              <Button
                variant="danger"
                onClick={handleLogout}
                className="mt-5 w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};