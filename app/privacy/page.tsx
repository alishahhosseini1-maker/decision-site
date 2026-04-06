export default function PrivacyPage() {
    return (
      <div
        style={{
          maxWidth: 720,
          margin: '60px auto',
          padding: '0 20px',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 28, marginBottom: 20 }}>
          Privacy Policy
        </h1>
  
        <p style={{ color: '#444', marginBottom: 16 }}>
          Decision Layer stores decisions you submit in order to generate
          insights, track outcomes, and improve decision quality over time.
        </p>
  
        <p style={{ color: '#444', marginBottom: 16 }}>
          We do not sell your data. Your decisions remain private and are
          only used to provide product functionality.
        </p>
  
        <p style={{ color: '#444' }}>
          If you have questions, contact: info@decisionlayer.dev
        </p>
      </div>
    );
  }