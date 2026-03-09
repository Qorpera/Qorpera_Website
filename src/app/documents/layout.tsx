import { DocsShell } from "./docs-shell";
import { MarketingFooter } from "@/components/marketing-footer";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DocsShell>{children}</DocsShell>
      <MarketingFooter />
    </>
  );
}
