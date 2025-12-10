/**
 * Self-healing mechanism for API tests
 * Learns from successful requests and updates test patterns
 */
import * as fs from 'fs';
import * as path from 'path';
const HEALING_PATTERNS_FILE = path.join(process.cwd(), '.test-patterns.json');
/**
 * Load successful request patterns
 */
export function loadSuccessfulPatterns() {
    try {
        if (fs.existsSync(HEALING_PATTERNS_FILE)) {
            const content = fs.readFileSync(HEALING_PATTERNS_FILE, 'utf-8');
            return JSON.parse(content);
        }
    }
    catch (error) {
        console.warn('Failed to load healing patterns:', error);
    }
    return [];
}
/**
 * Save a successful request pattern
 */
export function saveSuccessfulPattern(pattern) {
    try {
        const patterns = loadSuccessfulPatterns();
        // Check if pattern already exists (same endpoint + method)
        const existingIndex = patterns.findIndex(p => p.endpoint === pattern.endpoint && p.method === pattern.method);
        if (existingIndex >= 0) {
            patterns[existingIndex] = pattern;
        }
        else {
            patterns.push(pattern);
        }
        // Keep only last 100 patterns
        if (patterns.length > 100) {
            patterns.shift();
        }
        fs.writeFileSync(HEALING_PATTERNS_FILE, JSON.stringify(patterns, null, 2), 'utf-8');
    }
    catch (error) {
        console.warn('Failed to save healing pattern:', error);
    }
}
/**
 * Find a successful pattern for an endpoint
 */
export function findPatternForEndpoint(endpoint, method) {
    const patterns = loadSuccessfulPatterns();
    return patterns.find(p => p.endpoint === endpoint && p.method === method) || null;
}
/**
 * Extract minimal request body from successful pattern
 */
export function getMinimalRequestBodyFromPattern(endpoint, method) {
    const pattern = findPatternForEndpoint(endpoint, method);
    if (!pattern) {
        return null;
    }
    // Return a simplified version of the successful request body
    return pattern.requestBody;
}
/**
 * Get response type from successful pattern
 */
export function getResponseTypeFromPattern(endpoint, method) {
    const pattern = findPatternForEndpoint(endpoint, method);
    if (!pattern) {
        return 'unknown';
    }
    const response = pattern.responseBody;
    if (typeof response === 'number') {
        return 'integer';
    }
    else if (typeof response === 'string') {
        return 'string';
    }
    else if (Array.isArray(response)) {
        return 'array';
    }
    else if (typeof response === 'object' && response !== null) {
        return 'object';
    }
    return 'unknown';
}
/**
 * Get detailed response structure from successful pattern
 * Returns structure information for array responses
 */
export function getResponseStructureFromPattern(endpoint, method) {
    const pattern = findPatternForEndpoint(endpoint, method);
    if (!pattern || !Array.isArray(pattern.responseBody)) {
        return null;
    }
    const firstItem = pattern.responseBody[0];
    if (!firstItem || typeof firstItem !== 'object') {
        return null;
    }
    return {
        itemStructure: {
            type: 'object',
            properties: Object.keys(firstItem).reduce((acc, key) => {
                acc[key] = typeof firstItem[key];
                return acc;
            }, {})
        },
        assertionNote: `Each item in the array is an object with properties: ${Object.keys(firstItem).join(', ')}`
    };
}
//# sourceMappingURL=self-healing.js.map