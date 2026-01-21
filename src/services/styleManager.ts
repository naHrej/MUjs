export class StyleManager {
  private currentStyleUrl: string | null = null

  loadStyleFromURL(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Remove .less extension if present and add timestamp for cache busting
      url = url.split('.less')[0]
      url += '.less?' + new Date().getTime()

      // Use dynamic import for LESS if available, or fetch and compile
      // For now, we'll use the global less object if available
      if (typeof (window as any).less !== 'undefined') {
        const less = (window as any).less
        less.render('@import "' + url + '";', { async: true }, (error: any, output: any) => {
          if (error) {
            console.error('LESS compilation error:', error)
            reject(error)
          } else {
            this.applyStyle(output.css)
            this.currentStyleUrl = url
            resolve()
          }
        })
      } else {
        // Fallback: try to load as CSS directly
        this.loadCSS(url.replace('.less', '.css'))
        this.currentStyleUrl = url
        resolve()
      }
    })
  }

  private applyStyle(css: string) {
    // Remove old style tag if it exists
    const oldStyle = document.getElementById('dynamic-style')
    if (oldStyle) {
      oldStyle.remove()
    }

    // Create new style tag
    const style = document.createElement('style')
    style.id = 'dynamic-style'
    style.textContent = css
    document.head.appendChild(style)
  }

  private loadCSS(url: string) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    link.id = 'dynamic-style'
    
    // Remove old style tag if it exists
    const oldStyle = document.getElementById('dynamic-style')
    if (oldStyle) {
      oldStyle.remove()
    }
    
    document.head.appendChild(link)
  }

  getCurrentStyleUrl(): string | null {
    return this.currentStyleUrl
  }

  reload(): void {
    if (this.currentStyleUrl) {
      this.loadStyleFromURL(this.currentStyleUrl)
    }
  }
}
