import { AmharicStemmerDemo } from "@/app/components/amharic-stemmer-demo";

export default function HomePage() {
  return (
    <AmharicStemmerDemo
      eyebrow="Stemmin"
      title="Use the Level 2 Amharic light stemmer across the frontend."
      description="This interface now uses the Level 2 simplified Alemayehu-style Amharic light stemmer. It normalizes spelling variants, strips stacked prefixes safely, handles object and possessive suffixes, applies limited plural recoding, and records rule categories in the debug trace."
      note="This is a Level 2 simplified Alemayehu-style Amharic light stemmer. It extends basic affix stripping with Amharic-specific plural recoding, possessive suffix handling, object marker removal, and simple negation handling. It is still not a full root extractor, complete morphological analyzer, or dictionary-based citation-form stemmer."
    />
  );
}
