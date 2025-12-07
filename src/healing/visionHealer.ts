import OpenAI from 'openai';
import type { Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface VisionHealerResult {
  selector: string;
  confidence: number;
  coordinates?: { x: number; y: number };
}

export class VisionHealer {
  private openai: OpenAI;
  private screenshotDir: string;

  constructor(apiKey: string, screenshotDir: string = '.temp/screenshots') {
    this.openai = new OpenAI({ apiKey });
    this.screenshotDir = screenshotDir;
  }

  /**
   * Uses GPT-4 Vision to find an element on the page
   */
  async findElementWithVision(
    page: Page,
    description: string,
    context?: string
  ): Promise<VisionHealerResult> {
    // Take a screenshot
    const screenshotPath = path.join(
      this.screenshotDir,
      `vision-${Date.now()}.png`
    );
    await fs.mkdir(this.screenshotDir, { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Read screenshot as base64
    const imageBuffer = await fs.readFile(screenshotPath);
    const base64Image = imageBuffer.toString('base64');

    // Get page HTML context for better understanding
    const pageContent = await page.content();
    const simplifiedHTML = this.simplifyHTML(pageContent);

    // Call GPT-4 Vision
    const prompt = context
      ? `Find the element described as: "${description}". Context: ${context}. Return a CSS selector or XPath that can locate this element. Also provide the approximate coordinates if visible.`
      : `Find the element described as: "${description}". Return a CSS selector or XPath that can locate this element. Also provide the approximate coordinates if visible.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${prompt}\n\nHere's a simplified HTML structure:\n${simplifiedHTML.substring(0, 2000)}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const result = response.choices[0].message.content || '';
    
    // Parse the response to extract selector
    // GPT-4 Vision might return natural language, so we need to extract the selector
    const selectorMatch = result.match(/(?:selector|css|xpath)[:]\s*([^\n]+)/i) ||
                         result.match(/`([^`]+)`/) ||
                         result.match(/(["'])(?:(?=(\\?))\2.)*?\1/);

    const selector = selectorMatch ? selectorMatch[1].replace(/["']/g, '') : result.trim();

    // Try to extract coordinates if mentioned
    const coordMatch = result.match(/coordinate[s]?[:\s]+(\d+)[,\s]+(\d+)/i);
    const coordinates = coordMatch
      ? { x: parseInt(coordMatch[1]), y: parseInt(coordMatch[2]) }
      : undefined;

    return {
      selector,
      confidence: 0.8, // Default confidence
      coordinates,
    };
  }

  /**
   * Simplifies HTML for context (removes scripts, styles, etc.)
   */
  private simplifyHTML(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 5000);
  }
}

