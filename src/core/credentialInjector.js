/**
 * Injects credentials from environment variables into test plans
 */
export class CredentialInjector {
    /**
     * Injects credentials into a test plan
     */
    static injectCredentials(plan) {
        const url = process.env.TEST_URL || process.env.URL || process.env.BASE_URL;
        const username = process.env.TEST_USERNAME || process.env.USERNAME || process.env.USER;
        const password = process.env.TEST_PASSWORD || process.env.PASSWORD;
        // Deep clone to avoid mutating original
        const injectedPlan = JSON.parse(JSON.stringify(plan));
        for (const scenario of injectedPlan.scenarios) {
            for (const step of scenario.steps) {
                // Replace URL placeholders - only if target mentions the site or is a placeholder
                if (step.action === 'navigate' && url) {
                    const targetLower = step.target.toLowerCase();
                    // Only replace if it's a placeholder, mentions the site name, or is not a full URL
                    if (targetLower.includes('url') ||
                        targetLower.includes('chewy') ||
                        targetLower.includes('homepage') ||
                        (!step.target.startsWith('http') && !targetLower.includes('google') && !targetLower.includes('example'))) {
                        const oldTarget = step.target;
                        step.target = url;
                        if (oldTarget !== url) {
                            console.log(`  🔗 Injected URL from .env: ${url} (replaced: ${oldTarget})`);
                        }
                    }
                }
                // Replace username/email placeholders
                if (step.action === 'type' && username) {
                    const targetLower = step.target.toLowerCase();
                    const valueLower = step.value?.toLowerCase() || '';
                    const descLower = step.description?.toLowerCase() || '';
                    // Check if this step is for email/username input
                    if (targetLower.includes('email') ||
                        targetLower.includes('username') ||
                        targetLower.includes('user') ||
                        valueLower.includes('user@example.com') ||
                        valueLower.includes('email') ||
                        descLower.includes('email') ||
                        descLower.includes('username') ||
                        descLower.includes('user')) {
                        step.value = username;
                        console.log(`  👤 Injected username: ${username.substring(0, 3)}***`);
                    }
                }
                // Replace password placeholders
                if (step.action === 'type' && password) {
                    const targetLower = step.target.toLowerCase();
                    const valueLower = step.value?.toLowerCase() || '';
                    const descLower = step.description?.toLowerCase() || '';
                    // Check if this step is for password input
                    if (targetLower.includes('password') ||
                        targetLower.includes('pass') ||
                        valueLower.includes('password') ||
                        descLower.includes('password') ||
                        descLower.includes('pass')) {
                        step.value = password;
                        console.log(`  🔒 Injected password: ***`);
                    }
                }
            }
        }
        return injectedPlan;
    }
    /**
     * Gets credentials from environment
     */
    static getCredentials() {
        return {
            url: process.env.TEST_URL || process.env.URL || process.env.BASE_URL,
            username: process.env.TEST_USERNAME || process.env.USERNAME || process.env.USER,
            password: process.env.TEST_PASSWORD || process.env.PASSWORD,
        };
    }
}
//# sourceMappingURL=credentialInjector.js.map