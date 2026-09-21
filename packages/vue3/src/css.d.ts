/** Vite умеет отдавать содержимое CSS-файла строкой — этим мы и подключаем стили. */
declare module '*.css?inline' {
  const css: string
  export default css
}
