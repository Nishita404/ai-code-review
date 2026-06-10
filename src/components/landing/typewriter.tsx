"use client";

import { useEffect, useState } from "react";

type TypewriterProps = {
  phrases: string[];
};

const typingDelay = 70;
const deletingDelay = 40;
const pauseDelay = 1200;

export function Typewriter({ phrases }: TypewriterProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (!phrases.length) {
      return;
    }

    const currentPhrase = phrases[phraseIndex % phrases.length];
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (!isDeleting && charIndex < currentPhrase.length) {
      timeoutId = setTimeout(() => {
        const nextCharIndex = charIndex + 1;

        setCharIndex(nextCharIndex);
        setDisplayText(currentPhrase.slice(0, nextCharIndex));
      }, typingDelay);
    } else if (!isDeleting && charIndex === currentPhrase.length) {
      timeoutId = setTimeout(() => {
        setIsDeleting(true);
      }, pauseDelay);
    } else if (isDeleting && charIndex > 0) {
      timeoutId = setTimeout(() => {
        const nextCharIndex = charIndex - 1;

        setCharIndex(nextCharIndex);
        setDisplayText(currentPhrase.slice(0, nextCharIndex));
      }, deletingDelay);
    } else if (isDeleting && charIndex === 0) {
      timeoutId = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((current) => (current + 1) % phrases.length);
      }, 250);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [charIndex, isDeleting, phraseIndex, phrases]);

  return (
    <span className="inline-flex min-h-[1.5em] items-center text-slate-100">
      <span>{displayText}</span>
      <span className="ml-1 inline-block h-[1.2em] w-[2px] bg-sky-400 motion-safe:animate-pulse" aria-hidden="true" />
    </span>
  );
}