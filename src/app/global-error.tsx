"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f5f7fb", color: "#1a2233" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1>Pupmeow hit a snag</h1>
          <p>Please refresh the page.</p>
          <button onClick={reset} style={{ padding: "10px 20px", borderRadius: 999, border: 0, background: "#1a2233", color: "#fff", fontWeight: 700 }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
