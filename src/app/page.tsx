import { AmharicStemmerDemo } from "@/app/components/amharic-stemmer-demo";

export default function HomePage() {
  return (
    <AmharicStemmerDemo
      eyebrow="Stemmin"
      title="የአማርኛ ስር ቃል"
      description="This interface uses a simplified Alemayehu-style Amharic light stemmer. It normalizes spelling variants, strips stacked prefixes safely, handles object and possessive suffixes, applies limited plural recoding, and records rule categories in the debug trace."
    />
  );
}
