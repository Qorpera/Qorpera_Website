import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOC_PAGES } from "../content";

export function generateStaticParams() {
  return Object.keys(DOC_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = DOC_PAGES[slug];
  if (!page) return {};
  return {
    title: `Documentation — ${page.title}`,
    description: page.description,
  };
}

export default async function DocSubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = DOC_PAGES[slug];
  if (!page) notFound();
  return <>{page.body}</>;
}
