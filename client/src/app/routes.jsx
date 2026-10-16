import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { RootLayout } from '../layouts/RootLayout.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';

/**
 * Development-only component catalogue (§12 of the Stage 06 brief). `import.meta.env.DEV` is
 * statically false in production builds, so the catalogue and its fixtures are not bundled.
 */
const Catalogue = import.meta.env.DEV ? lazy(() => import('../dev/CataloguePage.jsx')) : null;
export const CATALOGUE_PATH = '/__dev/catalogue';

/**
 * Route table (declarative React Router: about half the bundle size of the data router, D-059).
 * Inner public pages arrive in Stage 07.
 */
export function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        {Catalogue && (
          <Route
            path={`${CATALOGUE_PATH}/*`}
            element={
              <Suspense fallback={null}>
                <Catalogue />
              </Suspense>
            }
          />
        )}
        <Route element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
