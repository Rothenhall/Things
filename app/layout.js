import './globals.css';

export const metadata = {
  title: 'Things by Rothenhall',
  description: 'Build a 3D plush character. Change the fur, face and outfit, then boop it. Open source.'
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f7f3ea' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Jost:ital,wght@0,300..600;1,300..600&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
