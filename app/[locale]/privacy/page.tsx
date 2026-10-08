import { LegalPage, legalMetadata } from "@/components/legal/LegalPage.tsx";

export function generateMetadata() {
  return legalMetadata("privacy");
}

export default function Page() {
  return <LegalPage page="privacy" />;
}
