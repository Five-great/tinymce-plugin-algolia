import { PrerenderSpaOptions, PrerenderSpaPlugin } from "./prerenderSpaPlugin"
import PuppeteerSpaRenderer from "./renderer"

import algoliasearch from 'algoliasearch';
// process.env.TP_ALGOLIA = {
//     APPLICATION_ID: 'LIXBD9IHZ6',
//     ADMIN_API_KEY: '73184f97149c9e07ece1eae4620ac374',
//     INDEX_NAME: 'tinymce-plugin-dev'
// }
// console.log( process.env.TP_ALGOLIA);

let ALGOLIA = process.env.TP_ALGOLIA && process.env.TP_ALGOLIA && !process.env.TP_ALGOLIA.INDEX_NAME? JSON.parse(process.env.TP_ALGOLIA||{}) : process.env.TP_ALGOLIA
ALGOLIA={
  APPLICATION_ID: 'LIXBD9IHZ6',
  ADMIN_API_KEY: '73184f97149c9e07ece1eae4620ac374',
  INDEX_NAME: 'tinymce-plugin-dev'
}
const APPLICATION_ID = ALGOLIA.APPLICATION_ID;
const ADMIN_API_KEY = ALGOLIA.ADMIN_API_KEY;
const INDEX_NAME = ALGOLIA.INDEX_NAME;
const client = algoliasearch(APPLICATION_ID, ADMIN_API_KEY)
const index = client.initIndex(INDEX_NAME)

const algoliasearchFun = async(objects)=>{
  console.log("Save Objects start");
    try {
       await index.clearObjects()
       let {objectIDs} = await index.saveObjects(objects, { autoGenerateObjectIDIfNotExist: true })
        console.log(objectIDs);
        console.log("Save Objects End");
    }catch (err) {
      console.error(err)
    }
}
export const setRoutes = (router:any) => {
  //@ts-ignore
  window.__PRERENDER_ROUTES__ = router.getRoutes();
}

export  async function  prerenderSpa(options?: PrerenderSpaOptions) {
      let routes = await  PrerenderSpaPlugin({ 
        staticDir: './dist',
        routes: ['/nextdisplay/vuedemo.html'],
        renderer: new PuppeteerSpaRenderer({
          // headless: false,
          maxConcurrentRoutes: 4,
          // renderAfterTime: 15000,
          renderAfterDocumentEventDelay: 10000,
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
        // algoliasearchFun()
        await algoliasearchFun(algoliaList)
      }
    
   }

