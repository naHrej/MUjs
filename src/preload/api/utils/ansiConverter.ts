import { AnsiUp } from "ansi_up"

export function ansiToHtml(data: string, htmlEnabled: boolean): string {
  const ansi_up = new AnsiUp()
  ansi_up.escape_html = !htmlEnabled
  const html = ansi_up.ansi_to_html(data)
  return html
}
