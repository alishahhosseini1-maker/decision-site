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
          Lumen stores the evidence and company data you submit to the ledger.
          Submissions are shared with everyone using the ledger by design —
          this is a crowdsourced product, not a private workspace.
        </p>

        <p style={{ color: '#444', marginBottom: 16 }}>
          We do not sell your data. A locally generated, anonymous identifier
          is used to attribute contributions; we do not collect names,
          emails, or other account information.
        </p>

        <p style={{ color: '#444' }}>
          Contact your site administrator with questions.
        </p>
      </div>
    );
  }
