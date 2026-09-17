"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { docCategories, docs, type Doc } from "@/lib/docs";
import { site } from "@/lib/site";

/** Docs chrome: topline, searchable sidebar, content column and per-article TOC. */
export function DocsShell({ children, article }: { children: ReactNode; article?: Doc }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const matches = docs.filter((doc) =>
    `${doc.title} ${doc.description} ${doc.sections.map((s) => s.title).join(" ")}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="site-shell docs-page">
      <div className="docs-topline">
        <Link href="/docs">
          <BookOpen size={16} /> {site.name} documentation
        </Link>
        <span>{site.docsUpdated}</span>
      </div>
      <SidebarProvider className="docs-layout">
        <Sidebar collapsible="none" className="docs-sidebar">
          <div className="docs-search">
            <Search size={15} />
            <Input
              aria-label="Search documentation"
              placeholder="Find a topic…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <SidebarContent>
            {docCategories.map((category) => {
              const inCategory = matches.filter((doc) => doc.category === category);
              if (inCategory.length === 0) return null;
              return (
                <SidebarGroup key={category}>
                  <SidebarGroupLabel>{category}</SidebarGroupLabel>
                  <SidebarMenu>
                    {inCategory.map((doc) => (
                      <SidebarMenuItem key={doc.slug}>
                        <SidebarMenuButton
                          render={<Link href={`/docs/${doc.slug}`} />}
                          isActive={pathname === `/docs/${doc.slug}`}
                          tooltip={doc.title}
                        >
                          {doc.title}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              );
            })}
            {matches.length === 0 && <p className="docs-no-results">No matching topics. Try “fees”, “staking” or “wallets”.</p>}
          </SidebarContent>
          <Link href="/app" className="docs-back-app">
            Explore the dapp <ArrowUpRight size={15} />
          </Link>
        </Sidebar>
        <main className="docs-content">{children}</main>
        {article && (
          <nav className="docs-toc" aria-label="On this page">
            <span>ON THIS PAGE</span>
            {article.sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>
        )}
      </SidebarProvider>
    </div>
  );
}
