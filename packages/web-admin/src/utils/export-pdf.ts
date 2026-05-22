import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/** HTML 实体转义，防止 XSS */
function escapeHtml(str: any): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 将 DOM 元素渲染为 PDF 并触发浏览器下载
 */
export async function exportElementToPdf(el: HTMLElement, filename: string) {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const imgWidth = canvas.width
  const imgHeight = canvas.height
  const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait'

  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [imgWidth + 40, imgHeight + 40],
  })

  pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight)
  pdf.save(`${filename}.pdf`)
}

/**
 * 用表格数据生成 HTML 表格，然后导出为 PDF
 */
export async function exportTableToPdf(
  title: string,
  columns: { header: string; dataKey: string }[],
  rows: Record<string, any>[],
  filename: string,
) {
  const div = document.createElement('div')
  div.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;padding:30px;font-family:sans-serif'
  div.innerHTML = `
    <h1 style="text-align:center;margin-bottom:20px;font-size:20px;color:#333">${escapeHtml(title)}</h1>
    <table style="border-collapse:collapse;width:100%;font-size:13px;color:#333">
      <thead>
        <tr style="background:#409EFF;color:#fff">
          ${columns.map(c => `<th style="padding:10px 12px;border:1px solid #ddd;text-align:left">${escapeHtml(c.header)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, i) => `
          <tr style="background:${i % 2 === 0 ? '#fff' : '#f5f7fa'}">
            ${columns.map(c => `<td style="padding:8px 12px;border:1px solid #ddd">${escapeHtml(row[c.dataKey])}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
  document.body.appendChild(div)

  try {
    const canvas = await html2canvas(div, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
    const imgData = canvas.toDataURL('image/png')
    const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait'

    const pdf = new jsPDF({ orientation, unit: 'px', format: [canvas.width + 60, canvas.height + 60] })
    pdf.addImage(imgData, 'PNG', 30, 30, canvas.width, canvas.height)
    pdf.save(`${filename}.pdf`)
  } finally {
    document.body.removeChild(div)
  }
}
