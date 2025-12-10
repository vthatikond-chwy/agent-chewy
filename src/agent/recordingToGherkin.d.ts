import type { RecordedSession } from './codegenRecorder.js';
export interface GeneratedTest {
    feature: string;
    steps: string;
}
export declare class RecordingToGherkinGenerator {
    constructor(apiKey?: string);
    generate(recording: RecordedSession): Promise<GeneratedTest>;
    private generateSimpleFeature;
    private getClickDescription;
    private getFillDescription;
    private generateSimpleSteps;
    private shouldWaitForNavigation;
    private convertSelectorToCode;
}
//# sourceMappingURL=recordingToGherkin.d.ts.map