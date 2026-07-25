import { AuthProvider } from '../hooks/useAuth';
import NavbarWrapper from '../components/NavbarWrapper';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata = {
  title: 'blog',
  description: 'A clean and scalable blogging platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-white">
        <AuthProvider>
          <Toaster position="bottom-right" />
          <NavbarWrapper>
            {children}
          </NavbarWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
