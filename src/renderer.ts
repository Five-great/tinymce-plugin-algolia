const promiseLimit = require('promise-limit')
import puppeteer from 'puppeteer'
const waitForRender = function (options) {
  !options&&(options =  {})
     
 const renderAfterFn = new Promise((resolve, reject) => {
  // Render when an event fires on the document.
     const resolveFn = options.renderAfterDocumentEventDelay?()=>{setTimeout(() =>resolve(''), options.renderAfterDocumentEventDelay)}:() => resolve('')
     if (options.renderAfterDocumentEvent) {if (window['__PRERENDER_STATUS'] && window['__PRERENDER_STATUS'].__DOCUMENT_EVENT_RESOLVED) resolveFn()
     //@ts-ignore
          document.addEventListener(options.renderAfterDocumentEvent, resolveFn())
    // Render after a certain number of milliseconds.
      
    } else if (options.renderAfterTime) {
      setTimeout(() => resolve(''), options.renderAfterTime)

    // Default: Render immediately after page content loads.
    } else {
      resolve('')
    }
  })
  return new Promise((resolve, reject)=>{
    renderAfterFn.then(()=>{
      if(!options['__PRERENDER_ROUTESED__']&&window['__PRERENDER_ROUTES__'] && window['__PRERENDER_ROUTES__'].length>0){
         options['__PRERENDER_ROUTESED__'] = true
         options['__PRERENDER_ROUTES__'] = window['__PRERENDER_ROUTES__']
      }

      /**
       *  lvl0: {
              selectors: '.sidebar-ul>.sidebar-li[data-ison="true"] .sidebar-title',
              defaultValue: 'Documentation',
            },
            lvl1: '.fv-mardown-html h1',
            lvl2: '.fv-mardown-html h2',
            lvl3: '.fv-mardown-html h3',
            lvl4: '.fv-mardown-html h4',
            lvl5: '.fv-mardown-html h5',
            lvl6: '.fv-mardown-html h6',
            content: '.fv-mardown-html p, .fv-mardown-html li',
       */
      let opt = {

      }
      let _baseURI = window.location.pathname //基础链接
    
      let headingLen = 0
      let hits = []
      let hitPrxUrl = window.location.pathname
      let _keys =  Object.keys
      let _assign = Object.assign
      let mainBody = document.querySelector('.fv-mardown-main')
      let lvl0 =   document.querySelector('aside .sidebar-Box .sidebar-ul .sidebar-li[data-ison="true"] .sidebar-title').innerText
      let heading = {lvl0: lvl0 }

      function ceateHierarchy(dataObj){
        dataObj&&dataObj.childNodes&&dataObj.childNodes?.length>0&&dataObj.childNodes.forEach(ele => {
            let hit={
              hierarchy: {
                lvl0: lvl0,
                lvl1: null,
                lvl2: null,
                lvl3: null,
                lvl4: null,
                lvl5: null,
                lvl6: null
            },
            content: '',
            url: _baseURI 
          }
          if(/^H[1-6]/.test(ele.nodeName)&&ele.innerText.trim()){
            let lvlnum = ele.nodeName[1]
            if(headingLen <= lvlnum){ //小于lvl
              _assign(hit.hierarchy, heading)
              hit.hierarchy['lvl'+lvlnum] = ele.innerText
            }else{
                keysList =  _keys(heading)
                for(let i =0 ;i<lvlnum;i++){
                  hit.hierarchy['lvl'+i] = heading[keysList[i]]
                }
            }
          
            //更新
            heading =  hit.hierarchy
            headingLen = lvlnum
            hit.type = 'lvl'+lvlnum
            hit.url = _baseURI+'#'+ele.id
            hitPrxUrl =  hit.url
            hits.push(hit)
          }

          if(/^P$/.test(ele.nodeName)&&ele?.className.indexOf('language-')==-1&&ele.innerText.trim()){
            _assign(hit.hierarchy, heading)
            hit.type = 'content'
            hit.content = ele.innerText.trim()
            hit.url = hitPrxUrl
            hits.push(hit)
          }

          if(/^(UL|DIV|OL|BLOCKQUOTE)$/.test(ele.nodeName)){
              ceateHierarchy(ele)
           }

        })
      }
      if(mainBody&&mainBody.childNodes){
        ceateHierarchy(mainBody)
      options['__ALGOLIA_ROUTES__'] = hits
    }
        resolve(options)
    })
   
  })
 
}

class PuppeteerSpaRenderer {
  _puppeteer: any
  _rendererOptions: any
  _newrendererOptions: {}
  constructor (rendererOptions) {
    this._puppeteer = null
    this._rendererOptions = rendererOptions || {}

    if (this._rendererOptions.maxConcurrentRoutes == null) this._rendererOptions.maxConcurrentRoutes = 0

    if (this._rendererOptions.inject && !this._rendererOptions.injectProperty) {
      this._rendererOptions.injectProperty = '__PRERENDER_INJECTED'
    }
  }

