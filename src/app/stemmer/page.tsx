import { AmharicStemmerDemo } from "@/app/components/amharic-stemmer-demo";

export default function StemmerPage() {
  return (
    <AmharicStemmerDemo
      title="Level 2 simplified Amharic light stemming."
      description="This is a Level 2 simplified Alemayehu-style Amharic light stemmer. It preserves grammatical features like negation when possible, while staying explainable and safe for light stemming."
    />
  );
}
