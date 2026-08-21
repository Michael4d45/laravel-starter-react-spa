import { createBrowserRouter } from 'react-router';
import { App } from './app';
import { authRoutes } from './features/auth/routes';
import { ContentPage, contentLoader } from './features/content/ContentPage';
import { ErrorPage } from './features/ErrorPage';
import { HomePage } from './features/home/HomePage';
import { NotFoundPage } from './features/NotFoundPage';
import { ProfilePage, profileLoader } from './features/profile/ProfilePage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: 'content',
                element: <ContentPage />,
                loader: contentLoader,
                errorElement: <ErrorPage />,
            },
            {
                path: 'profile',
                element: <ProfilePage />,
                loader: profileLoader,
                errorElement: <ErrorPage />,
                handle: { isProtected: true },
            },
            ...authRoutes,
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
