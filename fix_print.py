import sys

with open('src/app/coach/CoachClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """export function openPrintOverlay(html: string) {
  let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    const finalHtml = html.replace('</body>', '<script>let p=false; function doP(){if(!p){p=true; window.stop(); window.print();}} window.onload=function(){setTimeout(doP,500);}; setTimeout(doP, 3000);</script></body>');
    doc.write(finalHtml);
    doc.close();
  }
}"""

replacement = """export function openPrintOverlay(html: string) {
  let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    // Make iframe large enough so browser doesn't consider it fully hidden/tiny which could throttle it
    iframe.style.width = '800px';
    iframe.style.height = '100vh';
    iframe.style.opacity = '0.001';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    
    let p = false;
    const doP = () => {
      if (!p) {
        p = true;
        try { iframe.contentWindow?.stop(); } catch(e){}
        try { iframe.contentWindow?.print(); } catch(e){}
      }
    };
    
    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => setTimeout(doP, 500);
    }
    // Main window timeout - won't be throttled
    setTimeout(doP, 2500);
  }
}"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/app/coach/CoachClient.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")
