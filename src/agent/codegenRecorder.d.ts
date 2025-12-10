export interface RecordedAction {
    type: 'navigate' | 'click' | 'fill' | 'select' | 'press' | 'check' | 'uncheck';
    selector: string;
    value?: string;
    url?: string;
    timestamp: number;
    description?: string;
}
export interface RecordedSession {
    id: string;
    startTime: number;
    endTime?: number;
    baseUrl: string;
    actions: RecordedAction[];
    sourceFile?: string;
}
export declare class CodegenRecorder {
    /**
     * Records user actions using Playwright codegen
     */
    record(startUrl?: string): Promise<string>;
    /**
     * Parses Playwright codegen output into structured actions
     */
    parseCodegenFile(filepath: string, baseUrl?: string): Promise<RecordedSession>;
    private fileExists;
}
//# sourceMappingURL=codegenRecorder.d.ts.map