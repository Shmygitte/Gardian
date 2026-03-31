#!/usr/bin/env node
/**
 * Konvertiert docs/about-app.md → src/js/generated/about-content.js
 * Einfacher Markdown→HTML-Konverter (kein npm-Dependency noetig)
 */
const fs = require('fs');
const path = require('path');

const files = [
    { md: 'about-app.md',  varName: '__ABOUT_HTML__' },
    { md: 'about-user.md', varName: '__ABOUT_USER_HTML__' },
];

function mdToHtml(src) {
    let html = '';
    const lines = src.split('\n');
    let inList = false;
    let inTable = false;
    let inCode = false;
    let tableRows = [];

    function inline(text) {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
    }

    function closeList() {
        if (inList) { html += '</ul>\n'; inList = false; }
    }

    function closeTable() {
        if (inTable) {
            // Build table from collected rows
            let t = '<table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin:8px 0;">';
            tableRows.forEach((row, i) => {
                const tag = i === 0 ? 'th' : 'td';
                const style = i === 0
                    ? 'padding:6px 12px;text-align:left;border-bottom:2px solid var(--border);font-weight:600;color:var(--primary);'
                    : 'padding:6px 12px;border-bottom:1px solid var(--border);';
                const cells = row.split('|').filter(c => c.trim() !== '').map(c =>
                    `<${tag} style="${style}">${inline(c.trim())}</${tag}>`
                ).join('');
                t += `<tr>${cells}</tr>`;
            });
            t += '</table>';
            html += t + '\n';
            inTable = false;
            tableRows = [];
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code block
        if (line.trim().startsWith('```')) {
            if (inCode) { html += '</pre>\n'; inCode = false; }
            else { closeList(); closeTable(); html += '<pre style="background:var(--bg-surface);border:1px solid var(--border);border-radius:6px;padding:12px;font-size:0.8rem;overflow-x:auto;">\n'; inCode = true; }
            continue;
        }
        if (inCode) { html += line + '\n'; continue; }

        // Empty line
        if (line.trim() === '') { closeList(); closeTable(); continue; }

        // Table row
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            // Skip separator row (|---|---|)
            if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue;
            closeList();
            if (!inTable) inTable = true;
            tableRows.push(line.trim());
            continue;
        } else {
            closeTable();
        }

        // Headings
        const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
        if (headingMatch) {
            closeList(); closeTable();
            const level = headingMatch[1].length;
            const text = inline(headingMatch[2]);
            const styles = {
                1: 'font-size:1.3rem;font-weight:700;color:var(--primary);margin:20px 0 12px;border-bottom:2px solid var(--primary-light);padding-bottom:6px;',
                2: 'font-size:1.05rem;font-weight:600;color:var(--primary);margin:18px 0 8px;',
                3: 'font-size:0.9rem;font-weight:600;color:var(--text-main);margin:14px 0 6px;',
                4: 'font-size:0.85rem;font-weight:600;color:var(--text-muted);margin:10px 0 4px;',
            };
            html += `<h${level} style="${styles[level]}">${text}</h${level}>\n`;
            continue;
        }

        // List item
        if (/^[-*]\s+/.test(line.trim())) {
            closeTable();
            if (!inList) { html += '<ul style="margin:6px 0;padding-left:20px;font-size:0.85rem;line-height:1.6;">\n'; inList = true; }
            html += `<li>${inline(line.trim().replace(/^[-*]\s+/, ''))}</li>\n`;
            continue;
        }

        // Paragraph
        closeList(); closeTable();
        html += `<p style="font-size:0.85rem;line-height:1.6;color:var(--text-main);margin:6px 0;">${inline(line)}</p>\n`;
    }

    closeList();
    closeTable();
    if (inCode) html += '</pre>\n';
    return html;
}

const outPath = path.join(__dirname, '..', 'src', 'js', 'generated', 'about-content.js');
let jsContent = '// Auto-generated from docs/*.md – DO NOT EDIT\n';

for (const file of files) {
    const mdPath = path.join(__dirname, '..', 'docs', file.md);
    if (!fs.existsSync(mdPath)) {
        console.error(file.md + ' nicht gefunden:', mdPath);
        process.exit(1);
    }
    const md = fs.readFileSync(mdPath, 'utf-8');
    const htmlContent = mdToHtml(md);
    jsContent += `window.${file.varName} = ${JSON.stringify(htmlContent)};\n`;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, jsContent, 'utf-8');
console.log('about-content.js generiert (' + files.length + ' Dateien).');
