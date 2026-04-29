import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- Mocks ---------------------------------------------------------------
vi.mock("@/assets/school-logo.png", () => ({ default: "/school-logo.png" }));

// Thenable chainable mock — every method returns the same proxy that also resolves to empty data
const makeChain = (): any => {
  const result = { data: [], error: null, count: 0 };
  const chain: any = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") return (cb: any) => Promise.resolve(result).then(cb);
      if (prop === "catch") return (cb: any) => Promise.resolve(result).catch(cb);
      return () => makeChain();
    },
    apply() {
      return makeChain();
    },
  });
  return chain;
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => makeChain() },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ role: "admin", signOut: vi.fn(), user: { id: "u1" } }),
}));

vi.mock("@/hooks/useTeacherPermissions", () => ({
  useTeacherPermissions: () => ({ perms: { read_only_mode: false } }),
}));
vi.mock("@/hooks/useSubscriberStatus", () => ({
  useSubscriberStatus: () => ({ isSubscriber: false }),
}));
vi.mock("@/hooks/useSubscriptionTier", () => ({
  useSubscriptionTier: () => ({ isPremium: true, loaded: true }),
}));
vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));
vi.mock("@/components/SubscriptionExpiryBadge", () => ({ default: () => null }));
vi.mock("@/components/BackToTop", () => ({ default: () => null }));
vi.mock("@/components/BrandName", () => ({ default: () => <span>brand</span> }));
vi.mock("@/components/subscription/PremiumGate", () => ({
  UpgradeDialog: () => null,
}));

// Force mobile for DashboardLayout header
const isMobileMock = vi.fn(() => true);
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => isMobileMock(),
}));

// --- Helpers -------------------------------------------------------------
const VIEWPORTS = [
  { name: "mobile-360", width: 360 },
  { name: "mobile-414", width: 414 },
  { name: "tablet-768", width: 768 },
  { name: "desktop-1280", width: 1280 },
];

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  window.dispatchEvent(new Event("resize"));
}

beforeEach(() => {
  cleanup();
});

// --- Tests ---------------------------------------------------------------
describe("Logo visual contract — Sidebar", () => {
  it.each(VIEWPORTS)("renders logo with object-contain and no fixed crop on $name", async ({ width }) => {
    setViewport(width);
    isMobileMock.mockReturnValue(width < 768);
    const { default: AppSidebar } = await import("@/components/AppSidebar");
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    );
    const logo = screen.getByAltText("شعار منصة المتميز الرقمية") as HTMLImageElement;
    expect(logo).toBeInTheDocument();
    expect(logo.className).toMatch(/object-contain/);
    // Must not use object-cover (which crops)
    expect(logo.className).not.toMatch(/object-cover/);
    // Container parent must not clip with overflow-hidden + tight ring/bg combo
    const parent = logo.parentElement!;
    expect(parent.className).not.toMatch(/overflow-hidden/);
    // Snapshot the className so unintended size/crop changes are flagged
    expect(logo.className).toMatchSnapshot(`sidebar-logo-${width}`);
  });
});

describe("Logo visual contract — Mobile header", () => {
  it.each(VIEWPORTS.filter(v => v.width < 768))(
    "renders header logo with object-contain on $name",
    async ({ width }) => {
      setViewport(width);
      isMobileMock.mockReturnValue(true);
      const { default: DashboardLayout } = await import("@/components/DashboardLayout");
      render(
        <MemoryRouter>
          <DashboardLayout />
        </MemoryRouter>
      );
      const logos = screen.getAllByAltText(
        "شعار منصة المتميز الرقمية"
      ) as HTMLImageElement[];
      // Header logo is the one inside the sticky top bar (not sidebar)
      const headerLogo = logos.find(l => !l.className.includes("drop-shadow-sm")) ?? logos[0];
      expect(headerLogo.className).toMatch(/object-contain/);
      expect(headerLogo.className).not.toMatch(/object-cover/);
      expect(headerLogo.className).toMatchSnapshot(`header-logo-${width}`);
    }
  );
});
