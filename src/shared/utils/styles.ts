/**
 * Shared utility for loading and applying LESS stylesheets
 * Extracted from duplicate implementations across the codebase
 */
export function loadStyleFromURL(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Remove .less extension if present and add timestamp for cache busting
    url = url.split('.less')[0]
    url += '.less?' + new Date().getTime()

    // Use global less object if available (from CDN or build)
    if (typeof (window as any).less !== 'undefined') {
      const less = (window as any).less
      less.render('@import "' + url + '";', { async: true }, (error: any, output: any) => {
        if (error) {
          console.error('LESS compilation error:', error)
          reject(error)
        } else {
          applyStyle(output.css)
          resolve()
        }
      })
    } else {
      // Fallback: try to load as CSS directly
      loadCSS(url.replace('.less', '.css'))
      resolve()
    }
  })
}

function applyStyle(css: string) {
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

function loadCSS(url: string) {
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
