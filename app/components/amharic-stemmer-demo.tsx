"use client";

import { Fragment, FormEvent, useMemo, useState } from "react";
import {
  getStemmerRules,
  stemText,
  type StemFeatures,
  type StemResult
} from "@/lib/amharic-stemmer";

const DEFAULT_TEXT = "ቤቶችን የተማሪዎች መኪናዎች";
const DEFAULT_NOTE =
  "This is a Level 2 simplified Alemayehu-style Amharic light stemmer. It normalizes Amharic spelling variants, removes safe prefixes and suffixes, handles object markers, plural recoding, possessive endings, plural-possessive forms, and simple negation wrappers. Negation is preserved as a feature because it changes meaning. The stemmer does not perform full root extraction, complete morphological analysis, or dictionary-based citation-form disambiguation.";

const EXAMPLES = [
  "ቤቶችን",
  "መጽሐፎችን",
  "የተማሪዎች",
  "ቤታችን",
  "ቤቶቻችን",
  "መጽሐፎቻችን",
  "አልሰበረም",
  "አልመጣም",
  "መኪናዎች"
];

type AmharicStemmerDemoProps = {
  title: string;
  eyebrow?: string;
  description: string;
  note?: string;
};

type RuleCard = {
  title: string;
  value: string;
};

const FEATURE_ORDER: Array<keyof StemFeatures> = [
  "negated",
  "plural",
  "possessive",
  "objectMarked",
  "normalized"
];

function formatRulePairs(
  rules: ReadonlyArray<{ ending: string; replacement: string }>
) {
  return rules
    .map(({ ending, replacement }) => `${ending} -> ${replacement || "∅"}`)
    .join(" · ");
}

function formatFeatureLabels(features: StemFeatures): string[] {
  return FEATURE_ORDER.filter((key) => features[key]).map((key) => key);
}

export function AmharicStemmerDemo({
  title,
  eyebrow = "Amharic Light Stemmer",
  description,
  note
}: AmharicStemmerDemoProps) {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [debug, setDebug] = useState(true);
  const [results, setResults] = useState<StemResult[]>(() =>
    stemText(DEFAULT_TEXT, { debug: true })
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rules = useMemo(() => getStemmerRules(), []);

  const hasResults = results.length > 0;
  const previewCount = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).length,
    [text]
  );

  const ruleCards: RuleCard[] = useMemo(
    () => [
      {
        title: "Preposition prefixes",
        value: rules.prefixes.prepositionPrefixes.join(", ")
      },
      {
        title: "Verb prefixes",
        value: rules.prefixes.verbPrefixes.join(", ")
      },
      {
        title: "Suffixes",
        value: rules.suffixes.join(", ")
      },
      {
        title: "Plural recoding",
        value: formatRulePairs(rules.pluralRecodingRules)
      },
      {
        title: "Plural + possessive",
        value: formatRulePairs(rules.pluralPossessiveRecodingRules)
      },
      {
        title: "Possessives",
        value: formatRulePairs(rules.possessiveRules)
      },
      {
        title: "Stop words",
        value: rules.stopWords.join(", ")
      },
      {
        title: "Safety limits",
        value: `Max iterations: ${rules.maxIterations} · Max prefix removals: ${rules.maxPrefixRemovals} · Minimum stem length: ${rules.minDefaultStemLength}`
      }
    ],
    [rules]
  );

  async function runStemmer(nextText: string) {
    setIsSubmitting(true);
    setError(null);
    setText(nextText);

    try {
      const response = await fetch("/api/stem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: nextText, debug })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Failed to stem text.");
      }

      const payload = (await response.json()) as { results: StemResult[] };
      setResults(payload.results);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to stem text.";
      setError(message);
      setResults([]);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runStemmer(text);
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-slate-900 sm:px-6 lg:px-8 lg:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(22,101,52,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(15,118,110,0.16),_transparent_30%),linear-gradient(160deg,#f4efe7,#d8e7df)]"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex flex-col justify-center gap-5 py-3 lg:py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
              {eyebrow}
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              {description}
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-7">
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-600">Amharic text</span>
                <textarea
                  className="min-h-[190px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={DEFAULT_TEXT}
                  rows={7}
                />
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  checked={debug}
                  onChange={(event) => setDebug(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  type="checkbox"
                />
                <span>Include debug steps</span>
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-700 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-wait disabled:opacity-70"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Stemming..." : "Stem Text"}
                </button>
                <span className="text-sm text-slate-500">{previewCount} token(s) queued</span>
              </div>
            </form>

            <div className="mt-7 grid gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Example inputs
              </h2>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-wait disabled:opacity-70"
                    disabled={isSubmitting}
                    type="button"
                    onClick={() => void runStemmer(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
          </div>
        </section>

        <section className="w-full">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-emerald-700">
                Stemmed output
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Token-by-token stemming
              </h2>
            </div>
            <span className="text-sm text-slate-500">
              {hasResults ? `${results.length} result(s)` : "No results yet"}
            </span>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Original
                    </th>
                    <th className="px-6 py-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Stem
                    </th>
                    <th className="px-6 py-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Features
                    </th>
                    <th className="px-6 py-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Steps
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {hasResults ? (
                    results.map((result, index) => {
                      const featureLabels = formatFeatureLabels(result.features);

                      return (
                        <Fragment key={`${result.original}-${index}`}>
                          <tr className="align-top">
                            <td className="px-6 py-5 text-lg font-medium text-slate-950">
                              {result.original}
                            </td>
                            <td className="px-6 py-5 text-lg font-semibold text-emerald-800">
                              {result.stem}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-wrap gap-2">
                                {featureLabels.length ? (
                                  featureLabels.map((feature) => (
                                    <span
                                      key={feature}
                                      className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800"
                                    >
                                      {feature}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-500">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-slate-500">
                              {result.steps.length ? "Collapsed below" : "No debug steps"}
                            </td>
                          </tr>
                          <tr className="align-top">
                            <td className="px-6 pb-6 pt-0" colSpan={4}>
                              {result.steps.length ? (
                                <details className="group">
                                  <summary className="flex list-none cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
                                    <span>Steps</span>
                                    <span className="text-slate-500 group-open:hidden">
                                      Expand to inspect
                                    </span>
                                    <span className="hidden text-slate-500 group-open:inline">
                                      Collapse
                                    </span>
                                  </summary>
                                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                                    <ul className="space-y-2 text-sm leading-6 text-slate-700">
                                      {result.steps.map((step, stepIndex) => (
                                        <li
                                          key={`${result.original}-${stepIndex}`}
                                          className="rounded-xl bg-slate-50 px-3 py-2"
                                        >
                                          {step}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </details>
                              ) : (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                  No debug steps.
                                </div>
                              )}
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-6 py-8 text-sm text-slate-500" colSpan={4}>
                        Enter Amharic text and run the stemmer to inspect results.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="w-full">
          <details className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <summary className="flex list-none cursor-pointer items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-emerald-700">
                  Rules
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Rule explanation and stemmer rules
                </h2>
              </div>
              <span className="pt-2 text-sm text-slate-500">Collapsed by default</span>
            </summary>

            <div className="mt-6 flex">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-5">
                <h3 className="text-lg font-semibold text-slate-950">Stemmer rules</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {note ?? DEFAULT_NOTE}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {ruleCards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {card.title}
                      </h4>
                      <p className="mt-3 break-words text-sm leading-7 text-slate-600">
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
