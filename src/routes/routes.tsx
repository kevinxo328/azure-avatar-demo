import { lazy, Suspense } from "react";
import { Navigate, RouteObject } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import AppLoading from "@/layout/AppLoading";

const AvatarAssistant = lazy(() => import("../pages/avatar/AvatarAssistant"));

const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <Navigate to="/avatar/realtime" replace />,
      },
      {
        path: "/avatar/realtime",
        element: (
          <Suspense fallback={<AppLoading />}>
            <AvatarAssistant realtime />
          </Suspense>
        ),
      },
      {
        path: "/avatar/batch",
        element: (
          <Suspense fallback={<AppLoading />}>
            <AvatarAssistant />
          </Suspense>
        ),
      },
    ],
  },
];

export default routes;
