'use client';

export default function GlobalError() {
  return (
    <html lang="en">
      <head>
        <title>System Error - BillDesk</title>
      </head>
      <body style={{
        margin: 0,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        fontFamily: 'sans-serif',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#d32f2f', margin: '0 0 8px 0' }}>Something went wrong!</h2>
        <p style={{ color: '#555', margin: '0 0 24px 0', maxWidth: '400px' }}>
          A critical system error has occurred. Please restart the application.
        </p>
        <button
          onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
          style={{
            padding: '12px 24px',
            backgroundColor: '#212121',
            color: '#fff',
            border: 'none',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </body>
    </html>
  );
}
