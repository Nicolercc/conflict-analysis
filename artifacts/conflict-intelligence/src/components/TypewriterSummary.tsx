import { useState, useEffect } from "react";

export function TypewriterSummary({ text, active }: { text: string; active: boolean }) {
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!active) return;
    
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [text, active]);

  return (
    <div className="font-serif text-lg leading-relaxed text-[#c8eac8] p-6 bg-[#030f05] border border-[#1a5c20] shadow-inner">
      {displayed}
      {isTyping && <span className="animate-[pulse_0.8s_ease-in-out_infinite] text-[#00dd55] inline-block ml-1">▌</span>}
    </div>
  );
}
