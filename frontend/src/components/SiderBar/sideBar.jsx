import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { NavIcon } from "../../assets/Data/ConstantData";
import { Link, useLocation } from "react-router-dom";

/**
 * ZITTA sidebar — matches Operations Center PDF design.
 * Full-width nav (no icon-rail collapse). Mobile uses drawer.
 */
export default function Sidebar({
  menuData,
  mobileSideBar,
  setMobileSideBar,
  variant = "industrial",
  user = null,
  role = "USER",
  onLogout = () => {},
}) {
  const industrial = variant === "industrial";
  const [openMenus, setOpenMenus] = useState({});
  const location = useLocation();

  const isPathActive = (path) => {
    if (!path || path === "#") return false;
    if (path === "/") return location.pathname === "/";
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const isItemActive = (item) => {
    if (isPathActive(item.path)) return true;
    return (item.children || []).some((c) => isPathActive(c.path));
  };

  useEffect(() => {
    const next = {};
    for (const section of menuData || []) {
      for (const item of section.items || []) {
        if (
          item.children?.some(
            (c) =>
              location.pathname === c.path ||
              (c.path &&
                c.path !== "/" &&
                location.pathname.startsWith(`${c.path}/`))
          )
        ) {
          next[item.label] = true;
        }
      }
    }
    setOpenMenus((prev) => ({ ...prev, ...next }));
  }, [location.pathname, menuData]);

  const displayName = useMemo(() => {
    return user?.name || user?.full_name || user?.email || "Benutzer";
  }, [user]);

  const initials = useMemo(() => {
    const parts = String(displayName).trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return String(displayName).slice(0, 2).toUpperCase();
  }, [displayName]);

  const toggleSubmenu = (key, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-0 shrink-0 overflow-hidden lg:w-[240px] lg:overflow-visible">
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col transition-transform duration-300 ease-in-out
          ${mobileSideBar ? "translate-x-0" : "-translate-x-full"}
          lg:sticky lg:translate-x-0
          ${industrial ? "bg-[#0a0e14] border-r border-white/[0.06]" : "bg-white"}`}
      >
      {/* Mobile close */}
      <div className="flex justify-end px-3 pt-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileSideBar(false)}
          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-sm text-slate-300"
          aria-label="Menü schließen"
        >
          ✕
        </button>
      </div>

      {/* Brand — PDF */}
      <div className="px-5 pb-3 pt-5">
        <p className="text-[1.75rem] font-semibold leading-none tracking-tight text-white">
          Zitta
        </p>
        <p className="mt-1.5 text-[12px] text-slate-400">Produktionsintelligenz</p>
      </div>

      {/* Nav — active pill flush to left, fully rounded on the right */}
      <nav className="oc-sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2 pl-0 pr-3">
        {menuData.map((section, i) => (
          <div key={i} className={i > 0 ? "mt-4" : ""}>
            {section.title ? (
              <div className="mb-1.5 pl-5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {section.title}
              </div>
            ) : null}

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isItemActive(item);
                const hasChildren = Boolean(item.children?.length);
                const expanded = Boolean(openMenus[item.label]);
                const parentPath =
                  item.path && item.path !== "#" ? item.path : null;

                return (
                  <li key={item.label}>
                    <div
                      className={`flex items-center transition ${
                        active
                          ? "rounded-r-full bg-[#1e3a5f] text-white"
                          : "rounded-r-full text-slate-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      {parentPath ? (
                        <Link
                          to={parentPath}
                          onClick={() => setMobileSideBar(false)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-5 pr-2"
                        >
                          <NavIcon
                            name={item.icon}
                            active={active}
                            variant={industrial ? "industrial" : "classic"}
                          />
                          <span className="truncate text-[13px] font-medium">
                            {item.label}
                          </span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) =>
                            hasChildren ? toggleSubmenu(item.label, e) : null
                          }
                          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-5 pr-2 text-left"
                        >
                          <NavIcon
                            name={item.icon}
                            active={active}
                            variant={industrial ? "industrial" : "classic"}
                          />
                          <span className="truncate text-[13px] font-medium">
                            {item.label}
                          </span>
                        </button>
                      )}

                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => toggleSubmenu(item.label, e)}
                          className="mr-2.5 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                          aria-label={`${item.label} Untermenü`}
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </button>
                      ) : null}
                    </div>

                    {hasChildren && expanded ? (
                      <ul className="mt-0.5 space-y-0.5 py-0.5">
                        {item.children.map((sub) => {
                          const subActive = isPathActive(sub.path);
                          return (
                            <li key={sub.path + sub.label}>
                              <Link
                                to={sub.path || "#"}
                                onClick={() => setMobileSideBar(false)}
                                className={`flex items-center gap-2.5 py-1.5 pl-9 pr-3 text-[13px] transition ${
                                  subActive
                                    ? "rounded-r-full bg-[#1e3a5f] text-white"
                                    : "rounded-r-full text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                                }`}
                              >
                                <NavIcon
                                  name={sub.icon}
                                  active={subActive}
                                  variant={
                                    industrial ? "industrial" : "classic"
                                  }
                                />
                                <span>{sub.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* PDF footer: New Production Run + user */}
      <div className="mt-auto shrink-0">
        <div className="border-y border-white/[0.08] px-4 py-3">
          <Link
            to="/production-run?create=1"
            onClick={() => setMobileSideBar(false)}
            className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#1e3a5f] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#274a73]"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#1e3a5f]">
              <Plus size={12} strokeWidth={3} />
            </span>
            <span>New Production Run</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-500/80 text-xs font-semibold text-white">
            {initials}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="min-w-0 flex-1 text-left"
            title="Abmelden"
          >
            <p className="truncate text-[13px] font-semibold text-white">
              {displayName}
            </p>
            <p className="text-[11px] text-slate-400">
              {String(role || "user").toLowerCase() === "admin"
                ? "Admin"
                : role}
            </p>
          </button>
          <Link
            to="/user-notifications"
            onClick={() => setMobileSideBar(false)}
            className="relative rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Benachrichtigungen"
          >
            <Bell size={18} />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
          </Link>
        </div>
      </div>
      </aside>
    </div>
  );
}
