import { Outlet } from 'react-router';
import { AuthProvider } from '../context/AuthContext';
import { BookingProvider } from '../context/BookingContext';
import { LandingPageProvider } from '../context/LandingPageContext';
import { NotificationProvider } from '../context/NotificationContext';
import { Toaster } from 'sonner';

export const RootLayout = () => {
  return (
    <AuthProvider>
      <BookingProvider>
        <LandingPageProvider>
          <NotificationProvider>
            <div className="font-['Poppins'] min-h-screen bg-white">
              <Outlet />
              <Toaster 
                position="top-right" 
                richColors 
                closeButton
                toastOptions={{
                  style: {
                    fontFamily: 'Poppins',
                  },
                }}
              />
            </div>
          </NotificationProvider>
        </LandingPageProvider>
      </BookingProvider>
    </AuthProvider>
  );
};