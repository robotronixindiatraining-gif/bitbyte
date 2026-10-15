import { RootLayout } from '../layouts/RootLayout.jsx';
import { FoundationPage } from '../pages/FoundationPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { RouteError } from './RouteError.jsx';

/** Route tree shared by the browser router and tests. Public/admin routes arrive in Stages 06–08. */
export const routes = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <FoundationPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
