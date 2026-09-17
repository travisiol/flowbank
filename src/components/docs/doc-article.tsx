"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Clock } from "lucide-react";

import { DocsShell } from "@/components/docs/docs-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { docs, type Doc } from "@/lib/docs";

export function DocArticle({ doc }: { doc: Doc }) {
  const index = docs.findIndex((d) => d.slug === doc.slug);
  const previous = docs[index - 1];
  const next = docs[index + 1];

  return (
    <DocsShell article={doc}>
      <div className="doc-breadcrumb">
        <Link href="/docs">Docs</Link>
        <ChevronRight size={13} />
        <span>{doc.category}</span>
      </div>
      <header className="doc-article-heading">
        <span className="section-kicker">{doc.category.toUpperCase()}</span>
        <h1>{doc.title}</h1>
        <p>{doc.description}</p>
        <div>
          <span>
            <Clock size={14} />
            {doc.minutes} min read
          </span>
          <span>Protocol &amp; wallet documentation</span>
        </div>
      </header>
      <article className="doc-body">
        {doc.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2>
              <a href={`#${section.id}`}>{section.title}</a>
            </h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.bullets && (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.table && (
              <div className="doc-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {section.table.headers.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.table.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {section.formula && (
              <div className="doc-formula">
                <span>FEE ACCOUNTING</span>
                <code>{section.formula}</code>
              </div>
            )}
          </section>
        ))}
        {doc.sources && (
          <section className="doc-sources">
            <h2>Primary sources</h2>
            <p>Refer to the current provider and issuer documentation. Assets and contract addresses are verified again before activation.</p>
            {doc.sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                {source.title}
                <ArrowUpRight size={15} />
              </a>
            ))}
          </section>
        )}
      </article>
      <div className="doc-pagination">
        {previous ? (
          <Link href={`/docs/${previous.slug}`}>
            <small>
              <ArrowLeft size={13} /> Previous
            </small>
            <strong>{previous.title}</strong>
          </Link>
        ) : (
          <Link href="/docs">
            <small>
              <ArrowLeft size={13} /> Back
            </small>
            <strong>Documentation home</strong>
          </Link>
        )}
        {next ? (
          <Link href={`/docs/${next.slug}`}>
            <small>
              Next <ArrowRight size={13} />
            </small>
            <strong>{next.title}</strong>
          </Link>
        ) : (
          <Link href="/app">
            <small>
              Try it <ArrowRight size={13} />
            </small>
            <strong>Explore the dapp</strong>
          </Link>
        )}
      </div>
    </DocsShell>
  );
}
