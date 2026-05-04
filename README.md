# Stemmin

`Stemmin` is a Next.js + TypeScript demo for a Level 2 simplified Alemayehu-style Amharic light stemmer.

This project is presentation-friendly by design. It is a rule-based light stemmer, not a full root extractor, not a complete morphological analyzer, and not a dictionary-based citation-form stemmer.

## What the stemmer does

- Normalizes common Amharic spelling variants
- Leaves stop words unchanged
- Removes safe prefixes
- Removes suffixes iteratively
- Handles object markers separately
- Applies plural recoding
- Applies plural + possessive recoding
- Handles common possessive endings conservatively
- Handles simple negation wrappers like `አል...ም`
- Preserves some grammatical information in `features`

## Output shape

Each token is analyzed into:

```ts
type StemFeatures = {
  negated?: boolean;
  plural?: boolean;
  possessive?: boolean;
  objectMarked?: boolean;
  normalized?: boolean;
};

type StemResult = {
  original: string;
  stem: string;
  steps: string[];
  features: StemFeatures;
};
```

This lets the app preserve information that should not be silently lost. For example:

```ts
stemWordDetailed("አልሰበረም", { debug: true })
```

returns a stem like `ሰበረ`, but also preserves:

```ts
features.negated === true
```

## Rule categories

Debug steps use labeled categories:

- `NORMALIZATION`
- `STOP_WORD`
- `PREFIX`
- `STACKED_PREFIX`
- `OBJECT_SUFFIX`
- `PLURAL_POSSESSIVE_RECODE`
- `POSSESSIVE_SUFFIX`
- `PLURAL_RECODE`
- `SUFFIX`
- `VERB_SUFFIX`
- `NEGATION`
- `FALLBACK`

Example:

```txt
[NORMALIZATION] normalized: ቤቶችን
[OBJECT_SUFFIX] removed ን: ቤቶች
[PLURAL_RECODE] ቶች -> ት: ቤት
```

## Rule order

The current pipeline is:

1. Trim punctuation
2. Normalize
3. Stop-word check
4. Negation handling
5. Prefix removal
6. Suffix loop
7. Minimum-length fallback

Inside the suffix loop, the order is:

1. Object suffix removal
2. Plural-possessive recoding
3. Possessive recoding
4. Normal plural recoding
5. Generic suffix removal
6. Limited verb suffix removal

This ordering matters because the more specific Amharic noun rules should run before generic stripping.

## Current rule sets

### Prefixes

Preposition-style prefixes:

- `የ`
- `ለ`
- `በ`
- `ከ`
- `ወደ`
- `እንደ`

Verb-style prefixes:

- `ተ`
- `ይ`
- `ት`
- `እ`
- `አ`
- `አል`

Rules:

- longest-match-first
- max prefix removals = `2`
- single-letter verb prefixes are removed conservatively
- removal only happens if the remaining stem stays at or above `minStemLength`

### Negation

Pattern:

- `አል + inner + ም`

Examples:

- `አልሰበረም -> ሰበረ`
- `አልመጣም -> መጣ`

Behavior:

- remove both wrapper pieces together
- preserve `features.negated = true`

### Object suffix

Rule:

- `ን`

Example:

- `ቤቶችን -> ቤቶች -> ቤት`

Behavior:

- removed before plural recoding
- preserves `features.objectMarked = true`

### Plural-possessive recoding

Rules:

- `ቶቻችን -> ት`
- `ፎቻችን -> ፍ`
- `ሮቻችን -> ር`
- `ሎቻችን -> ል`
- `ሞቻችን -> ም`
- `ኖቻችን -> ን`
- `ዎቻችን -> ∅`
- `ዮቻችን -> ∅`

Examples:

- `ቤቶቻችን -> ቤት`
- `መጽሐፎቻችን -> መጽሐፍ`
- `መኪናዎቻችን -> መኪና`

Behavior:

- runs before normal possessive rules
- runs before normal plural recoding
- preserves `features.plural = true`
- preserves `features.possessive = true`

### Possessive suffix handling

Recoding rules:

