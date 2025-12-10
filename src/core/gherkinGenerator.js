export class GherkinGenerator {
    /**
     * Converts a TestPlan to Gherkin .feature file content
     */
    generate(plan) {
        const lines = [];
        // Feature header
        lines.push(`Feature: ${plan.featureName}`);
        lines.push(`  ${plan.description}`);
        lines.push('');
        // Generate scenarios
        for (const scenario of plan.scenarios) {
            lines.push(`  Scenario: ${scenario.name}`);
            for (const step of scenario.steps) {
                const gherkinStep = this.stepToGherkin(step);
                lines.push(`    ${gherkinStep}`);
            }
            lines.push('');
        }
        return lines.join('\n');
    }
    /**
     * Converts a TestStep to Gherkin syntax
     */
    stepToGherkin(step) {
        switch (step.action) {
            case 'navigate':
                return `Given I navigate to "${step.target}"`;
            case 'click':
                return `When I click on "${step.target}"`;
            case 'type':
                if (step.value) {
                    return `When I type "${step.value}" into "${step.target}"`;
                }
                return `When I type into "${step.target}"`;
            case 'select':
                if (step.value) {
                    return `When I select "${step.value}" from "${step.target}"`;
                }
                return `When I select from "${step.target}"`;
            case 'wait':
                return `And I wait for "${step.target}"`;
            default:
                return `And ${step.description}`;
        }
    }
    /**
     * Saves the generated Gherkin content to a file
     */
    async saveToFile(plan, filePath) {
        const content = this.generate(plan);
        const fs = await import('fs/promises');
        await fs.writeFile(filePath, content, 'utf-8');
    }
}
//# sourceMappingURL=gherkinGenerator.js.map