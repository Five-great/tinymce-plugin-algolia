import { PrerenderSpaOptions, PrerenderSpaPlugin } from "./prerenderSpaPlugin"
import PuppeteerSpaRenderer from "./renderer"


export const setRoutes = (router:any) => {
  //@ts-ignore
  window.__PRERENDER_ROUTES__ = router.getRoutes();
}

export  async function  prerenderSpa(options?: PrerenderSpaOptions) {
      let routes = await  PrerenderSpaPlugin({ 
        staticDir: require('path').resolve('./src'),
        routes: ['/nextplan/info.html'],
        renderer: new PuppeteerSpaRenderer({
        //  headless: false,
          maxConcurrentRoutes: 4,
          // renderAfterTime: 15000,
          renderAfterDocumentEventDelay: 3000,
          renderAfterDocumentEvent: 'render-event',
          // callback:()=>{
          //   uploadGithub()
          // }
        })
      })

      let algoliaList = []
      if(typeof routes ==="object"){
        let _routesObj = {}
        let routesArr = []
         routes.map((route:any)=>{
          routesArr.push(route.route)
          _routesObj[route.route]= route.outputPath
          route.algolia&& route.algolia?.length>0&&algoliaList.push(...route.algolia)
         
        })
       // fs.writeFileSync('./dist/algolia2.json',JSON.stringify({data: routes},null,2),'utf8')
        // // algoliasearchFun()
        // __dirName
       // await algoliasearchFun(algoliaList)
      }
    
   }

