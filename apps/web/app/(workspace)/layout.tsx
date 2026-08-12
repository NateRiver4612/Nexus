import Link from 'next/link';

const nav = [
  { href: '/projects', label: 'Projects' },
  { href: '/planner', label: 'Planner' },
  { href: '/artifacts', label: 'Artifacts' },
  { href: '/knowledge', label: 'Knowledge' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/search', label: 'Search' },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r p-4">
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-1.5 text-sm hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
