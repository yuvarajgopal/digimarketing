"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, LogOut, User, Menu, LayoutDashboard, Users, BarChart3,
  CreditCard, Settings, FileEdit, LineChart, Sun, Moon, ChevronDown, Globe,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

const agencyPrimaryNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients",   href: "/clients",   icon: Users           },
  { label: "Reports",   href: "/reports",   icon: BarChart3       },
  { label: "Billing",   href: "/billing",   icon: CreditCard      },
];

const clientPrimaryNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Posts",     href: "/posts",     icon: FileEdit        },
  { label: "Analytics", href: "/analytics", icon: LineChart       },
  { label: "Reports",   href: "/reports",   icon: BarChart3       },
  { label: "Billing",   href: "/billing",   icon: CreditCard      },
];

function isActiveRoute(href: string, pathname: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

/* Blue gradient logo mark */
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-xl gradient-blue shrink-0"
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 20 20" fill="none">
        <path d="M3 10l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Topbar() {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user     = session?.user;
  const role     = (user as any)?.role as string | undefined;
  const isClient = role === "CLIENT";
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "U";

  const primaryNav = isClient ? clientPrimaryNav : agencyPrimaryNav;

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Wrike-style flat topbar — no blur, clean border */}
      <div className="topbar-glass absolute inset-0" />

      <div className="relative mx-auto flex h-[72px] max-w-[1400px] items-center gap-8 px-6">

        {/* ── Logo ─────────────────────────────────────────────── */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 mr-2">
          <LogoMark size={36} />
          <div className="hidden md:flex flex-col">
            <span className="font-heading font-bold text-[17px] leading-tight tracking-tight text-foreground">
              DigiCampaign
            </span>
            <span className="text-[10px] text-muted-foreground/40 leading-tight">An Infra Delta Solutions Company</span>
          </div>
        </Link>

        {/* ── Desktop nav — Wrike underline-indicator style ─────── */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1">
          {primaryNav.map((item) => {
            const active = isActiveRoute(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg text-[15px] font-semibold transition-colors duration-150",
                  active
                    ? "text-foreground bg-secondary dark:bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-secondary"
                )}
              >
                {/* Blue gradient underline on active item */}
                {active && (
                  <span className="absolute bottom-[3px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600" />
                )}
                <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-blue-500 dark:text-blue-400" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right actions ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 ml-auto shrink-0">

          {/* Theme toggle */}
          <Button
            variant="ghost" size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-secondary transition-colors duration-150"
          >
            <Sun  className="h-4 w-4 rotate-0 scale-100 transition-all duration-200 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-200 dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Bell */}
          <Button
            variant="ghost" size="icon"
            className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-secondary transition-colors duration-150"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-blue-500 ring-2 ring-background" />
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="icon" asChild
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary dark:hover:bg-secondary transition-colors duration-150"
          >
            <Link href="/settings"><Settings className="h-4 w-4" /></Link>
          </Button>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-secondary dark:hover:bg-secondary transition-colors duration-150"
              >
                <Avatar className="h-7 w-7 rounded-lg">
                  <AvatarFallback className="rounded-lg text-[11px] font-bold bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-[13px] font-semibold text-foreground max-w-[100px] truncate">
                  {user?.name?.split(" ")[0] ?? "User"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-60 rounded-xl border-border bg-card shadow-lg shadow-black/8 dark:shadow-black/30"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal px-3 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 rounded-xl shrink-0">
                    <AvatarFallback className="rounded-xl text-[12px] font-bold bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                    {role && (
                      <span className="mt-0.5 inline-flex w-fit px-2 py-0.5 rounded-md text-[10px] font-semibold
                        bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                        {role}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <div className="p-1.5">
                <DropdownMenuItem className="rounded-lg cursor-pointer text-[13px] font-medium focus:bg-secondary">
                  <User className="mr-2.5 h-4 w-4 text-muted-foreground" />Profile
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px] font-medium focus:bg-secondary">
                  <Link href="/settings">
                    <Settings className="mr-2.5 h-4 w-4 text-muted-foreground" />Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-[13px] font-medium focus:bg-secondary">
                  <Link href="/">
                    <Globe className="mr-2.5 h-4 w-4 text-muted-foreground" />View Website
                  </Link>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <div className="p-1.5">
                <DropdownMenuItem onClick={() => signOut()}
                  className="rounded-lg cursor-pointer text-[13px] font-medium text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-400">
                  <LogOut className="mr-2.5 h-4 w-4" />Sign out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Mobile hamburger ─────────────────────────────────── */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"
              className="lg:hidden h-9 w-9 rounded-lg text-muted-foreground hover:bg-secondary ml-auto">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[280px] gradient-sidebar border-r border-border p-0">
            <VisuallyHidden.Root><SheetTitle>Navigation</SheetTitle></VisuallyHidden.Root>

            {/* Mobile header */}
            <div className="flex h-[72px] items-center gap-3 px-5 border-b border-border">
              <LogoMark size={32} />
              <div className="flex flex-col">
                <span className="font-heading font-bold text-[16px] leading-tight text-foreground">DigiCampaign</span>
                <span className="text-[9px] text-muted-foreground/40 leading-tight">An Infra Delta Solutions Company</span>
              </div>
            </div>

            {/* Mobile nav items */}
            <nav className="flex flex-col gap-0.5 p-3 pt-4">
              {primaryNav.map((item) => {
                const active = isActiveRoute(item.href, pathname);
                return (
                  <Link key={item.href} href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[14px] font-semibold transition-colors duration-150",
                      active
                        ? "text-foreground bg-secondary dark:bg-secondary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    )}>
                    {/* Blue gradient left bar on active */}
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-600" />
                    )}
                    <item.icon className={cn("h-4 w-4 shrink-0",
                      active ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground"
                    )} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile footer */}
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[12px] font-semibold text-blue-700 dark:text-blue-400">
                  {isClient ? "Client Portal" : "AI-Powered Platform"}
                </span>
              </div>
            </div>
          </SheetContent>
        </Sheet>

      </div>
    </header>
  );
}
