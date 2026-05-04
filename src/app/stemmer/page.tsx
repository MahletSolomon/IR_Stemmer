import { AmharicStemmerDemo } from "@/app/components/amharic-stemmer-demo";

export default function StemmerPage() {
  return (
    <AmharicStemmerDemo
      title="Level 2 simplified Amharic light stemming."
      description="This is a Level 2 simplified Alemayehu-style Amharic light stemmer. It extends basic affix stripping with Amharic-specific plural recoding, possessive suffix handling, object marker removal, and simple negation handling. It is still not a full root extractor, complete morphological analyzer, or dictionary-based citation-form stemmer."
      note="This is a Level 2 simplified Alemayehu-style Amharic light stemmer. It extends basic affix stripping with Amharic-specific plural recoding, possessive suffix handling, object marker removal, and simple negation handling. It is still not a full root extractor, complete morphological analyzer, or dictionary-based citation-form stemmer."
    />
  );
}
