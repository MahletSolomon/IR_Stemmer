export type StemOptions = {
  normalize?: boolean;
  removePrefixes?: boolean;
  removeSuffixes?: boolean;
  minStemLength?: number;
  debug?: boolean;
};

export type StemResult = {
  original: string;
  stem: string;
  steps: string[];
};

export type StemCandidate = {
  stem: string;
  steps: string[];
  score: number;
};

type RuleCategory =
  | "NORMALIZATION"
  | "STOP_WORD"
  | "PREFIX"
  | "STACKED_PREFIX"
  | "PLURAL_POSSESSIVE_RECODE"
  | "SUFFIX"
  | "POSSESSIVE_SUFFIX"
  | "OBJECT_SUFFIX"
  | "PLURAL_RECODE"
  | "NEGATION"
  | "VERB_SUFFIX"
  | "FALLBACK";

type CandidateState = StemCandidate & {
  original: string;
  prefixRemovals: number;
  singleLetterRemovals: number;
  pluralApplied: boolean;
  pluralPossessiveApplied: boolean;
  possessiveApplied: boolean;
  objectRemoved: boolean;
  negationRemoved: boolean;
  genericSuffixRemoved: boolean;
  verbSuffixRemoved: boolean;
  prefixApplied: boolean;
};

type PrefixGroup = {
  category: "PREFIX" | "STACKED_PREFIX";
  items: string[];
};

type PluralRule = {
  ending: string;
  replacement: string;
};

type PluralPossessiveRule = {
  ending: string;
  replacement: string;
};

type PossessiveRule = {
  ending: string;
  replacement: string;
  recoded: boolean;
};

type GenericSuffixRule = {
  ending: string;
};

export type StemmerRules = {
  prefixes: {
    prepositionPrefixes: string[];
    verbPrefixes: string[];
  };
  suffixes: string[];
  pluralRecodingRules: PluralRule[];
  pluralPossessiveRecodingRules: PluralPossessiveRule[];
  possessiveRules: PossessiveRule[];
  stopWords: string[];
  maxIterations: number;
  maxPrefixRemovals: number;
  minDefaultStemLength: number;
};

const DEFAULT_OPTIONS: Required<StemOptions> = {
  normalize: true,
  removePrefixes: true,
  removeSuffixes: true,
  minStemLength: 2,
  debug: false
};

// Prototype-only light stemmer: no dictionary, no root extraction, no full morphology.
const STOP_WORDS = new Set([
  "እኔ",
  "አንተ",
  "አንቺ",
  "እሱ",
  "እሷ",
  "እኛ",
  "እነሱ",
  "ነው",
  "ናት",
  "ናቸው",
  "ነበር",
  "እና",
  "ግን",
  "ወይም",
  "ስለ",
  "ውስጥ"
]);

const prepositionPrefixes = ["ወደ", "እንደ", "የ", "ለ", "በ", "ከ"];
const verbPrefixes = ["አል", "ተ", "ይ", "ት", "እ", "አ"];

const PREFIX_GROUPS: PrefixGroup[] = [
  { category: "PREFIX", items: prepositionPrefixes },
  { category: "STACKED_PREFIX", items: verbPrefixes }
];

const PLURAL_RULES: PluralRule[] = [
  { ending: "ቶች", replacement: "ት" },
  { ending: "ፎች", replacement: "ፍ" },
  { ending: "ሞች", replacement: "ም" },
  { ending: "ሮች", replacement: "ር" },
  { ending: "ሎች", replacement: "ል" },
  { ending: "ኖች", replacement: "ን" },
  { ending: "ዎች", replacement: "" },
  { ending: "ዮች", replacement: "" }
];

const PLURAL_POSSESSIVE_RULES: PluralPossessiveRule[] = [
  { ending: "ቶቻችን", replacement: "ት" },
  { ending: "ፎቻችን", replacement: "ፍ" },
  { ending: "ሮቻችን", replacement: "ር" },
  { ending: "ሎቻችን", replacement: "ል" },
  { ending: "ሞቻችን", replacement: "ም" },
  { ending: "ኖቻችን", replacement: "ን" },
  { ending: "ዎቻችን", replacement: "" },
  { ending: "ዮቻችን", replacement: "" }
];

