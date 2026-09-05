'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeftRight, BarChart3, LayoutDashboard, Loader2, LogOut, PiggyBank, Target, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { VisibilitySwitch } from '@/components/visibility-switch';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/dashboard/accounts', label: 'Contas', icon: Wallet },
  { href: '/dashboard/transactions', label: 'Transações', icon: ArrowLeftRight },
  { href: '/dashboard/budgets', label: 'Orçamentos', icon: PiggyBank },
  { href: '/dashboard/goals', label: 'Metas', icon: Target },
  { href: '/dashboard/reports', label: 'Relatórios', icon: BarChart3 },
];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, household, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <span className="text-base font-semibold tracking-tight">Finance App</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {household?.name ?? 'Finanças do casal'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <VisibilitySwitch className="hidden sm:flex" />
            <span className="text-sm font-medium">{user.name}</span>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pb-0">
          <nav className="flex gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const activeExact = item.href === '/dashboard' ? pathname === item.href : active;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    activeExact
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <VisibilitySwitch className="mb-2 sm:hidden" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
