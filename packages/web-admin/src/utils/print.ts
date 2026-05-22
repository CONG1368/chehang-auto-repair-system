import printJS from 'print-js'
import commonCss from '@/components/PrintTemplate/print-common.css?inline'

export function printHtml(html: string, style?: string) {
  printJS({
    printable: html,
    type: 'raw-html',
    style: (style || '') + commonCss,
    scanStyles: false,
  })
}