const POSSESSIVE_RULES: PossessiveRule[] = [
  { ending: "ታችን", replacement: "ት", recoded: true },
  { ending: "ፋችን", replacement: "ፍ", recoded: true },
  { ending: "ራችን", replacement: "ር", recoded: true },
  { ending: "ላችን", replacement: "ል", recoded: true },
  { ending: "ማችን", replacement: "ም", recoded: true },
  { ending: "ናችን", replacement: "ን", recoded: true },
  { ending: "አችን", replacement: "", recoded: false },
  { ending: "ችን", replacement: "", recoded: false },
  { ending: "አቸው", replacement: "", recoded: false },
  { ending: "ቸው", replacement: "", recoded: false },
  { ending: "ቱ", replacement: "ት", recoded: true },
  { ending: "ቷ", replacement: "ት", recoded: true },
  { ending: "ዬ", replacement: "", recoded: false },
  { ending: "ህ", replacement: "", recoded: false },
  { ending: "ሽ", replacement: "", recoded: false },
  { ending: "ው", replacement: "", recoded: false },
  { ending: "ዋ", replacement: "", recoded: false },
  { ending: "ኡ", replacement: "", recoded: false },
  { ending: "ዋን", replacement: "", recoded: false },
  { ending: "ውን", replacement: "", recoded: false }
];

const GENERIC_SUFFIXES: GenericSuffixRule[] = [
  { ending: "አቸው" },
  { ending: "ቸው" },
  { ending: "ዎች" },
  { ending: "ዮች" },
  { ending: "ኦች" },
  { ending: "ውን" },
  { ending: "ዋን" },
  { ending: "ነት" },
  { ending: "ኛ" },
  { ending: "ን" },
  { ending: "ው" },
  { ending: "ዋ" },
  { ending: "ች" },
  { ending: "ም" }
];

const VERB_SUFFIXES = ["አል", "ል", "ች", "ኩ", "ን", "ህ", "ሽ"];

const MAX_SUFFIX_ITERATIONS = 5;
const MAX_PREFIX_REMOVALS = 2;
const EDGE_PUNCTUATION =
  /^[\s"'`~!@#$%^&*()\-_=+[{\]}\\|;:'",<.>/?።፣፤፥፦፧፨]+|[\s"'`~!@#$%^&*()\-_=+[{\]}\\|;:'",<.>/?።፣፤፥፦፧፨]+$/gu;

const NORMALIZATION_MAP: Record<string, string> = {
  ሃ: "ሀ",
  ሑ: "ሁ",
  ኁ: "ሁ",
  ሒ: "ሂ",
  ኂ: "ሂ",
  ሔ: "ሄ",
  ኄ: "ሄ",
  ሕ: "ህ",
  ኅ: "ህ",
  ሖ: "ሆ",
  ኆ: "ሆ",
  ሠ: "ሰ",
  ሡ: "ሱ",
  ሢ: "ሲ",
  ሣ: "ሳ",
  ሤ: "ሴ",
  ሥ: "ስ",
  ሦ: "ሶ",
  ዐ: "አ",
  አ: "አ",
  ዑ: "ኡ",
  ዒ: "ኢ",
  ዓ: "አ",
  ዔ: "ኤ",
  ዕ: "እ",
  ዖ: "ኦ",
  ፀ: "ጸ",
  ፁ: "ጹ",
  ፂ: "ጺ",
  ፃ: "ጻ",
  ፄ: "ጼ",
  ፅ: "ጽ",
  ፆ: "ጾ"
};

function mergeOptions(options?: StemOptions): Required<StemOptions> {
  const settings = {
    ...DEFAULT_OPTIONS,
    ...options
  };

  return settings;
}

function trimEdgePunctuation(word: string): string {
  return word.replace(EDGE_PUNCTUATION, "");
}

function safeLengthAfterCut(word: string, removeCount: number, minStemLength: number): boolean {
  return word.length - removeCount >= minStemLength;
}

function recordStep(steps: string[], enabled: boolean, category: RuleCategory, message: string): void {
  if (enabled) {
    steps.push(`[${category}] ${message}`);
  }
}

