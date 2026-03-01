/**
 * MÓDULO DE PREVIEW MARKDOWN
 * Converte Markdown para HTML em tempo real
 */

class MarkdownPreview {
    constructor() {
        this.rules = {
            headings: [
                { pattern: /^### (.*?)$/gm, replacement: '<h3>$1</h3>' },
                { pattern: /^## (.*?)$/gm, replacement: '<h2>$1</h2>' },
                { pattern: /^# (.*?)$/gm, replacement: '<h1>$1</h1>' }
            ],
            bold: [
                { pattern: /\*\*(.*?)\*\*/g, replacement: '<strong>$1</strong>' }
            ],
            italic: [
                { pattern: /\*(.*?)\*/g, replacement: '<em>$1</em>' }
            ],
            code: [
                { pattern: /`(.*?)`/g, replacement: '<code>$1</code>' }
            ],
            codeBlock: [
                { pattern: /```([\s\S]*?)```/g, replacement: '<pre><code>$1</code></pre>' }
            ],
            links: [
                { pattern: /\[(.*?)\]\((.*?)\)/g, replacement: '<a href="$2">$1</a>' }
            ],
            images: [
                { pattern: /!\[(.*?)\]\((.*?)\)/g, replacement: '<img src="$2" alt="$1">' }
            ],
            lists: [
                { pattern: /^\- (.*?)$/gm, replacement: '<li>$1</li>' }
            ],
            lineBreaks: [
                { pattern: /\n/g, replacement: '<br>' }
            ]
        };
    }

    /**
     * Converter Markdown para HTML
     */
    convert(markdown) {
        if (!markdown) return '';

        let html = markdown;

        // Code blocks primeiro (para não processar conteúdo dentro)
        html = this.applyRules(html, this.rules.codeBlock);

        // Depois o resto
        html = this.applyRules(html, this.rules.headings);
        html = this.applyRules(html, this.rules.bold);
        html = this.applyRules(html, this.rules.italic);
        html = this.applyRules(html, this.rules.code);
        html = this.applyRules(html, this.rules.links);
        html = this.applyRules(html, this.rules.images);
        html = this.applyRules(html, this.rules.lists);
        html = this.applyRules(html, this.rules.lineBreaks);

        return html;
    }

    /**
     * Aplicar regras de transformação
     */
    applyRules(text, rules) {
        return rules.reduce((result, rule) => {
            return result.replace(rule.pattern, rule.replacement);
        }, text);
    }

    /**
     * Limpar HTML (sanitizar)
     */
    sanitize(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }
}

// Instanciar conversor
const markdownPreview = new MarkdownPreview();

console.log('✅ Módulo de preview Markdown carregado');
