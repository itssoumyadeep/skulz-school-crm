"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  School,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export type SidebarTheme = "light" | "dark";

export type SidebarNavItem = {
  label: string;
  icon: ReactNode;
  href?: string;
  badge?: ReactNode;
  exact?: boolean;
  disabled?: boolean;
};

export type SidebarBrand = {
  name: string;
  description?: string;
  mark?: ReactNode;
};

type SidebarProps = {
  navigation: readonly SidebarNavItem[];
  theme?: SidebarTheme;
  brand?: SidebarBrand;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: () => void;
  className?: string;
};

export function Sidebar({
  navigation,
  theme = "light",
  brand = { name: "Purple Cubby", description: "School CRM" },
  collapsed: controlledCollapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  onNavigate,
  className = "",
}: SidebarProps) {
  const pathname = usePathname() ?? "";
  const [localCollapsed, setLocalCollapsed] = useState(defaultCollapsed);
  const [activeAnchor, setActiveAnchor] = useState(() =>
    typeof window === "undefined" ? "" : window.location.hash,
  );
  const collapsed = controlledCollapsed ?? localCollapsed;

  const toggleCollapsed = () => {
    const nextCollapsed = !collapsed;
    if (controlledCollapsed === undefined) {
      setLocalCollapsed(nextCollapsed);
    }
    onCollapsedChange?.(nextCollapsed);
  };

  return (
    <aside
      data-sidebar={theme}
      className={`flex h-full min-h-0 flex-col border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground transition-[width] duration-200 ${collapsed ? "w-16" : "w-64"} ${className}`}
    >
      <div
        className={`flex h-16 shrink-0 items-center border-b border-sidebar-border px-3 ${collapsed ? "justify-center" : "gap-3"}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-sidebar-active-foreground [&_svg]:size-5">
          {brand.mark ?? <School aria-hidden="true" />}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {brand.name}
            </span>
            {brand.description && (
              <span className="block truncate text-xs text-sidebar-muted">
                {brand.description}
              </span>
            )}
          </span>
        )}
        {!collapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            onClick={toggleCollapsed}
            className="text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
          >
            <PanelLeftClose aria-hidden="true" />
          </Button>
        )}
      </div>

      <nav
        aria-label="Primary navigation"
        className="flex-1 space-y-1 overflow-y-auto p-2"
      >
        {navigation.map((item) => {
          const hashIndex = item.href?.indexOf("#") ?? -1;
          const itemPath =
            hashIndex >= 0 ? item.href?.slice(0, hashIndex) : item.href;
          const itemHash =
            hashIndex >= 0 ? item.href?.slice(hashIndex) : undefined;
          const isActive =
            !!item.href &&
            (itemHash
              ? pathname === itemPath && activeAnchor === itemHash
              : pathname === item.href ||
                (!item.exact &&
                  item.href !== "/" &&
                  pathname.startsWith(`${item.href}/`)));
          const itemContent = (
            <>
              <span className="flex size-5 shrink-0 items-center justify-center [&_svg]:size-4">
                {item.icon}
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              )}
              {item.badge != null && (
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-md px-1 text-[11px] leading-5 ${item.disabled ? "bg-sidebar-hover text-sidebar-muted" : "bg-primary text-primary-foreground"} ${collapsed ? "absolute ml-7 -mt-6" : ""}`}
                >
                  {collapsed ? null : item.badge}
                  {collapsed && (
                    <span className="size-1.5 rounded-full bg-current" />
                  )}
                </span>
              )}
            </>
          );
          const itemClassName = `relative flex min-h-10 items-center gap-3 rounded-md px-2.5 text-sm transition-colors ${collapsed ? "justify-center" : ""} ${item.disabled ? "cursor-not-allowed text-sidebar-muted opacity-60" : isActive ? "bg-sidebar-active font-medium text-sidebar-active-foreground" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"}`;

          if (item.disabled || !item.href) {
            return (
              <div
                key={`${item.href ?? "planned"}:${item.label}`}
                aria-disabled="true"
                title={collapsed ? `${item.label} (planned)` : undefined}
                className={itemClassName}
              >
                {itemContent}
              </div>
            );
          }

          return (
            <Link
              key={`${item.href}:${item.label}`}
              href={item.href}
              onClick={() => {
                setActiveAnchor(itemHash ?? "");
                onNavigate?.();
              }}
              aria-current={isActive ? "page" : undefined}
              aria-label={collapsed ? item.label : undefined}
              title={collapsed ? item.label : undefined}
              className={itemClassName}
            >
              {itemContent}
            </Link>
          );
        })}
      </nav>

      {collapsed && (
        <div className="border-t border-sidebar-border p-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Expand sidebar"
            title="Expand sidebar"
            onClick={toggleCollapsed}
            className="w-full text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
          >
            <PanelLeftOpen aria-hidden="true" />
          </Button>
        </div>
      )}
    </aside>
  );
}

