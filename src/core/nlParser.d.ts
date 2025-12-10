export interface TestStep {
    action: 'navigate' | 'click' | 'type' | 'select' | 'wait';
    target: string;
    value?: string;
    description: string;
}
export interface Scenario {
    name: string;
    steps: TestStep[];
}
export interface TestPlan {
    featureName: string;
    description: string;
    scenarios: Scenario[];
}
export declare class NLParser {
    private openai;
    constructor(apiKey: string);
    parse(instruction: string): Promise<TestPlan>;
}
//# sourceMappingURL=nlParser.d.ts.map