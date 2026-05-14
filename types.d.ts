declare module "@mozilla/readability" {
  export interface ReadabilityOptions {
    charThreshold?: number;
  }
  export class Readability {
    constructor(document: Document, options?: ReadabilityOptions);
    parse(): { title: string; textContent: string; byline: string; } | null;
  }
}