export type ShellUser = {
  name: string;
  email?: string;
  avatarUrl?: string;
};

export type ShellNotification = {
  id: string;
  title: string;
  description?: string;
  onSelect?: () => void;
};

export type UserMenuAction = {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

export type TopbarProps = {
  title?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  notifications?: readonly ShellNotification[];
  user?: ShellUser;
  userMenuActions?: readonly UserMenuAction[];
  onSignOut?: () => void;
  onMenuClick?: () => void;
};

export function Topbar({
  title = "School CRM",
  searchPlaceholder = "Search",
  searchValue,
  onSearchChange,
  notifications = [],
  user,
  userMenuActions = [],
  onSignOut,
  onMenuClick,
}: TopbarProps) {
  const [localSearch, setLocalSearch] = useState("");
  const currentSearch = searchValue ?? localSearch;
  const currentUser = user ?? { name: "School User" };
  const initials = currentUser.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      {onMenuClick && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="md:hidden"
        >
          <PanelLeftOpen aria-hidden="true" />
        </Button>
      )}
      <h1 className="hidden shrink-0 text-sm font-semibold text-foreground sm:block">
        {title}
      </h1>
      <label className="relative ml-auto block w-full max-w-md">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={currentSearch}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (searchValue === undefined) setLocalSearch(value);
            onSearchChange?.(value);
          }}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-9 pl-9"
        />
      </label>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ""}`}
            className="relative shrink-0"
          >
            <Bell aria-hidden="true" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] leading-none text-primary-foreground">
                {notifications.length > 9 ? "9+" : notifications.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <DropdownMenuItem disabled>
              You&apos;re all caught up.
            </DropdownMenuItem>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onSelect={notification.onSelect}
                className="items-start py-2"
              >
                <span className="min-w-0">
                  <span className="block font-medium">
                    {notification.title}
                  </span>
                  {notification.description && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {notification.description}
                    </span>
                  )}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-9 shrink-0 gap-2 px-1.5"
            aria-label={`User menu for ${currentUser.name}`}
          >
            {currentUser.avatarUrl ? (
              <Image
                src={currentUser.avatarUrl}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials || (
                  <UserRound aria-hidden="true" className="size-4" />
                )}
              </span>
            )}
            <span className="hidden max-w-32 truncate text-sm sm:block">
              {currentUser.name}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="hidden size-4 text-muted-foreground sm:block"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block truncate">{currentUser.name}</span>
            {currentUser.email && (
              <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                {currentUser.email}
              </span>
            )}
          </DropdownMenuLabel>
          {(userMenuActions.length > 0 || onSignOut) && (
            <DropdownMenuSeparator />
          )}
          {userMenuActions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              variant={action.destructive ? "destructive" : "default"}
              onSelect={action.onSelect}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          {onSignOut && (
            <DropdownMenuItem onSelect={onSignOut}>
              <LogOut aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export type AppShellProps = TopbarProps & {
  children: ReactNode;
  navigation: readonly SidebarNavItem[];
  sidebarTheme?: SidebarTheme;
  brand?: SidebarBrand;
  defaultCollapsed?: boolean;
};

export function AppShell({
  children,
  navigation,
  sidebarTheme = "light",
  brand,
  defaultCollapsed = false,
  ...topbarProps
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      data-sidebar={sidebarTheme}
      className="flex min-h-screen bg-background text-foreground"
    >
      <div className="hidden shrink-0 md:block">
        <Sidebar
          navigation={navigation}
          theme={sidebarTheme}
          brand={brand}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
        />
      </div>
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="h-dvh w-72 gap-0 border-sidebar-border bg-sidebar-background p-0"
          data-sidebar={sidebarTheme}
        >
          <SheetTitle className="sr-only">Primary navigation</SheetTitle>
          <Sidebar
            navigation={navigation}
            theme={sidebarTheme}
            brand={brand}
            collapsed={false}
            onNavigate={() => setMobileMenuOpen(false)}
            className="w-full border-r-0"
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar {...topbarProps} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
