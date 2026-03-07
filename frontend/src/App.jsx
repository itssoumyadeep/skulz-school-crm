import { createBrowserRouter, RouterProvider } from "react-router";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ParentPortalPage } from "./pages/ParentPortalPage";
import { SchoolPortalPage } from "./pages/SchoolPortalPage";
import { AdministratorPortalPage } from "./pages/AdministratorPortalPage";
import { SupplierPortalPage } from "./pages/SupplierPortalPage";

const router = createBrowserRouter([
  { path: "/", Component: HomePage },
  { path: "/login", Component: LoginPage },
  { path: "/portal/parent", Component: ParentPortalPage },
  { path: "/portal/school", Component: SchoolPortalPage },
  { path: "/portal/administrator", Component: AdministratorPortalPage },
  { path: "/portal/supplier", Component: SupplierPortalPage },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