function normalizedForLookup(input: string, normalize: boolean): string {
  const trimmed = trimEdgePunctuation(input.trim());
  return normalize ? normalizeAmharic(trimmed) : trimmed;
}

function isSingleLetterVerbPrefix(prefix: string): boolean {
  return ["ይ", "ት", "እ", "አ"].includes(prefix);
}

function hasVerbCue(normalizedWord: string): boolean {
  return (
    normalizedWord.startsWith("አል") ||
    normalizedWord.endsWith("ል") ||
    normalizedWord.endsWith("ች") ||
    normalizedWord.endsWith("ኩ") ||
    normalizedWord.endsWith("ን") ||
    normalizedWord.endsWith("ህ") ||
    normalizedWord.endsWith("ሽ")
  );
}

function hasPluralLikeNounEnding(word: string): boolean {
  return [
    "ቶ",
    "ፎ",
    "ሞ",
    "ሮ",
    "ሎ",
    "ኖ",
    "ዎ",
    "ዮ",
    "ነት",
    "ኛ"
  ].some((ending) => word.endsWith(ending));
}

function applyPrefixRemovals(
  word: string,
  normalizedWord: string,
  settings: Required<StemOptions>,
  steps: string[],
  debug: boolean,
  originalNormalized: string
): CandidateState {
  let current = word;
  let currentNormalized = normalizedWord;
  let prefixRemovals = 0;
  let singleLetterRemovals = 0;
  let prefixApplied = false;

  while (prefixRemovals < MAX_PREFIX_REMOVALS) {
    let removed = false;

    for (const group of PREFIX_GROUPS) {
      const match = group.items.find((prefix) => currentNormalized.startsWith(prefix));
      if (!match) {
        continue;
      }

      if (
        match.length === 1 &&
        isSingleLetterVerbPrefix(match) &&
        current.length > 6 &&
        !hasVerbCue(currentNormalized)
      ) {
        continue;
      }

      if (group.category === "STACKED_PREFIX" && !shouldRemoveVerbPrefix(currentNormalized, match)) {
        continue;
      }

      if (!safeLengthAfterCut(current, match.length, settings.minStemLength)) {
        continue;
      }

      current = current.slice(match.length);
      currentNormalized = normalizedForLookup(current, settings.normalize);
      prefixRemovals += 1;
      prefixApplied = true;
      if (match.length === 1) {
        singleLetterRemovals += 1;
      }

      const category = prefixRemovals === 1 ? "PREFIX" : "STACKED_PREFIX";
      recordStep(steps, debug, category, `removed ${match}: ${current}`);
      removed = true;
      break;
    }

    if (!removed) {
      break;
    }
  }

  return {
    original: word,
    stem: current,
    steps: [...steps],
    score: 0,
    prefixRemovals,
    singleLetterRemovals,
    pluralApplied: false,
    pluralPossessiveApplied: false,
    possessiveApplied: false,
    objectRemoved: false,
    negationRemoved: false,
    genericSuffixRemoved: false,
    verbSuffixRemoved: false,
    prefixApplied
  };
}

function hasNominalEnding(normalizedWord: string): boolean {
  return [
    "ታችን",
    "ፋችን",
    "ራችን",
    "ላችን",
    "ማችን",
    "ናችን",
    "አችን",
    "ችን",
    "አቸው",
    "ቸው",
    "ዋን",
    "ውን",
    "ዎች",
    "ዮች",
    "ኦች",
    "ነት",
    "ኛ",
    "ው",
    "ዋ",
    "ቱ",
    "ቷ",
    "ህ",
    "ሽ",
    "ኡ",
    "ን",
    "ም"
  ].some((ending) => normalizedWord.endsWith(ending));
}

function shouldRemoveVerbPrefix(normalizedWord: string, prefix: string): boolean {
  if (prefix === "አል") {
    return true;
  }

  if (isSingleLetterVerbPrefix(prefix)) {
    return !hasNominalEnding(normalizedWord) && normalizedWord.length >= 5;
  }

  return !hasNominalEnding(normalizedWord) && normalizedWord.length > 4;
}

