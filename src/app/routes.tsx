import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { LandingPage } from "./pages/LandingPage";
import { UnifiedLogin } from "./pages/UnifiedLogin";
import { SignupPage } from "./pages/SignupPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { UserLogin } from "./pages/user/UserLogin";
import { UserRegister } from "./pages/user/UserRegister";
import { UserHome } from "./pages/user/UserHome";
import { UserPhotos } from "./pages/user/UserPhotos";
import { BookingPage } from "./pages/user/BookingPage";
import { PaymentPage } from "./pages/user/PaymentPage";
import { BookingConfirmation } from "./pages/user/BookingConfirmation";
import { UserBookingHistory } from "./pages/user/UserBookingHistory";
import { SubscriptionPage } from "./pages/user/SubscriptionPage";
import { ProfilePage } from "./pages/user/ProfilePage";
import { ContactPage } from "./pages/ContactPage";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminBookings } from "./pages/admin/AdminBookings";
import { AdminRevenuePage } from "./pages/admin/AdminRevenuePage";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { AdminGalleryPage } from "./pages/admin/AdminGalleryPage";
import { AdminPhotosPage } from "./pages/admin/AdminPhotosPage";
import { AdminReviews } from "./pages/admin/AdminReviews";
import { AdminMessages } from "./pages/admin/AdminMessages";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { NotFound } from "./pages/NotFound";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    // Router configuration
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: "login",
        element: <UnifiedLogin />,
      },
      {
        path: "signup",
        element: <SignupPage />,
      },
      {
        path: "verify-email",
        element: <VerifyEmailPage />,
      },
      {
        path: "user/login",
        element: <UnifiedLogin />,
      },
      {
        path: "user/forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "user/reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "user/register",
        element: <UserRegister />,
      },
      {
        path: "user/home",
        element: <ProtectedRoute requiredRole="user" requireEmailVerification={true}><UserHome /></ProtectedRoute>,
      },
      {
        path: "user/photos",
        element: <ProtectedRoute requiredRole="user" requireEmailVerification={true}><UserPhotos /></ProtectedRoute>,
      },
      {
        path: "user/booking",
        element: <ProtectedRoute requiredRole="user" requireEmailVerification={true}><BookingPage /></ProtectedRoute>,
      },
      {
        path: "user/payment",
        element: <ProtectedRoute requiredRole="user" requireEmailVerification={true}><PaymentPage /></ProtectedRoute>,
      },
      {
        path: "user/booking-confirmation",
        element: <ProtectedRoute requiredRole="user" requireEmailVerification={true}><BookingConfirmation /></ProtectedRoute>,
      },
      {
        path: "user/history",
        element: <ProtectedRoute requiredRole="user" requireEmailVerification={true}><UserBookingHistory /></ProtectedRoute>,
      },
      {
        path: "user/subscription",
        element: <ProtectedRoute requiredRole="user" requireEmailVerification={true}><SubscriptionPage /></ProtectedRoute>,
      },
      {
        path: "user/profile",
        element: <ProtectedRoute requiredRole="user" requireEmailVerification={true}><ProfilePage /></ProtectedRoute>,
      },
      {
        path: "contact",
        element: <ContactPage />,
      },
      {
        path: "auth/callback",
        element: <AuthCallbackPage />,
      },
      {
        path: "admin",
        element: <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>,
      },
      {
        path: "admin/login",
        element: <UnifiedLogin />,
      },
      {
        path: "admin/forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "admin/reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "admin/dashboard",
        element: <ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>,
      },
      {
        path: "admin/users",
        element: <ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>,
      },
      {
        path: "admin/bookings",
        element: <ProtectedRoute requiredRole="admin"><AdminBookings /></ProtectedRoute>,
      },
      {
        path: "admin/revenue",
        element: <ProtectedRoute requiredRole="admin"><AdminRevenuePage /></ProtectedRoute>,
      },
      {
        path: "admin/settings",
        element: <ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>,
      },
      {
        path: "admin/reviews",
        element: <ProtectedRoute requiredRole="admin"><AdminReviews /></ProtectedRoute>,
      },
      {
        path: "admin/messages",
        element: <ProtectedRoute requiredRole="admin"><AdminMessages /></ProtectedRoute>,
      },
      {
        path: "admin/settings/gallery",
        element: <ProtectedRoute requiredRole="admin"><AdminGalleryPage /></ProtectedRoute>,
      },
      {
        path: "admin/photos",
        element: <ProtectedRoute requiredRole="admin"><AdminPhotosPage /></ProtectedRoute>,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);
