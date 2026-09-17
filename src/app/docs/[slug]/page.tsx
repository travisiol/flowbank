import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocArticle } from "@/components/docs/doc-article";
import { docs, findDoc } from "@/lib/docs";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = findDoc((await params).slug);
  if (!doc) return {};
  return { title: `${doc.title} | ${site.name} docs`, description: doc.description };
}

export default async function Page({ params }: Props) {
  const doc = findDoc((await params).slug);
  if (!doc) notFound();
  return <DocArticle doc={doc} />;
}
