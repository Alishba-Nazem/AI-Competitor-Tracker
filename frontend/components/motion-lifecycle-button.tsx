"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isAbortError } from "@/lib/fake-analyst-request";

export type ButtonState = "idle" | "loading" | "success" | "error";

export type MotionLifecycleButtonHandle = {
  run: () => void;
  reset: () => void;
  getState: () => ButtonState;
};

type MotionLifecycleButtonProps = {
  children: ReactNode;
  onSubmit: (signal: AbortSignal) => Promise<void>;
  successText?: string;
  errorText?: string;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
};

const HOVER_MS = 0.15;
const PRESS_MS = 0.1;
const SWAP_MS = 0.28;
const SUCCESS_HOLD_MS = 1600;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

export const MotionLifecycleButton = forwardRef<MotionLifecycleButtonHandle, MotionLifecycleButtonProps>(
  function MotionLifecycleButton(
    {
      children,
      onSubmit,
      successText = "Analysis complete",
      errorText = "Try again",
      loadingText = "Analyzing...",
      disabled = false,
      className = "",
    },
    ref,
  ) {
    const reduceMotion = useReducedMotion();
    const liveId = useId();
    const [state, setState] = useState<ButtonState>("idle");
    const stateRef = useRef<ButtonState>("idle");
    const generationRef = useRef(0);
    const abortRef = useRef<AbortController | null>(null);
    const onSubmitRef = useRef(onSubmit);
    onSubmitRef.current = onSubmit;

    const setButtonState = useCallback((next: ButtonState) => {
      stateRef.current = next;
      setState(next);
    }, []);

    const busy = state === "loading" || state === "success";
    const locked = disabled;
    const nativeDisabled = locked || busy;

    const reset = useCallback(() => {
      generationRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setButtonState("idle");
    }, [setButtonState]);

    const run = useCallback(() => {
      if (disabled || stateRef.current === "loading" || stateRef.current === "success") return;

      const generation = generationRef.current + 1;
      generationRef.current = generation;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setButtonState("loading");

      void onSubmitRef
        .current(controller.signal)
        .then(() => {
          if (generation !== generationRef.current || controller.signal.aborted) return;
          setButtonState("success");
        })
        .catch((error: unknown) => {
          if (generation !== generationRef.current || controller.signal.aborted || isAbortError(error)) return;
          setButtonState("error");
        });
    }, [disabled, setButtonState]);

    useImperativeHandle(ref, () => ({ run, reset, getState: () => stateRef.current }), [run, reset]);

    useEffect(() => {
      if (state !== "success") return;
      const generation = generationRef.current;
      const timer = window.setTimeout(() => {
        if (generation !== generationRef.current) return;
        setButtonState("idle");
      }, SUCCESS_HOLD_MS);
      return () => window.clearTimeout(timer);
    }, [setButtonState, state]);

    useEffect(() => {
      return () => {
        abortRef.current?.abort();
      };
    }, []);

    const label =
      state === "loading" ? loadingText : state === "success" ? successText : state === "error" ? errorText : children;

    const liveText =
      state === "loading"
        ? loadingText
        : state === "success"
          ? successText
          : state === "error"
            ? "Analysis failed. Try again."
            : "";

    return (
      <span className="inline-flex">
      <motion.button
        type="button"
        className={`motion-lifecycle-btn ${toneClass(state, locked)} ${className}`}
        data-locked={locked ? "true" : "false"}
        disabled={nativeDisabled}
        aria-busy={state === "loading"}
        aria-disabled={nativeDisabled}
        aria-describedby={liveId}
        onClick={run}
        whileHover={!reduceMotion && !nativeDisabled ? { y: -2, scale: 1.02, transition: { duration: HOVER_MS, ease: EASE_OUT } } : undefined}
        whileTap={!reduceMotion && !nativeDisabled ? { y: 0, scale: 0.97, transition: { duration: PRESS_MS, ease: EASE_OUT } } : undefined}
        animate={!reduceMotion && state === "error" ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ x: { duration: reduceMotion ? 0 : 0.35, ease: EASE_IN_OUT } }}
        style={{ transformOrigin: "center" }}
      >
        <span className="relative grid min-h-6 min-w-[13.5rem] place-items-center">
          <span className="invisible col-start-1 row-start-1 inline-flex items-center gap-2 whitespace-nowrap px-1 text-sm font-semibold" aria-hidden="true">
            <span className="inline-block h-4 w-4" />
            {longestLabel(children, loadingText, successText, errorText)}
          </span>
          <AnimatePresence initial={false} mode="sync">
            <motion.span
              key={state}
              className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={{ duration: reduceMotion ? 0.12 : SWAP_MS, ease: EASE_IN_OUT }}
            >
              <StatusIcon state={state} reduceMotion={Boolean(reduceMotion)} />
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.button>
        <span id={liveId} className="sr-only" aria-live="polite">
          {liveText}
        </span>
      </span>
    );
  },
);

MotionLifecycleButton.displayName = "MotionLifecycleButton";

function longestLabel(...labels: Array<ReactNode | string>) {
  const texts = labels.map((item) => (typeof item === "string" ? item : "Send to AI Analyst"));
  return texts.reduce((longest, text) => (text.length > longest.length ? text : longest), "");
}

function toneClass(state: ButtonState, locked: boolean) {
  if (locked) {
    return "border border-slate-200 bg-slate-200 text-stone-500";
  }
  if (state === "success") {
    return "border border-emerald-700 bg-emerald-700 text-white";
  }
  if (state === "error") {
    return "border border-rose-800 bg-rose-800 text-white";
  }
  return "border border-transparent bg-[#163e62] text-white";
}

function StatusIcon({ state, reduceMotion }: { state: ButtonState; reduceMotion: boolean }) {
  if (state === "idle") {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
        <path
          d="M3 8h10M9.5 4.5 13 8l-3.5 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (state === "loading") {
    return (
      <motion.svg
        viewBox="0 0 16 16"
        className="h-4 w-4"
        aria-hidden="true"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { repeat: Infinity, duration: 0.8, ease: "linear" }}
      >
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.8" />
        <circle
          cx="8"
          cy="8"
          r="5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="10 24"
        />
      </motion.svg>
    );
  }

  if (state === "success") {
    return (
      <motion.svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" initial={false}>
        <motion.path
          d="M3.2 8.4 6.3 11.4 12.8 4.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: EASE_OUT }}
        />
      </motion.svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.4 5.4 10.6 10.6M10.6 5.4 5.4 10.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
