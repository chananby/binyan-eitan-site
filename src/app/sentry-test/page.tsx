"use client";
export default function SentryTest() {
  return (
    <button
      onClick={() => {
        throw new Error("Sentry test error from binyaneitan");
      }}
    >
      Throw Test Error
    </button>
  );
}
