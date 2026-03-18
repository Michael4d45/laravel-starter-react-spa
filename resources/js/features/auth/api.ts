/**
 * Auth feature API – re-exports auth-related methods from the shared API client.
 */
export {
    login,
    register,
    logout,
    sendPasswordResetLink,
    resetPassword,
    resendVerificationEmail,
    disconnectGoogle,
    showUser,
} from '@/lib/apiClient';
