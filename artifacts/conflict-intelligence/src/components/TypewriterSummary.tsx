import { useState, useEffect } from "react";

export function TypewriterSummary({ text, active }: { text: string; active: boolean }) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active || !text) return;
    setOut("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, 18);
    return () => clearInterval(interval);
  }, [text, active]);

  return (
    <span style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "16px", lineHeight: "1.75", color: "var(--text-secondary)" }}>
      {out}
      {!done && active && <span className="cursor-blink">|</span>}
    </span>
  );
}