function tryHandleNegation(
  word: string,
  normalizedWord: string,
  minStemLength: number,
  steps: string[],
  debug: boolean
): string {
  if (!normalizedWord.startsWith("አል") || !normalizedWord.endsWith("ም")) {
    return word;
  }

  const inner = word.slice(2, -1);
  if (inner.length < minStemLength) {
    return word;
  }

  recordStep(steps, debug, "NEGATION", `removed negative wrapper አል...ም: ${inner}`);
  return inner;
}

function tryRemoveObjectSuffix(
  word: string,
  normalizedWord: string,
  minStemLength: number,
  steps: string[],
  debug: boolean
): string {
  if (!normalizedWord.endsWith("ን")) {
    return word;
  }

  if (!safeLengthAfterCut(word, 1, minStemLength)) {
    return word;
  }

  const next = word.slice(0, -1);
  recordStep(steps, debug, "OBJECT_SUFFIX", `removed ን: ${next}`);
  return next;
}

function tryApplyPossessiveRule(
  word: string,
  normalizedWord: string,
  minStemLength: number,
  steps: string[],
  debug: boolean
): { next: string; applied: boolean } {
  for (const rule of POSSESSIVE_RULES) {
    if (!normalizedWord.endsWith(rule.ending)) {
      continue;
    }

    const stemPart = word.slice(0, -rule.ending.length);
    if (hasPluralLikeNounEnding(stemPart)) {
      continue;
    }

    const next = `${stemPart}${rule.replacement}`;
    if (next.length < minStemLength) {
      continue;
    }

    const verb = rule.recoded ? "recoded" : "removed";
    recordStep(steps, debug, "POSSESSIVE_SUFFIX", `${verb} ${rule.ending} -> ${rule.replacement || "∅"}: ${next}`);
    return { next, applied: true };
  }

  return { next: word, applied: false };
}

function tryApplyPluralRecode(
  word: string,
  normalizedWord: string,
  minStemLength: number,
  steps: string[],
  debug: boolean
): { next: string; applied: boolean } {
  for (const { ending, replacement } of PLURAL_RULES) {
    if (!normalizedWord.endsWith(ending)) {
      continue;
    }

    const next = `${word.slice(0, -ending.length)}${replacement}`;
    if (next.length < minStemLength) {
      continue;
    }

    recordStep(steps, debug, "PLURAL_RECODE", `${ending} -> ${replacement || "∅"}: ${next}`);
    return { next, applied: true };
  }

  return { next: word, applied: false };
}

function tryApplyPluralPossessiveRecode(
  word: string,
  normalizedWord: string,
  minStemLength: number,
  steps: string[],
  debug: boolean
): { next: string; applied: boolean } {
  for (const { ending, replacement } of PLURAL_POSSESSIVE_RULES) {
    if (!normalizedWord.endsWith(ending)) {
      continue;
    }

    const next = `${word.slice(0, -ending.length)}${replacement}`;
    if (next.length < minStemLength) {
      continue;
    }

    recordStep(
      steps,
      debug,
      "PLURAL_POSSESSIVE_RECODE",
      `${ending} -> ${replacement || "∅"}: ${next}`
    );
    return { next, applied: true };
  }

  return { next: word, applied: false };
}

function tryRemoveGenericSuffix(
  word: string,
  normalizedWord: string,
  minStemLength: number,
  steps: string[],
  debug: boolean
): { next: string; applied: boolean } {
  for (const rule of GENERIC_SUFFIXES) {
    if (!normalizedWord.endsWith(rule.ending)) {
      continue;
    }

    if (!safeLengthAfterCut(word, rule.ending.length, minStemLength)) {
      continue;
    }

    const next = word.slice(0, -rule.ending.length);
    recordStep(steps, debug, "SUFFIX", `removed ${rule.ending}: ${next}`);
    return { next, applied: true };
  }

  return { next: word, applied: false };
}

function tryRemoveVerbSuffix(
  word: string,
  normalizedWord: string,
  minStemLength: number,
  steps: string[],
  debug: boolean
): { next: string; applied: boolean } {
  if (!isLikelyVerbSurface(normalizedWord)) {
    return { next: word, applied: false };
  }

  for (const suffix of VERB_SUFFIXES) {
    if (!normalizedWord.endsWith(suffix)) {
      continue;
    }

    if (!safeLengthAfterCut(word, suffix.length, minStemLength)) {
      continue;
    }

    const next = word.slice(0, -suffix.length);
    recordStep(steps, debug, "VERB_SUFFIX", `removed ${suffix}: ${next}`);
    return { next, applied: true };
  }

  return { next: word, applied: false };
}

