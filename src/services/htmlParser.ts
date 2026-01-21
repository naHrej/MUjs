import type { ParsedHTML } from '../shared/types/events'

export class HTMLParser {
  parse(data: string, host: string, sessionKey: string | null): ParsedHTML {
    const parser = new DOMParser()
    
    // Preserve leading spaces
    let processedData = data
    if (data.charAt(0) === ' ') {
      processedData = "&nbsp;" + data.slice(1)
    }

    const doc = parser.parseFromString(processedData, "text/html")
    const scripts = doc.querySelectorAll("script")
    const links = doc.querySelectorAll("link")
    const styles = doc.querySelectorAll("style")
    const mujsTags = doc.querySelectorAll("MUjs")

    const parsed: ParsedHTML = {
      content: '',
      scripts: [],
      links: [],
      styles: [],
      mujsTags: []
    }

    // Extract scripts (with validation)
    scripts.forEach((script) => {
      const src = script.getAttribute('src')
      const key = script.getAttribute('key')
      
      // Validate script: must have src, domain must match host, and key must match sessionKey
      if (src && src.includes(host) && key === sessionKey) {
        parsed.scripts.push({ src, key: key || undefined })
      }
    })

    // Extract links (must point to same domain)
    links.forEach((link) => {
      const href = link.getAttribute('href')
      if (href && href.includes(host)) {
        parsed.links.push({
          href,
          rel: link.getAttribute('rel') || '',
          type: link.getAttribute('type') || ''
        })
      }
    })

    // Extract styles
    styles.forEach((style) => {
      parsed.styles.push(style.textContent || '')
    })

    // Extract MUjs tags
    mujsTags.forEach((tag) => {
      parsed.mujsTags.push({
        style: tag.getAttribute('style') || undefined
      })
    })

    // Get content (excluding scripts, links, styles, MUjs tags)
    const children = Array.from(doc.body.childNodes).filter(
      (node) => node.nodeName !== "SCRIPT" && 
                node.nodeName !== "LINK" && 
                node.nodeName !== "STYLE" &&
                node.nodeName !== "MUJS"
    )
    
    // Convert children to HTML string
    const tempDiv = document.createElement('div')
    children.forEach((child) => {
      tempDiv.appendChild(child.cloneNode(true))
    })
    parsed.content = tempDiv.innerHTML

    return parsed
  }

  extractClickableElements(htmlString: string): Array<{ element: Element; onCommand?: string; onclickdobuffer?: string }> {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlString, "text/html")
    const elements: Array<{ element: Element; onCommand?: string; onclickdobuffer?: string }> = []

    doc.querySelectorAll("[onCommand], [onclickdobuffer]").forEach((node) => {
      elements.push({
        element: node,
        onCommand: node.getAttribute('onCommand') || undefined,
        onclickdobuffer: node.getAttribute('onclickdobuffer') || undefined
      })
    })

    return elements
  }
}
