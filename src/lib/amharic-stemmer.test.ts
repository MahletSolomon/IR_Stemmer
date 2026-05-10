import { strict as assert } from "node:assert";
import { stemText, stemWord, stemWordDetailed } from "@/lib/amharic-stemmer";

const CASES: Array<[string, string]> = [
  ["ቀጫጭን", "ቀጭን"],
  ["ረጃጅም", "ረጅም"],
  ["አጫጭር", "አጭር"],
  ["ትላልቅ", "ትልቅ"],
  ["ትናንሽ", "ትንሽ"],
  ["ቀጭን", "ቀጭን"],
  ["ቤቶችን", "ቤት"],
  ["መጽሐፎችን", "መጽሐፍ"],
  ["መኪናዎችን", "መኪና"],
  ["የተማሪዎች", "ተማሪ"],
  ["መኪናዎች", "መኪና"],
  ["ትምህርትነት", "ትምህርት"],
  ["እና", "እና"],
  ["ቤታችን", "ቤት"],
  ["መጽሐፋችን", "መጽሐፍ"],
  ["ቤቶቻችን", "ቤት"],
  ["መጽሐፎቻችን", "መጽሐፍ"],
  ["መኪናዎቻችን", "መኪና"],
  ["አልሰበረም", "ሰበረ"],
  ["አልመጣም", "መጣ"]
];

// This helper is intentionally not auto-run because the project does not ship a test runner.
export function runAmharicStemmerSampleTests(): void {
  for (const [input, expected] of CASES) {
    assert.equal(stemWord(input), expected, `Expected "${input}" to stem to "${expected}".`);
  }

  assert.equal(
    stemWordDetailed("አልሰበረም", { debug: true }).features.negated,
    true,
    "Expected negation to be preserved as a feature."
  );

  const pluralPossessive = stemWordDetailed("ቤቶቻችን", { debug: true });
  assert.equal(
    pluralPossessive.features.plural,
    true,
    "Expected plural-possessive forms to preserve plural=true."
  );
  assert.equal(
    pluralPossessive.features.possessive,
    true,
    "Expected plural-possessive forms to preserve possessive=true."
  );

  const objectMarked = stemWordDetailed("ቤቶችን", { debug: true });
  assert.equal(
    objectMarked.features.objectMarked,
    true,
    "Expected object-marked forms to preserve objectMarked=true."
  );
  assert.equal(
    objectMarked.features.plural,
    true,
    "Expected plural forms to preserve plural=true."
  );

  const plainFinalNun = stemWordDetailed("ቀጭን", { debug: true });
  assert.equal(
    plainFinalNun.stem,
    "ቀጭን",
    "Expected plain lexical final ን to remain untouched."
  );
  assert.equal(
    plainFinalNun.steps.some((step) => step.includes("[OBJECT_SUFFIX]")),
    false,
    "Expected no object suffix step for plain lexical final ን."
  );

  const reduplicativeAdjective = stemWordDetailed("ቀጫጭን", { debug: true });
  assert.equal(
    reduplicativeAdjective.stem,
    "ቀጭን",
    "Expected reduplicative adjective forms to reduce to the base adjective."
  );
  assert.equal(
    reduplicativeAdjective.features.reduplicativeAdjective,
    true,
    "Expected reduplicative adjective feature to be preserved."
  );
  assert.equal(
    reduplicativeAdjective.features.plural,
    true,
    "Expected reduplicative adjective reduction to preserve plural=true."
  );
}

export function logAmharicStemmerSampleDebug(): void {
  const results = stemText("ቤቶችን መጽሐፎችን የተማሪዎች", { debug: true });
  console.debug(JSON.stringify(results, null, 2));
}

export function getAmharicStemmerSampleCases(): Array<[string, string]> {
  return CASES;
}

export function checkStemWordDetailed(input: string): string {
  return stemWordDetailed(input, { debug: true }).stem;
}
