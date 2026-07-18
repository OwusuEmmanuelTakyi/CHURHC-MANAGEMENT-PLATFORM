import { LinkManager } from '@/components/registration/link-manager';
import { ReviewQueue } from '@/components/registration/review-queue';

export default function RegistrationPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-foreground mb-4">Self-registration</h1>
      <LinkManager />
      <ReviewQueue />
    </div>
  );
}