- `ታችን -> ት`
- `ፋችን -> ፍ`
- `ራችን -> ር`
- `ላችን -> ል`
- `ማችን -> ም`
- `ናችን -> ን`

Conservative simple possessives:

- `አቸው`
- `ቸው`
- `ዬ`
- `ህ`
- `ሽ`
- `ው`
- `ዋ`

Examples:

- `ቤታችን -> ቤት`
- `መጽሐፋችን -> መጽሐፍ`

Behavior:

- preserves `features.possessive = true`
- does not remove if it would make the stem too short

### Normal plural recoding

Rules:

- `ቶች -> ት`
- `ፎች -> ፍ`
- `ሞች -> ም`
- `ሮች -> ር`
- `ሎች -> ል`
- `ኖች -> ን`
- `ዎች -> ∅`
- `ዮች -> ∅`

Examples:

- `ቤቶች -> ቤት`
- `መጽሐፎች -> መጽሐፍ`
- `መኪናዎች -> መኪና`

Behavior:

- preserves `features.plural = true`

### Generic suffixes

Prototype suffix list:

- `አቸው`
- `ቸው`
- `ዎች`
- `ዮች`
- `ኦች`
- `ውን`
- `ዋን`
- `ነት`
- `ኛ`
- `ን`
- `ው`
- `ዋ`
- `ች`
- `ም`

Behavior:

- used after the more specific rules
- still guarded by `minStemLength`

### Limited verb suffixes

Rules:

- `አል`
- `ል`
- `ች`
- `ኩ`
- `ን`
- `ህ`
- `ሽ`

Behavior:

- only applied to likely verb surfaces
- approximate only
- does not attempt full root extraction

## Safety rules

To reduce over-stemming:

- max suffix iterations = `5`
- max prefix removals = `2`
- `minStemLength` checked before every removal
- stop words remain unchanged
- single-letter prefixes are removed conservatively
- fallback returns the normalized original if the stem becomes too short

## Expected examples

These are representative current outputs:

```txt
ቤቶችን -> ቤት
መጽሐፎችን -> መጽሐፍ
የተማሪዎች -> ተማሪ
መኪናዎች -> መኪና
ትምህርትነት -> ትምህርት
እና -> እና
ቤታችን -> ቤት
መጽሐፋችን -> መጽሐፍ
ቤቶቻችን -> ቤት
መጽሐፎቻችን -> መጽሐፍ
መኪናዎቻችን -> መኪና
አልሰበረም -> ሰበረ
አልመጣም -> መጣ
```

## API

Route:

- `POST /api/stem`

Example request:

```json
{
  "text": "ቤቶችን ቤቶቻችን አልሰበረም",
  "debug": true
}
```

Example options behavior:

- `normalize` defaults to `true`
- `removePrefixes` defaults to `true`
- `removeSuffixes` defaults to `true`
- `handleNegation` defaults to `true`
- `preserveNegationFeature` defaults to `true`
- `minStemLength` defaults to `2`

## UI

The demo page shows:

- original token
- stem
- preserved features
- expandable debug steps
- a collapsed rule explanation section

## Important files

- Core stemmer: [src/lib/amharic-stemmer.ts](/C:/Users/Lenovo/Documents/ir/Stemmin/src/lib/amharic-stemmer.ts:1)
- Sample tests: [src/lib/amharic-stemmer.test.ts](/C:/Users/Lenovo/Documents/ir/Stemmin/src/lib/amharic-stemmer.test.ts:1)
- API route: [src/app/api/stem/route.ts](/C:/Users/Lenovo/Documents/ir/Stemmin/src/app/api/stem/route.ts:1)
- Demo UI: [src/app/components/amharic-stemmer-demo.tsx](/C:/Users/Lenovo/Documents/ir/Stemmin/src/app/components/amharic-stemmer-demo.tsx:1)
- Home page: [src/app/page.tsx](/C:/Users/Lenovo/Documents/ir/Stemmin/src/app/page.tsx:1)
- Stemmer page: [src/app/stemmer/page.tsx](/C:/Users/Lenovo/Documents/ir/Stemmin/src/app/stemmer/page.tsx:1)

## Run locally

```bash
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000
```