function isLikelyVerbSurface(normalizedWord: string): boolean {
  return (
    normalizedWord.startsWith("ይ") ||
    normalizedWord.startsWith("ት") ||
    normalizedWord.startsWith("አል") ||
    normalizedWord.endsWith("ል") ||
    normalizedWord.endsWith("ች") ||
    normalizedWord.endsWith("ኩ")
  );
}

function adjustScore(candidate: CandidateState, settings: Required<StemOptions>): number {
  let score = 0;

  if (candidate.pluralApplied) score += 3;
  if (candidate.pluralPossessiveApplied) score += 3;
  if (candidate.objectRemoved) score += 2;
  if (candidate.possessiveApplied) score += 2;
  if (candidate.negationRemoved) score += 2;
  if (candidate.genericSuffixRemoved) score += 1;
  if (candidate.verbSuffixRemoved) score += 1;
  score += Math.min(candidate.prefixRemovals, 2);

  if (candidate.singleLetterRemovals > 1) score -= 2;
  if (candidate.stem.length < settings.minStemLength) score -= 5;
  if (candidate.stem.length <= 2 && settings.minStemLength > 2) score -= 2;

  return score;
}

function cloneCandidate(candidate: CandidateState): CandidateState {
  return {
    ...candidate,
    steps: [...candidate.steps]
  };
}

function finalizeCandidate(candidate: CandidateState, settings: Required<StemOptions>): StemCandidate {
  return {
    stem: candidate.stem,
    steps: candidate.steps,
    score: adjustScore(candidate, settings)
  };
}

function chooseBestCandidate(candidates: CandidateState[], settings: Required<StemOptions>): StemCandidate {
  const finalized = candidates.map((candidate) => finalizeCandidate(candidate, settings));
  finalized.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.stem.length !== left.stem.length) return right.stem.length - left.stem.length;
    return left.steps.length - right.steps.length;
  });
  return finalized[0];
}

function runSuffixPass(
  candidate: CandidateState,
  settings: Required<StemOptions>,
  debug: boolean,
  includeVerbSuffixes: boolean
): CandidateState {
  let current = cloneCandidate(candidate);

  for (let iteration = 0; iteration < MAX_SUFFIX_ITERATIONS; iteration += 1) {
    const normalizedCurrent = normalizedForLookup(current.stem, settings.normalize);
    let applied = false;

    const pluralPossessive = tryApplyPluralPossessiveRecode(
      current.stem,
      normalizedCurrent,
      settings.minStemLength,
      current.steps,
      debug
    );
    if (pluralPossessive.applied) {
      current.stem = pluralPossessive.next;
      current.pluralPossessiveApplied = true;
      applied = true;
      continue;
    }

    const possessive = tryApplyPossessiveRule(
      current.stem,
      normalizedCurrent,
      settings.minStemLength,
      current.steps,
      debug
    );
    if (possessive.applied) {
      current.stem = possessive.next;
      current.possessiveApplied = true;
      applied = true;
      continue;
    }

    const objectRemoved = tryRemoveObjectSuffix(
      current.stem,
      normalizedCurrent,
      settings.minStemLength,
      current.steps,
      debug
    );
    if (objectRemoved !== current.stem) {
      current.stem = objectRemoved;
      current.objectRemoved = true;
      applied = true;
      continue;
    }

    const plural = tryApplyPluralRecode(
      current.stem,
      normalizedCurrent,
      settings.minStemLength,
      current.steps,
      debug
    );
    if (plural.applied) {
      current.stem = plural.next;
      current.pluralApplied = true;
      applied = true;
      continue;
    }

    const generic = tryRemoveGenericSuffix(
      current.stem,
      normalizedCurrent,
      settings.minStemLength,
      current.steps,
      debug
    );
    if (generic.applied) {
      current.stem = generic.next;
      current.genericSuffixRemoved = true;
      applied = true;
      continue;
    }

    if (includeVerbSuffixes) {
      const verb = tryRemoveVerbSuffix(
        current.stem,
        normalizedCurrent,
        settings.minStemLength,
        current.steps,
        debug
      );
      if (verb.applied) {
        current.stem = verb.next;
        current.verbSuffixRemoved = true;
        applied = true;
        continue;
      }
    }

    if (!applied) {
      break;
    }
  }

  return current;
}

