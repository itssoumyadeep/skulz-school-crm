import { createBrowserRouter, RouterProvider } from "react-router";
import { ThemeProvider } from "./context/ThemeContext";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ParentPortalPage } from "./pages/ParentPortalPage";
import { SchoolPortalPage } from "./pages/SchoolPortalPage";
import { AdministratorPortalPage } from "./pages/AdministratorPortalPage";
import { SupplierPortalPage } from "./pages/SupplierPortalPage";
import { BookDemoPage } from "./pages/BookDemoPage";
import { StartFreeTrialPage } from "./pages/StartFreeTrialPage";
import { FeatureDetailPage } from "./pages/features/FeatureDetailPage";
import { PricingDetailPage } from "./pages/pricing/PricingDetailPage";

const router = createBrowserRouter([
  { path: "/", Component: HomePage },
  { path: "/login", Component: LoginPage },
  { path: "/book-demo", Component: BookDemoPage },
  { path: "/start-free-trial", Component: StartFreeTrialPage },
  { path: "/features/:slug", Component: FeatureDetailPage },
  { path: "/pricing/:slug", Component: PricingDetailPage },
  { path: "/portal/parent", Component: ParentPortalPage },
  { path: "/portal/school", Component: SchoolPortalPage },
  { path: "/portal/administrator", Component: AdministratorPortalPage },
  { path: "/portal/supplier", Component: SupplierPortalPage },
]);

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
