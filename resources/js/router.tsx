import { createBrowserRouter } from 'react-router-dom';
import { App } from './app';
import { HomePage } from './features/home/HomePage';
import { ContentPage } from './features/content/ContentPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { NotFoundPage } from './features/NotFoundPage';
import { ErrorPage } from './features/ErrorPage';
import { contentLoader } from './features/content/contentLoader';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
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
            },
            {
                path: 'login',
                element: <LoginPage />,
            },
            {
                path: 'register',
                element: <RegisterPage />,
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);