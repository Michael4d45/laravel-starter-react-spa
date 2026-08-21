import type { RouteObject } from 'react-router';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ResetPasswordPage } from './ResetPasswordPage';

export const authRoutes: RouteObject[] = [
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
];
