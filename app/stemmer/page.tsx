import { AmharicStemmerDemo } from "../components/amharic-stemmer-demo";

export default function StemmerPage() {
  return (
    <AmharicStemmerDemo
      title="Level 2 simplified Amharic light stemming."
      description="This is a simplified Amharic light stemmer. It preserves grammatical features like negation when possible, while staying explainable and safe for light stemming."
    />
  );
}
