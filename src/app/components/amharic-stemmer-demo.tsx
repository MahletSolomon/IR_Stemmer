"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  getStemmerRules,
  stemText,
  type StemResult
} from "@/lib/amharic-stemmer";

const DEFAULT_TEXT = "ቤቶችን የተማሪዎች መኪናዎች";

type AmharicStemmerDemoProps = {
  title: string;
  eyebrow?: string;
  description: string;
  note?: string;
};

const EXAMPLES = [
  "ቤቶችን",
  "መጽሐፎችን",
  "የተማሪዎች",
  "ቤታችን",
  "አልሰበረም",
  "መኪናዎች"
];

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
    <main className="shell">
      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="lede">{description}</p>
        </div>

        <div className="panel">
          <form className="stemmerForm" onSubmit={handleSubmit}>
            <label className="field">
              <span>Amharic text</span>
              <textarea
                className="stemmerTextarea"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={DEFAULT_TEXT}
                rows={7}
              />
            </label>

            <label className="checkRow">
              <input
                checked={debug}
                onChange={(event) => setDebug(event.target.checked)}
                type="checkbox"
              />
              <span>Include debug steps</span>
            </label>

            <div className="stemmerActions">
              <button className="actionButton" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Stemming..." : "Stem Text"}
              </button>
              <span className="mutedCopy">{previewCount} token(s) queued</span>
            </div>
          </form>

          <div className="exampleSection">
            <h2>Example Inputs</h2>
            <div className="exampleButtons">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  className="exampleButton"
                  disabled={isSubmitting}
                  type="button"
                  onClick={() => void runStemmer(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="errorText">{error}</p> : null}
        </div>
      </section>

      <section className="results">
        <div className="sectionHeading">
          <h2>Stemmed output</h2>
          <span>{hasResults ? `${results.length} result(s)` : "No results yet"}</span>
        </div>

        <div className="tableWrap">
          <table className="stemmerTable">
            <thead>
              <tr>
                <th>Original</th>
                <th>Stem</th>
                <th>Rule count</th>
                <th>Steps</th>
              </tr>
            </thead>
            <tbody>
              {hasResults ? (
                results.map((result, index) => (
                  <tr key={`${result.original}-${index}`}>
                    <td>{result.original}</td>
                    <td>{result.stem}</td>
                    <td>{result.steps.length}</td>
                    <td>
                      {result.steps.length ? (
                        <ul className="stepList">
                          {result.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      ) : (
                        "No debug steps"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>Enter Amharic text and run the stemmer to inspect results.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="results ruleGrid">
        <div className="rulePanel">
          <h2>Rule Explanation</h2>
          <p>
            This is a Level 2 simplified Alemayehu-style Amharic light stemmer. It extends
            basic affix stripping with Amharic-specific plural recoding, possessive suffix
            handling, object marker removal, and simple negation handling. It is still not a
            full root extractor, complete morphological analyzer, or dictionary-based
            citation-form stemmer.
          </p>
        </div>

        <div className="rulePanel">
          <h2>Stemmer Rules</h2>
          <div className="ruleColumns">
            <div>
              <h3>Preposition prefixes</h3>
              <p>{rules.prefixes.prepositionPrefixes.join(", ")}</p>
            </div>
            <div>
              <h3>Verb prefixes</h3>
              <p>{rules.prefixes.verbPrefixes.join(", ")}</p>
            </div>
            <div>
              <h3>Suffixes</h3>
              <p>{rules.suffixes.join(", ")}</p>
            </div>
            <div>
              <h3>Plural recoding</h3>
              <p>{rules.pluralRecodingRules.map((rule) => `${rule.ending} -> ${rule.replacement || "∅"}`).join(" · ")}</p>
            </div>
            <div>
              <h3>Plural + possessive</h3>
              <p>{rules.pluralPossessiveRecodingRules.map((rule) => `${rule.ending} -> ${rule.replacement || "∅"}`).join(" · ")}</p>
            </div>
            <div>
              <h3>Possessives</h3>
              <p>{rules.possessiveRules.map((rule) => `${rule.ending} -> ${rule.replacement || "∅"}`).join(" · ")}</p>
            </div>
            <div>
              <h3>Stop words</h3>
              <p>{rules.stopWords.join(", ")}</p>
            </div>
            <div>
              <h3>Safety limits</h3>
              <p>
                Max iterations: {rules.maxIterations} · Max prefix removals:{" "}
                {rules.maxPrefixRemovals} · Minimum stem length: {rules.minDefaultStemLength}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="results">
        <p className="stemmerNote">
          {note ??
            "This is a Level 2 simplified Alemayehu-style Amharic light stemmer. It extends basic affix stripping with Amharic-specific plural recoding, possessive suffix handling, object marker removal, and simple negation handling. It is still not a full root extractor, complete morphological analyzer, or dictionary-based citation-form stemmer."}
        </p>
      </section>
    </main>
  );
}