  async initialize () {
    try {
      // Workaround for Linux SUID Sandbox issues.
      if (process.platform === 'linux') {
        if (!this._rendererOptions.args) this._rendererOptions.args = []

        if (this._rendererOptions.args.indexOf('--no-sandbox') === -1) {
          this._rendererOptions.args.push('--no-sandbox')
          this._rendererOptions.args.push('--disable-setuid-sandbox')
        }
      }

      this._puppeteer = await puppeteer.launch(this._rendererOptions)
    } catch (e) {
      console.error(e)
      console.error('[Prerenderer - PuppeteerRenderer] Unable to start Puppeteer')
      // Re-throw the error so it can be handled further up the chain. Good idea or not?
      throw e
    }

    return this._puppeteer
  }

  async handleRequestInterception (page, baseURL) {
    await page.setRequestInterception(true)

    page.on('request', req => {
      // Skip third party requests if needed.
      if (this._rendererOptions.skipThirdPartyRequests) {
        if (!req.url().startsWith(baseURL)) {
          req.abort()
          return
        }
      }

      req.continue()
    })
  }

  async renderRoutes (routes, Prerenderer) {
    const rootOptions = Prerenderer.getOptions()
    this._newrendererOptions = { }
    const options = this._rendererOptions
    let excludeRoutes = ['index',"/:path(.*)"]

    const limiter = promiseLimit(this._rendererOptions.maxConcurrentRoutes)
    const pagePromises = (_routes:Array<any>): Promise<Array<any>> => {
      return  new Promise((resolve, reject) => { 
      let queue =  Promise.all(
          _routes.map(
            (route, index) => limiter(
              async () => {
               console.log(`%c[vite-prerender-spa] %c Prerender page ...${route}`, 'color: blue;','color: #ffff;');
                const page = await this._puppeteer.newPage()
                excludeRoutes.push(route)
                if (options.consoleHandler) {
                  page.on('console', message => options.consoleHandler(route, message))
                }

                if (options.inject) {
                  await page.evaluateOnNewDocument(`(function () { window['${options.injectProperty}'] = ${JSON.stringify(options.inject)}; })();`)
                }

                const baseURL = `https://tinymce-plugin.github.io`

                // Allow setting viewport widths and such.
                if (options.viewport) await page.setViewport(options.viewport)

                await this.handleRequestInterception(page, baseURL)

                // Hack just in-case the document event fires before our main listener is added.
                if (options.renderAfterDocumentEvent) {
                  page.evaluateOnNewDocument(function (options) {
                    window['__PRERENDER_STATUS'] = {}
                    document.addEventListener(options.renderAfterDocumentEvent, () => {
                      window['__PRERENDER_STATUS'].__DOCUMENT_EVENT_RESOLVED = true
                    })
                  }, this._rendererOptions)
                }
                
                const navigationOptions = (options.navigationOptions) ? { waituntil: 'networkidle0', ...options.navigationOptions } : { waituntil: 'networkidle0' };
                await page.goto(`${baseURL}${route}`, navigationOptions);

                const { renderAfterElementExists } = this._rendererOptions
                if (renderAfterElementExists && typeof renderAfterElementExists === 'string') {
                  await page.waitForSelector(renderAfterElementExists)
                }
                let routeAlgolia = ''
               
                !this._newrendererOptions['__PRERENDER_ROUTESED__']?
                    this._newrendererOptions =  await page.evaluate(waitForRender, this._rendererOptions)
                      : routeAlgolia = await page.evaluate(waitForRender, this._newrendererOptions)

                      // console.log(routeAlgolia['__ALGOLIA_ROUTES__'])
                const result = {
                  algolia: routeAlgolia['__ALGOLIA_ROUTES__'],
                  originalRoute: route,
                  route: await page.evaluate('window.location.pathname'),
                  html: await page.content()
                }

                // console.log(result.algolia);
                
                await page.close()
                return result
              }
            )
          )
        )
        queue.then(resolve).catch(reject)
      })
    }
    let results:any = await pagePromises(routes)
    let routes2 = []
    let newRoutes = this._newrendererOptions['__PRERENDER_ROUTES__']
      newRoutes = newRoutes.filter(route => {
        if(!(route.children&&route.children.length>0)&&excludeRoutes.indexOf(route.path)===-1){
           routes2.push(route.path)
           return true
        }
      // return excludeRoutes.indexOf(route.path) === -1
    })
   routes2&&results.push(...await pagePromises(routes2))
    return results
  }
  destroy () {
    this._puppeteer.close()
  }
}

export default PuppeteerSpaRenderer
