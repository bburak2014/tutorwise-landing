import { LegalPage, legalMetadata } from "@/components/legal/LegalPage.tsx";

export function generateMetadata() {
  return legalMetadata("terms");
}

export default function Page() {
  return <LegalPage page="terms" />;
}
