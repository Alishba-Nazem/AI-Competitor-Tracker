"use client";

import { useRef, useState } from "react";
import {
  MotionLifecycleButton,
  type MotionLifecycleButtonHandle,
} from "@/components/motion-lifecycle-button";
import { fakeAnalystRequest, type AnalystRequestOutcome } from "@/lib/fake-analyst-request";

export function MotionDemoClient() {
  const buttonRef = useRef<MotionLifecycleButtonHandle>(null);
  const outcomeRef = useRef<AnalystRequestOutcome>("random");
  const [locked, setLocked] = useState(false);

  function startWith(outcome: AnalystRequestOutcome) {
    outcomeRef.current = outcome;
    buttonRef.current?.reset();
    buttonRef.current?.run();
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#163e62]">UI motion assignment</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Motion Button Lifecycle</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          A reusable “Send to AI Analyst” control that communicates progress through motion: idle, hover, press,
          loading, then success or error — without shifting layout.
        </p>

        <div className="mt-8 flex justify-center">
          <MotionLifecycleButton
            ref={buttonRef}
            disabled={locked}
            onSubmit={(signal) => {
              const outcome = outcomeRef.current;
              outcomeRef.current = "random";
              return fakeAnalystRequest({ signal, outcome });
            }}
            successText="Analysis complete"
            errorText="Try again"
          >
            Send to AI Analyst
          </MotionLifecycleButton>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" className="button-secondary" onClick={() => startWith("success")}>
            Test Success
          </button>
          <button type="button" className="button-secondary" onClick={() => startWith("error")}>
            Test Error
          </button>
          <button type="button" className="button-secondary" onClick={() => buttonRef.current?.reset()}>
            Reset
          </button>
        </div>

        <label className="mt-4 flex items-center justify-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#163e62]"
            checked={locked}
            onChange={(event) => {
              setLocked(event.target.checked);
              if (event.target.checked) buttonRef.current?.reset();
            }}
          />
          Show disabled state
        </label>

        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold text-slate-900">Lifecycle</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-stone-600">
            <li>
              <span className="font-semibold text-slate-800">Idle → Hover → Loading → Success</span>
              <span className="mt-0.5 block">
                Click the main button, or use Test Success. The label fades into Analyzing… then a checkmark and
                Analysis complete, then returns to idle.
              </span>
            </li>
            <li>
              <span className="font-semibold text-slate-800">Idle → Hover → Loading → Error</span>
              <span className="mt-0.5 block">
                Use Test Error. The spinner becomes an error icon with Try again. One short shake, then click Try
                again to restart.
              </span>
            </li>
          </ol>
        </section>

        <section className="mt-6 rounded-lg bg-slate-50 px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Motion decisions</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Motion is used to communicate state rather than decorate the button. Short 100–150ms interactions make
            hover and press feedback feel immediate, while 250–350ms state transitions give loading, success, and
            error changes enough time to be perceived without slowing the interaction. Animations primarily use
            transform and opacity to remain compositor-friendly. Error movement is intentionally brief and is removed
            when prefers-reduced-motion is enabled.
          </p>
        </section>
      </article>
    </div>
  );
}
