import { defineConfig } from 'vite'
import path from "path";
import {prerenderSpa}from "./src/index"
const pathResolve = (pathStr:string) => {
  return path.resolve(__dirname, pathStr);
};
// https://vitejs.dev/config/
export default defineConfig(async({ command, mode })=>{
  await prerenderSpa()
  return {
    resolve:{
      extensions:['.ts', '.jsx', '.tsx', '.json','.md']
    },
    publicDir: false,
    build:{
      chunkSizeWarningLimit: 2000,
      lib: {
        entry: './build/siteMap.ts',
        name: 'siteMap',
        formats: ["cjs"],
        fileName: (format) => `siteMap.js`
      },
      outDir: "./build/lib",
      rollupOptions: {
        // 确保外部化处理那些你不想打包进库的依赖
        external: ['vue'],
        output: {
          // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
          globals: {
            vue: 'Vue'
          }
        }
      }
    }
  }
  
})