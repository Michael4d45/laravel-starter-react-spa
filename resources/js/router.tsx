import { createBrowserRouter } from 'react-router-dom';
import { App } from './app';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
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
                handle: { isProtected: true },
            },
            {
                path: 'login',
                element: <LoginPage />,
                handle: { isAuthPage: true },
            },
            {
                path: 'register',
                element: <RegisterPage />,
                handle: { isAuthPage: true },
            },
            {
                path: 'forgot-password',
                element: <ForgotPasswordPage />,
                handle: { isAuthPage: true },
            },
            {
                path: 'reset-password/:email/:token',
                element: <ResetPasswordPage />,
                handle: { isAuthPage: true },
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
