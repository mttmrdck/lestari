import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './index.css';
import { StoreProvider } from './app/store';
import { AuthProvider } from './app/auth';
import { Layout } from './app/Layout';
import { HomeRoute } from './features/home/HomeRoute';
import { RouteError } from './features/misc/RouteError';

gsap.registerPlugin(useGSAP);

const SearchPage = lazy(() => import('./features/search/SearchPage'));
const DetailPage = lazy(() => import('./features/detail/DetailPage'));
const QuizHub = lazy(() => import('./features/quiz/QuizHub'));
const QuizPlay = lazy(() => import('./features/quiz/QuizPlay'));
const FlashcardsPage = lazy(() => import('./features/flashcards/FlashcardsPage'));
const ProfilePage = lazy(() => import('./features/progress/ProfilePage'));
const DailyPage = lazy(() => import('./features/daily-challenge/DailyPage'));
const AboutPage = lazy(() => import('./features/misc/AboutPage'));
const LessonPage = lazy(() => import('./features/lesson/LessonPage'));
const PathPage = lazy(() => import('./features/path/PathPage'));
const SavedPage = lazy(() => import('./features/favourites/SavedPage'));
const NotFound = lazy(() => import('./features/misc/NotFound'));
const AuthPage = lazy(() => import('./features/auth/AuthPage'));
const RecoverPage = lazy(() => import('./features/auth/RecoverPage'));
const AccountPage = lazy(() => import('./features/auth/AccountPage'));
const LeaderboardPage = lazy(() => import('./features/leaderboard/LeaderboardPage'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'cari', element: <SearchPage /> },
      { path: 'peribahasa/:id', element: <DetailPage /> },
      { path: 'kuiz', element: <QuizHub /> },
      { path: 'kuiz/:mode', element: <QuizPlay /> },
      { path: 'kad-imbas', element: <FlashcardsPage /> },
      { path: 'profil', element: <ProfilePage /> },
      { path: 'harian', element: <DailyPage /> },
      { path: 'tentang', element: <AboutPage /> },
      { path: 'pelajaran/:id', element: <LessonPage /> },
      { path: 'laluan', element: <PathPage /> },
      { path: 'simpanan', element: <SavedPage /> },
      { path: 'masuk', element: <AuthPage mode="masuk" /> },
      { path: 'daftar', element: <AuthPage mode="daftar" /> },
      { path: 'lupa-kata-laluan', element: <RecoverPage /> },
      { path: 'akaun', element: <AccountPage /> },
      { path: 'papan-juara', element: <LeaderboardPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </StoreProvider>
  </StrictMode>,
);
