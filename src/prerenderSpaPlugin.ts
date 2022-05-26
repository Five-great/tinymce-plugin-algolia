
import fs from 'fs'
import path from 'path'
//@ts-ignore
import Prerenderer from "@prerenderer/prerenderer"
import PuppeteerSpaRenderer from './renderer'


export  interface PrerenderSpaOptions{
  routes?:any[]
  outputDir?:string
  staticDir?:string
  headless?:boolean
  postProcess?:(renderedRoute:any)=>any
  postProcessHtml?:(renderedRoute:any)=>any
  minify?:any
}
export function PrerenderSpaPlugin (...args) {
   return new Promise((resolve,reject)=>{
  let rendererOptions = {} // Primarily for backwards-compatibility.

  this._options = {}

  // Normal args object.
  if (args.length === 1) {
    this._options = args[0] || {}

  // Backwards-compatibility with v2
  } else {
    console.warn("[vite-prerender-spa] You appear to be using the v3 argument-based configuration options. It's recommended that you migrate to the clearer object-based configuration system.\nCheck the documentation for more information.")
    let staticDir, routes

    args.forEach(arg => {
      if (typeof arg === 'string') staticDir = arg
      else if (Array.isArray(arg)) routes = arg
      else if (typeof arg === 'object') this._options = arg
    })

    staticDir ? this._options.staticDir = staticDir : null
    routes ? this._options.routes = routes : null
  }

  

  this._options.server = this._options.server || {}
  this._options.renderer = this._options.renderer || new PuppeteerSpaRenderer(Object.assign({}, { headless: true }, rendererOptions,this._options))

  if (this._options.postProcessHtml) {
    console.warn('[vite-prerender-spa] postProcessHtml should be migrated to postProcess! Consult the documentation for more information.')
  }

  afterEmit( this._options, (routes)=>{
    resolve(routes)
})
})
}

// const mkdir = async function (dir) {
//   if (fs.existsSync(dir)) {
//     return true
//   } else {
//     if (mkdir(path.dirname(dir))) {
//       fs.mkdirSync(dir)
//       return true
//     }
//   }
// }
const mkdirs = (pathname) => {
  // 需要判断是否是绝对路径（避免不必要的 bug）
 return new Promise((resolve,reject)=>{
  // 获取相对路径
  
  let floders = pathname.split(path.sep);

  let _pathname = floders.shift()+path.sep;
  // console.log(floders);
  floders.forEach((floder,index)=>{
      _pathname = _pathname+floder+path.sep
    try {
      // 没有异常，文件已经创建，提示用户该文件已经创建
     let _stat = fs.statSync(_pathname);
      // console.log(_stat);
      !_stat&&fs.mkdirSync(_pathname);
    } catch (err) {
      // 抛出异常，文件不存在则创建文件
   
      
      try {
        // 避免父文件还没有创建的时候，先创建子文件所出现的意外 bug，这里选择同步创建文件
        fs.mkdirSync(_pathname);
      } catch (error) {
        reject(error)
      }
     
   }
  
  })
  resolve('ok')

  
  // });
})
}
  



const afterEmit = (_options ,done) => {
  const PrerendererInstance = new Prerenderer(_options)
  PrerendererInstance.initialize()
    .then(() => {
      return PrerendererInstance.renderRoutes(_options.routes || [])
    })
    // Backwards-compatibility with v2 (postprocessHTML should be migrated to postProcess)
    .then(renderedRoutes =>{
      return (_options .postProcessHtml
      ? renderedRoutes.map(renderedRoute => {
        const processed = _options .postProcessHtml(renderedRoute)
        if (typeof processed === 'string') renderedRoute.html = processed
        else renderedRoute = processed

        return renderedRoute
      })
      : renderedRoutes)
    }
    )
    .then(r => {
      PrerendererInstance.destroy()
      done(r)
    })
    .catch(err => {
      PrerendererInstance.destroy()
      const msg = '[vite-prerender-spa] Unable to prerender all routes!'
      console.error(msg)
      // compilation.errors.push(new Error(msg))
      done('err')
    })
}