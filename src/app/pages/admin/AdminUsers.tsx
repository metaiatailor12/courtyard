import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Users } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { getAPI_BASE_URL } from '../../lib/apiConfig';
import { getCurrentUserToken } from '../../lib/firebaseClient';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { showErrorToast } from '../../utils/notificationHelpers';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
  status: string;
  bookings: number;
  subscriptions?: number;
  joinedAt: string;
  updatedAt?: string;
};

export const AdminUsers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      if (!user) {
        setUsers([]);
        return;
      }

      setLoading(true);

      try {
        const token = await getCurrentUserToken();
        if (!token) {
          setUsers([]);
          return;
        }

        const response = await fetch(`${getAPI_BASE_URL()}/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json().catch(() => null);
        if (!active || !response.ok) {
          throw new Error(payload?.error?.message || 'Unable to load users');
        }

        setUsers(Array.isArray(payload?.users) ? payload.users : []);
      } catch (error) {
        if (active) {
          setUsers([]);
          const message = error instanceof Error ? error.message : 'Unable to load users';
          showErrorToast('User management unavailable', message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      active = false;
    };
  }, [user]);

  const totalUsers = users.length;
  const activeUsers = users.filter((item) => item.status !== 'Inactive').length;
  const subscribers = users.filter((item) => item.status === 'Subscriber').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 text-sm md:text-base"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          Back to Dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">User Management</h1>
          <p className="text-gray-600">View registered users, subscription status, and account activity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <GlassCard className="p-6">
            <p className="text-green-900 text-sm font-medium mb-2">Total Users</p>
            <p className="text-3xl font-bold text-gray-800">{totalUsers.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-2">Live users from database</p>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-green-900 text-sm font-medium mb-2">Active Users</p>
            <p className="text-3xl font-bold text-gray-800">{activeUsers.toLocaleString()}</p>
            <p className="text-xs text-green-900 mt-2">Registered and active users</p>
          </GlassCard>
          <GlassCard className="p-6">
            <p className="text-purple-600 text-sm font-medium mb-2">Subscribers</p>
            <p className="text-3xl font-bold text-gray-800">{subscribers.toLocaleString()}</p>
            <p className="text-xs text-purple-600 mt-2">Users with active subscriptions</p>
          </GlassCard>
        </div>

        <GlassCard className="p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">All Users</h2>
                <p className="text-sm text-gray-600">Currently registered accounts in the system.</p>
              </div>
            </div>

            <div />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600">No users found in the database.</div>
            ) : (
              users.map((adminUser) => (
                <div key={adminUser.id} className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-900 to-green-800 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {adminUser.name
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{adminUser.name}</p>
                      <p className="text-sm text-gray-600 truncate">{adminUser.email}</p>
                      {adminUser.phone && <p className="text-xs text-gray-500 truncate">{adminUser.phone}</p>}
                    </div>
                  </div>

                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-500">Bookings</p>
                    <p className="font-semibold text-gray-800">{adminUser.bookings}</p>
                    <p className="text-xs text-gray-500 mt-1">Joined {format(new Date(adminUser.joinedAt), 'MMM yyyy')}</p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      adminUser.status === 'Admin'
                        ? 'bg-red-100 text-red-700'
                        : adminUser.status === 'Subscriber'
                          ? 'bg-purple-100 text-purple-700'
                          : adminUser.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {adminUser.status}
                  </span>

                  <Button variant="secondary" onClick={() => setSelectedUser(adminUser)}>
                    View Details
                  </Button>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">User Details</h2>
                <p className="text-sm text-gray-600">Review account and activity information</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close user details"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-900 to-green-800 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                  {selectedUser.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold text-gray-800 truncate">{selectedUser.name}</h3>
                  <p className="text-gray-600 truncate">{selectedUser.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedUser.status === 'Admin' ? 'bg-red-100 text-red-700' : selectedUser.status === 'Subscriber' ? 'bg-purple-100 text-purple-700' : selectedUser.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {selectedUser.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {selectedUser.role || 'user'} role
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Phone</p>
                  <p className="mt-1 font-medium text-gray-800">{selectedUser.phone || 'Not provided'}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Bookings</p>
                  <p className="mt-1 font-medium text-gray-800">{selectedUser.bookings}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Subscriptions</p>
                  <p className="mt-1 font-medium text-gray-800">{selectedUser.subscriptions ?? 0}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Joined</p>
                  <p className="mt-1 font-medium text-gray-800">{format(new Date(selectedUser.joinedAt), 'dd MMM yyyy')}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Last updated</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {selectedUser.updatedAt ? format(new Date(selectedUser.updatedAt), 'dd MMM yyyy, h:mm a') : 'Not available'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="secondary" onClick={() => setSelectedUser(null)} className="flex-1">
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => showErrorToast('Coming soon', 'User editing is not available yet.')}
                  className="flex-1"
                >
                  Edit User
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
