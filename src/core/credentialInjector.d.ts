/**
 * Injects credentials from environment variables into test plans
 */
export declare class CredentialInjector {
    /**
     * Injects credentials into a test plan
     */
    static injectCredentials(plan: any): any;
    /**
     * Gets credentials from environment
     */
    static getCredentials(): {
        url?: string;
        username?: string;
        password?: string;
    };
}
//# sourceMappingURL=credentialInjector.d.ts.map