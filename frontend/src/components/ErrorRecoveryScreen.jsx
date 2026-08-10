// components/ErrorRecoveryScreen.jsx

import { useEffect, useState } from "react";

export default function ErrorRecoveryScreen({ error }) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          window.location.href = "/";

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[99999]">
      <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
        <h1 className="text-2xl font-bold text-purple-500 mb-4">
          Entschuldigen Sie die Unannehmlichkeiten
        </h1>

        <p className="text-slate-600 mb-3">
          Bei der Anwendung traten unerwartete Ergebnisse auf.
        </p>

        <p className="text-slate-500">
          Lösung...
        </p>

        <div className="text-4xl font-bold mt-4">
          {countdown}
        </div>

        {/* <div className="mt-4 text-xs text-slate-400">
          Redirecting to Home Page
        </div> */}

        {import.meta.env.DEV && (
          <pre className="mt-4 text-left text-xs overflow-auto max-h-40 bg-slate-100 p-2 rounded">
            {String(error)}
          </pre>
        )}
      </div>
    </div>
  );
}