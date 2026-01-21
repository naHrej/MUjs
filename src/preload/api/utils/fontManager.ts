import SystemFonts from "system-font-families"

export async function getFonts(): Promise<string[]> {
  const ssf = new SystemFonts()
  const getFonts = ssf.getFontsSync()
  return getFonts
}
