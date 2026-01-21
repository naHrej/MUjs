import Store from 'electron-store'
import path from 'path'

// Single store instance for the entire application
export const store = new Store({
  defaults: {
    settings: {
      fontFamily: 'Consolas-pIqaD',
      fontSize: 14,
      watchPath: path.resolve('../../'),
      ansiEnabled: false,
      htmlEnabled: false,
      connectOnStartup: false,
      authString: ''
    },
    timers: {
      timer1: {
        name: 'Timer 1',
        interval: 60000,
        enabled: false,
        send: "idle"
      },
      timer2: {
        name: 'Timer 2',
        interval: 60000,
        enabled: false,
        send: "idle"
      }
    },
    sites: {
      site1: {
        name: 'klinMoo',
        host: 'code.deanpool.net',
        port: 1701,
        htmlEnabled: true,
        ansiEnabled: false,
        websocketEnabled: false
      },
    }
  }
})
