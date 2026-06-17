import { AuthGuard } from "@/components/auth/auth-guard";
import { ReviewWorkspace } from "@/components/review/review-workspace";

export default function ReviewPage() {
  return (
    <AuthGuard>
      <ReviewWorkspace />
    </AuthGuard>
  );
}
