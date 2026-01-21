import { AnsiUp } from 'ansi_up'
import type { ProcessedData } from '../shared/types/events'

export class DataProcessor {
  private ansiConverter = new AnsiUp()

  process(rawData: string, options: { ansiEnabled: boolean; htmlEnabled: boolean }): ProcessedData {
    let processed = rawData

    // Remove control characters
    processed = processed.replace(/[\x00\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    // Convert ANSI if enabled
    if (options.ansiEnabled) {
      this.ansiConverter.escape_html = !options.htmlEnabled
      processed = this.ansiConverter.ansi_to_html(processed)
    }

    return {
      raw: rawData,
      processed,
      timestamp: Date.now()
    }
  }
}
