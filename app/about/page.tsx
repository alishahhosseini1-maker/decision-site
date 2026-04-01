export default function AboutPage() {
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
          About Decision Layer
        </h1>
  
        <p style={{ color: '#444', fontSize: 16 }}>
          Decision Layer helps individuals and teams pressure-test decisions before they commit.
        </p>
      </div>
    );
  }