function analyzeWord(word: string, options?: StemOptions): StemResult {
  const settings = mergeOptions(options);
  const original = word;

  let current = trimEdgePunctuation(word.trim());
  if (!current) {
    return { original, stem: original, steps: [] };
  }

  const normalizedOriginal = normalizedForLookup(current, settings.normalize);
  let normalizedCurrent = normalizedOriginal;
  const baseSteps: string[] = [];

  if (settings.normalize) {
    recordStep(baseSteps, settings.debug, "NORMALIZATION", `normalized: ${normalizedOriginal}`);
  }

  if (STOP_WORDS.has(normalizedOriginal)) {
    recordStep(baseSteps, settings.debug, "STOP_WORD", `stop word: ${current}`);
    return { original, stem: current, steps: baseSteps };
  }

  const negated = tryHandleNegation(
    current,
    normalizedCurrent,
    settings.minStemLength,
    baseSteps,
    settings.debug
  );
  if (negated !== current) {
    current = negated;
    normalizedCurrent = normalizedForLookup(current, settings.normalize);
  }

  const prefixSeed = applyPrefixRemovals(
    current,
    normalizedCurrent,
    settings,
    baseSteps,
    settings.debug,
    normalizedOriginal
  );
  const prefixCandidate: CandidateState = {
    ...prefixSeed,
    steps: [...prefixSeed.steps]
  };

  const noVerbCandidate = runSuffixPass(prefixCandidate, settings, settings.debug, false);
  const fullCandidate = runSuffixPass(prefixCandidate, settings, settings.debug, true);

  const best = chooseBestCandidate([noVerbCandidate, fullCandidate], settings);
  let stem = best.stem;

  if (stem.length < settings.minStemLength) {
    const fallbackSteps = [...best.steps];
    recordStep(fallbackSteps, settings.debug, "FALLBACK", `min length fallback: ${normalizedOriginal}`);
    return { original, stem: normalizedOriginal || original, steps: fallbackSteps };
  }

  return {
    original,
    stem,
    steps: best.steps
  };
}

export function normalizeAmharic(input: string): string {
  return Array.from(input, (char) => NORMALIZATION_MAP[char] ?? char).join("");
}

export function stemWordDetailed(word: string, options?: StemOptions): StemResult {
  return analyzeWord(word, options);
}

export function stemWord(word: string, options?: StemOptions): string {
  return stemWordDetailed(word, options).stem;
}

export function stemText(text: string, options?: StemOptions): StemResult[] {
  if (!text.trim()) {
    return [];
  }

  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => stemWordDetailed(token, options));
}

export function isAmharicStopWord(word: string): boolean {
  return STOP_WORDS.has(normalizedForLookup(word, true));
}

export function getStemmerRules(): StemmerRules {
  return {
    prefixes: {
      prepositionPrefixes,
      verbPrefixes
    },
    suffixes: GENERIC_SUFFIXES.map((rule) => rule.ending),
    pluralRecodingRules: PLURAL_RULES,
    pluralPossessiveRecodingRules: PLURAL_POSSESSIVE_RULES,
    possessiveRules: POSSESSIVE_RULES,
    stopWords: [...STOP_WORDS],
    maxIterations: MAX_SUFFIX_ITERATIONS,
    maxPrefixRemovals: MAX_PREFIX_REMOVALS,
    minDefaultStemLength: DEFAULT_OPTIONS.minStemLength
  };
}

export function logAmharicStemmerDebugSample(): StemResult[] {
  const results = stemText("ቤቶችን መጽሐፎችን የተማሪዎች", { debug: true });
  console.debug("Amharic stemmer sample:", JSON.stringify(results, null, 2));
  return results;
}
