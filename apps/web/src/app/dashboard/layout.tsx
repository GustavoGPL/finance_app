'use client';

import { useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeftRight, BarChart3, LayoutDashboard, LogOut, PiggyBank, Target, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useVisibility } from '@/lib/visibility';
import { themeForVisibility } from '@/lib/themes';
import { Button } from '@/components/ui/button';
import { ThemedLoader } from '@/components/themed-loader';
import { VisibilitySwitch } from '@/components/visibility-switch';
import { VisibilitySelect } from '@/components/visibility-select';
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
  const { visibility } = useVisibility();
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
        <ThemedLoader />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  function isActive(item: { href: string }) {
    return item.href === '/dashboard'
      ? pathname === item.href
      : pathname.startsWith(`${item.href}/`);
  }

  const theme = themeForVisibility(user.memberRole, visibility);

  return (
    <div
      className="relative min-h-screen"
      style={
        {
          '--primary': theme.primary,
          '--primary-foreground': theme.primaryForeground,
          '--ring': theme.ring,
        } as CSSProperties
      }
    >
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ backgroundImage: theme.gradient }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${theme.image})` }}
        />
        <div className="absolute inset-0 bg-background/90" />
      </div>

      <header className="relative sticky top-0 z-40 border-b border-primary/30 bg-background/55 backdrop-blur-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/25 via-primary/5 to-transparent"
        />
        <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-6">
            <span className="whitespace-nowrap text-base font-semibold tracking-tight">Finance App</span>
            <span className="hidden truncate text-sm text-muted-foreground lg:inline">
              {household?.name ?? 'Finanças do casal'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <VisibilitySwitch className="hidden sm:flex" />
            <VisibilitySelect className="sm:hidden" />
            <span className="hidden max-w-[10rem] truncate text-sm font-medium md:inline">
              {user.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void logout()}
              aria-label="Sair"
              className="px-2 sm:px-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        <nav className="relative mx-auto hidden max-w-6xl gap-1 px-4 md:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  active
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
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-10 md:pt-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/30 bg-background/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[10px] font-medium leading-none transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
