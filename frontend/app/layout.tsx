import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { ConfigProvider } from '../contexts/ConfigContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'AppGen — Config-Driven Application Generator',
  description: 'Generate fully working web apps from JSON configuration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <ConfigProvider>
            <LanguageProvider>
              {children}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    fontSize: '13px',
                  },
                  success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
                }}
              />
            </LanguageProvider>
          </ConfigProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
