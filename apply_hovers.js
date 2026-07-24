const fs = require('fs');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    let index = 0;
    while (true) {
        let btnStart = content.indexOf('<button', index);
        if (btnStart === -1) break;
        
        let inString = false;
        let stringChar = '';
        let btnEnd = -1;
        
        // Find the closing > of the opening <button> tag
        for (let i = btnStart + 7; i < content.length; i++) {
            let char = content[i];
            if (inString) {
                if (char === stringChar && content[i-1] !== '\\') {
                    inString = false;
                }
            } else {
                if (char === '"' || char === "'" || char === '') {
                    inString = true;
                    stringChar = char;
                } else if (char === '>') {
                    btnEnd = i;
                    break;
                }
            }
        }
        
        if (btnEnd !== -1) {
            let tagContent = content.substring(btnStart, btnEnd);
            
            // Check if it's an icon button by looking at innerText
            let nextTagStart = content.indexOf('<', btnEnd);
            let innerText = content.substring(btnEnd + 1, nextTagStart);
            let isIconButton = /^(?:✕|🗑|‹|›|←|→|✖|Eliminar|\\u2715|✖)$/.test(innerText.trim()) || tagContent.includes('🗑') || tagContent.includes('Eliminar');

            if (!tagContent.includes('className=')) {
                let inject = isIconButton ? ' className="hover-bright"' : ' className="hover-scale"';
                content = content.substring(0, btnStart + 7) + inject + content.substring(btnStart + 7);
                index = btnStart + 7 + inject.length;
            } else if (isIconButton && tagContent.includes('className="hover-scale"')) {
                // Change hover-scale to hover-bright
                content = content.substring(0, btnStart) + tagContent.replace('className="hover-scale"', 'className="hover-bright"') + content.substring(btnEnd);
            } else {
                index = btnEnd + 1;
            }
        } else {
            index = btnStart + 7;
        }
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated ' + filePath);
    }
}

const files = ['src/app/coach/EvaluacionesPanel.tsx', 'src/app/coach/CoachClient.tsx', 'src/app/coach/EnfermeriaPanel.tsx', 'src/app/coach/CanchasPanel.tsx', 'src/app/coach/InicioPanel.tsx'];
files.forEach(f => { if(fs.existsSync(f)) processFile(f) });
