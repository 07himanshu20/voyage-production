import './globals.css';

export const metadata = {
  title: 'Best Class Chauffeurs | Operations Portal',
  description: 'Premium Chauffeur Services Management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
