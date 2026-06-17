"use client";

import type { ReviewResponse } from "@/lib/review-schema";
import { FixPanel } from "./fix-panel";
import type { LanguageName } from "@/lib/detect-language";

type ReviewDetailFixSectionProps = {
  code: string;
  language: string;
  review: ReviewResponse;
};

export function ReviewDetailFixSection({
  code,
  language,
  review,
}: ReviewDetailFixSectionProps) {
  return (
    <div className="mt-8">
      <FixPanel
        code={code}
        language={language as LanguageName}
        review={review}
      />
    </div>
  );
}
