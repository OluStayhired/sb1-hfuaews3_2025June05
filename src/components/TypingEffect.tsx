// src/components/TypingEffect.tsx

import React, { useState, useEffect } from 'react';

interface TypingEffectProps {
  text: string; // The full text to be displayed with a typing effect
  speed?: number; // Optional: Speed of typing in milliseconds per character (default to 50ms)
  onComplete?: () => void; // Optional: Callback function when typing is complete
}

export function TypingEffect({ text, speed = 50, onComplete }: TypingEffectProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeoutId = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeoutId); // Cleanup the timeout if the component unmounts or props change
    } else {
      // Typing is complete
      if (onComplete) {
        onComplete();
      }
    }
  }, [text, speed, currentIndex, onComplete]); // Re-run effect when text, speed, or currentIndex changes

  return <>{displayedText}</>; // Render the gradually displayed text
}
