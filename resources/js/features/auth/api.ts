/**
 * Auth feature API – re-exports auth-related methods from the shared API client.
 */
export {
    disconnectGoogle,
    login,
    logout,
    register,
    resendVerificationEmail,
    resetPassword,
    sendPasswordResetLink,
    showUser,
} from '@/lib/apiClient';
