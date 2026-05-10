import { NextRequest, NextResponse } from "next/server";
import { getStemmerRules, stemText } from "@/lib/amharic-stemmer";

type StemApiRequest = {
  text?: unknown;
  debug?: unknown;
  normalize?: unknown;
  removePrefixes?: unknown;
  removeSuffixes?: unknown;
  handleNegation?: unknown;
  preserveNegationFeature?: unknown;
  minStemLength?: unknown;
};

export async function POST(request: NextRequest) {
  let body: StemApiRequest;

  try {
    body = (await request.json()) as StemApiRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (typeof body.text !== "string") {
    return NextResponse.json({ error: "`text` must be a string." }, { status: 400 });
  }

  const options = {
    debug: body.debug === true,
    normalize: body.normalize !== false,
    removePrefixes: body.removePrefixes !== false,
    removeSuffixes: body.removeSuffixes !== false,
    handleNegation: body.handleNegation !== false,
    preserveNegationFeature: body.preserveNegationFeature !== false,
    minStemLength:
      typeof body.minStemLength === "number" && body.minStemLength > 0
        ? body.minStemLength
        : 2
  };

  return NextResponse.json({
    results: stemText(body.text, options),
    meta: {
      algorithm: "Simplified Amharic Light Stemmer",
      features: [
        "normalization",
        "prefix stripping",
        "object suffix stripping",
        "plural recoding",
        "plural possessive recoding",
        "possessive suffix handling",
        "feature-preserving negation handling",
        "limited verb suffix stripping"
      ],
      rules: getStemmerRules()
    }
  });
}
