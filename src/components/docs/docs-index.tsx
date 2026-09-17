"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen } from "lucide-react";

import { DocsShell } from "@/components/docs/docs-shell";
import { docCategories, docs } from "@/lib/docs";

export function DocsIndex() {
  return (
    <DocsShell>
      <div className="docs-hero">
        <span className="section-kicker">UNDERSTAND THE NEIGHBORHOOD</span>
        <h1>
          Everything behind
          <br />
          <span>the pools.</span>
        </h1>
        <p>Learn how liquidity, fees and rewards fit together. Start with the big picture, or jump straight to your next action.</p>
        <Link href="/docs/introduction" className="button primary">
          Start reading <ArrowRight size={16} />
        </Link>
      </div>
      <div className="docs-callout">
        <BookOpen size={19} />
        <div>
          <strong>Understand every step.</strong>
          <p>
            Read the wallet, liquidity and reward flows, the configured pool sequence and the requirements before financial
            activation.
          </p>
        </div>
      </div>
      <div className="doc-categories">
        {docCategories.map((category) => (
          <section key={category}>
            <h2>{category}</h2>
            <div className="doc-cards">
              {docs
                .filter((doc) => doc.category === category)
                .map((doc) => (
                  <Link key={doc.slug} href={`/docs/${doc.slug}`}>
                    <div>
                      <span>{String(docs.indexOf(doc) + 1).padStart(2, "0")}</span>
                      <ArrowUpRight size={18} />
                    </div>
                    <h3>{doc.title}</h3>
                    <p>{doc.description}</p>
                    <small>{doc.minutes} min read</small>
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </div>
    </DocsShell>
  );
}
