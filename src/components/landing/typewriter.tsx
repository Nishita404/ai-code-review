"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TypewriterProps = {
  phrases: string[];
  soundEnabled?: boolean;
};

const typingDelay = 70;
const deletingDelay = 40;
const pauseDelay = 1200;

export function Typewriter({ phrases, soundEnabled = false }: TypewriterProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);

  function ensureAudioContext() {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextConstructor =
      window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    return audioContextRef.current;
  }

  const playTypingClick = useCallback(() => {
    if (!soundEnabled) {
      return;
    }

    const audioContext = ensureAudioContext();

    if (!audioContext) {
      return;
    }

    void audioContext.resume();

    const currentTime = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(1200 + Math.random() * 320, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(950 + Math.random() * 240, currentTime + 0.018);

    gainNode.gain.setValueAtTime(0.00001, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0022, currentTime + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, currentTime + 0.022);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.04);
  }, [soundEnabled]);

  useEffect(() => {
    if (!phrases.length) {
      return;
    }

    const currentPhrase = phrases[phraseIndex % phrases.length];
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (!isDeleting && charIndex < currentPhrase.length) {
      timeoutId = setTimeout(() => {
        const nextCharIndex = charIndex + 1;

        const nextChar = currentPhrase[nextCharIndex - 1];

        if (nextChar !== " ") {
          playTypingClick();
        }

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
  }, [charIndex, isDeleting, playTypingClick, phraseIndex, phrases]);

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-[0.9em] font-medium leading-none tracking-tight">
      <span className="inline-flex min-h-[1.5em] items-center">
        <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-lime-300 bg-clip-text text-transparent [text-shadow:0_0_10px_rgba(34,197,94,0.32),0_0_18px_rgba(34,211,238,0.24)]">
          {displayText}
        </span>
        <span
          className="ml-1 inline-block h-[1.2em] w-[2px] bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.6)] motion-safe:animate-pulse"
          aria-hidden="true"
        />
      </span>
    </span>
  );
}