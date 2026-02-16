"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LogOut,
  User,
  Menu,
  LayoutDashboard,
  Users,
  Image,
  FileText,
  BarChart3,
  CreditCard,
  Settings,
  ChevronDown,
  Zap,
  Sparkles,
  Calendar,
  FileEdit,
  LineChart,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

const agencyPrimaryNav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Assets", href: "/assets", icon: Image },
  { label: "Templates", href: "/templates", icon: FileText },
];

const agencyMoreNav = [
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Calendar", href: "/calendar", icon: Calendar },
];

const clientPrimaryNav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Posts", href: "/posts", icon: FileEdit },
  { label: "Analytics", href: "/analytics", icon: LineChart },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Billing", href: "/billing", icon: CreditCard },
];

function isActiveRoute(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Topbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = session?.user;
  const role = (user as any)?.role as string | undefined;
  const isClient = role === "CLIENT";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const primaryNav = isClient ? clientPrimaryNav : agencyPrimaryNav;
  const moreNav = isClient ? [] : agencyMoreNav;
  const allNav = [...primaryNav, ...moreNav];

  const moreActive = moreNav.some((item) => isActiveRoute(item.href, pathname));

  return (
    <header className="sticky top-0 z-40 w-full bg-background">
      <div className="mx-auto flex h-[80px] max-w-[1400px] items-center justify-between px-6">
        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-card/60"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] gradient-sidebar border-white/[0.06] p-0"
          >
            <VisuallyHidden.Root>
              <SheetTitle>Navigation</SheetTitle>
            </VisuallyHidden.Root>
            {/* Mobile drawer header */}
            <div className="flex h-16 items-center gap-3 px-5 border-b border-white/[0.06]">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl gradient-blue shrink-0 shadow-lg shadow-blue-500/20">
                <Zap className="h-[18px] w-[18px] text-white" />
                <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#00FF87] border-2 border-[#0A0E1A] animate-pulse-glow" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-semibold text-[15px] tracking-tight text-white">
                  DigiMarketing
                </span>
                <span className="text-[10px] font-medium text-blue-400/60 tracking-widest uppercase">
                  {isClient ? "Client Portal" : "AI Platform"}
                </span>
              </div>
            </div>

            {/* Mobile nav items */}
            <nav className="flex flex-col gap-1 p-3 pt-4">
              {allNav.map((item) => {
                const active = isActiveRoute(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                      active
                        ? "bg-blue-500/10 text-white"
                        : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-500 shadow-[0_0_8px_rgba(0,92,255,0.6)]" />
                    )}
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                        active
                          ? "text-blue-400"
                          : "text-white/30 group-hover:text-white/60"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* AI badge */}
            <div className="mt-auto p-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/10">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[11px] font-medium text-blue-300/80">
                  AI-Powered Creative Suite
                </span>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl gradient-blue shrink-0 shadow-md shadow-blue-500/20">
            <Zap className="h-[18px] w-[18px] text-white" />
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#00FF87] border-2 border-background animate-pulse-glow" />
          </div>
          <span className="hidden md:block font-heading font-bold text-base tracking-tight text-foreground">
            DigiMarketing
          </span>
        </Link>

        {/* Center: Desktop nav links */}
        <nav className="group/nav hidden lg:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          {primaryNav.map((item) => {
            const active = isActiveRoute(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-item relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200",
                  active
                    ? "nav-active text-white gradient-blue shadow-lg shadow-blue-500/25"
                    : "text-foreground/70"
                )}
              >
                <item.icon className={cn("nav-icon h-5 w-5 transition-colors duration-200", active ? "text-white" : "")} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* More dropdown — only for agency staff */}
          {moreNav.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "nav-item relative flex items-center gap-2 px-5 py-3 rounded-xl text-[15px] font-semibold transition-all duration-200 outline-none",
                    moreActive
                      ? "nav-active text-white gradient-blue shadow-lg shadow-blue-500/25"
                      : "text-foreground/70"
                  )}
                >
                  <span>More</span>
                  <ChevronDown className="nav-icon h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 rounded-xl" align="start">
                {moreNav.map((item) => {
                  const active = isActiveRoute(item.href, pathname);
                  return (
                    <DropdownMenuItem key={item.href} asChild className="rounded-lg cursor-pointer">
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2",
                          active && "text-primary font-medium"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-card/60 transition-all duration-200"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_rgba(0,92,255,0.4)]" />
        </Button>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-xl p-0 hover:bg-card/60 transition-all duration-200"
            >
              <Avatar className="h-9 w-9 rounded-lg ring-2 ring-border">
                <AvatarFallback className="rounded-lg text-xs font-bold gradient-blue text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-xl"
            align="end"
            forceMount
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
