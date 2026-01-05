import { createBrowserRouter } from 'react-router-dom';
import { App } from './app';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ContentPage, contentLoader } from './features/content/ContentPage';
import { ErrorPage } from './features/ErrorPage';
import { HomePage } from './features/home/HomePage';
import { NotFoundPage } from './features/NotFoundPage';
import { ProfilePage, profileLoader } from './features/profile/ProfilePage';

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
                loader: profileLoader,
                errorElement: <ErrorPage />,
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
