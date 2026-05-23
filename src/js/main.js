/**
 * Retro GUI Builder Engine
 * Autor: [Everson Mayer] (https://github.com/everctba)
 * Data/Hora: 2026-05-22
 */

class RetroBuilder {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.themeSelector = document.getElementById('theme-selector');
        this.widgets = [];
        this.selectedWidget = null;
        this.snapSize = 8;
        this.maxZIndex = 100;
        this.minZIndex = 100;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        this.themeSelector.addEventListener('change', (e) => {
            document.body.className = `theme-${e.target.value}`;
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportLayout();
        });

        // Deselect when clicking canvas
        this.canvas.addEventListener('click', (e) => {
            if (e.target === this.canvas) {
                this.selectWidget(null);
            }
        });

        // Delete widget on Delete key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedWidget) {
                this.selectedWidget.remove();
                this.widgets = this.widgets.filter(w => w !== this.selectedWidget);
                this.selectWidget(null);
            }
        });
    }

    setupDragAndDrop() {
        const widgetItems = document.querySelectorAll('.widget-item');
        
        widgetItems.forEach(item => {
            item.setAttribute('draggable', true);
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('widget-type', item.dataset.type);
            });
        });

        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('widget-type');
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.addWidget(type, x, y);
        });
    }

    addWidget(type, x, y) {
        // Snap to grid
        x = Math.round(x / this.snapSize) * this.snapSize;
        y = Math.round(y / this.snapSize) * this.snapSize;

        const widgetEl = document.createElement('div');
        widgetEl.className = 'gui-widget';
        widgetEl.style.left = `${x}px`;
        widgetEl.style.top = `${y}px`;
        widgetEl.style.zIndex = ++this.maxZIndex;
        
        let content = '';
        switch(type) {
            case 'button':
                widgetEl.style.width = '100px';
                widgetEl.style.height = '30px';
                content = `<button class="btn-retro" style="width:100%; height:100%">Novo Botão</button>`;
                break;
            case 'input':
                widgetEl.style.width = '120px';
                widgetEl.style.height = '24px';
                content = `<input type="text" class="input-retro" style="width:100%; height:100%" value="Texto...">`;
                break;
            case 'label':
                widgetEl.style.width = '80px';
                widgetEl.style.height = '20px';
                content = `<span class="label-retro" style="width:100%; height:100%">Label</span>`;
                break;
            case 'groupbox':
                widgetEl.style.width = '200px';
                widgetEl.style.height = '150px';
                content = `
                    <div class="groupbox-retro" style="width:100%; height:100%">
                        <span class="groupbox-title">GroupBox</span>
                    </div>`;
                break;
            case 'progressbar':
                widgetEl.style.width = '150px';
                widgetEl.style.height = '20px';
                content = `
                    <div class="progressbar-retro" style="width:100%; height:100%">
                        <div class="progressbar-fill" style="width:50%"></div>
                    </div>`;
                break;
            default:
                widgetEl.style.width = '100px';
                widgetEl.style.height = '100px';
                content = `<div class="panel-retro" style="width:100%; height:100%; border:1px solid #000"></div>`;
        }

        widgetEl.innerHTML = content;
        widgetEl.addEventListener('mousedown', (e) => this.startDragging(e, widgetEl));
        widgetEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectWidget(widgetEl);
        });

        this.canvas.appendChild(widgetEl);
        this.widgets.push(widgetEl);
        this.selectWidget(widgetEl);
    }

    selectWidget(el) {
        if (this.selectedWidget) {
            this.selectedWidget.classList.remove('selected');
            this.removeResizeHandles(this.selectedWidget);
        }
        this.selectedWidget = el;
        if (el) {
            el.classList.add('selected');
            this.addResizeHandles(el);
            this.updatePropertiesPanel(el);
        } else {
            document.getElementById('properties-panel').innerHTML = '<p class="empty-msg">Selecione um widget</p>';
        }
    }

    addResizeHandles(el) {
        const positions = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        positions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}`;
            handle.setAttribute('data-editor-only', 'true');
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startResizing(e, el, pos);
            });
            el.appendChild(handle);
        });
    }

    removeResizeHandles(el) {
        const handles = el.querySelectorAll('.resize-handle');
        handles.forEach(h => h.remove());
    }

    startResizing(e, el, pos) {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = parseInt(el.style.width);
        const startHeight = parseInt(el.style.height);
        const startLeft = parseInt(el.style.left);
        const startTop = parseInt(el.style.top);

        const onMouseMove = (moveEvent) => {
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            if (pos.includes('e')) newWidth = startWidth + dx;
            if (pos.includes('s')) newHeight = startHeight + dy;
            if (pos.includes('w')) {
                newWidth = startWidth - dx;
                newLeft = startLeft + dx;
            }
            if (pos.includes('n')) {
                newHeight = startHeight - dy;
                newTop = startTop + dy;
            }

            // Snap to grid
            newWidth = Math.round(newWidth / this.snapSize) * this.snapSize;
            newHeight = Math.round(newHeight / this.snapSize) * this.snapSize;
            newLeft = Math.round(newLeft / this.snapSize) * this.snapSize;
            newTop = Math.round(newTop / this.snapSize) * this.snapSize;

            if (newWidth > 10) {
                el.style.width = `${newWidth}px`;
                el.style.left = `${newLeft}px`;
            }
            if (newHeight > 10) {
                el.style.height = `${newHeight}px`;
                el.style.top = `${newTop}px`;
            }

            this.updatePropertiesPanel(el);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    startDragging(e, el) {
        e.preventDefault();
        this.selectWidget(el);

        const rect = el.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const onMouseMove = (moveEvent) => {
            const canvasRect = this.canvas.getBoundingClientRect();
            let x = moveEvent.clientX - canvasRect.left - offsetX;
            let y = moveEvent.clientY - canvasRect.top - offsetY;

            // Snap to grid
            x = Math.round(x / this.snapSize) * this.snapSize;
            y = Math.round(y / this.snapSize) * this.snapSize;

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    updatePropertiesPanel(el) {
        const panel = document.getElementById('properties-panel');
        const widgetType = el.querySelector('[class*="-retro"]')?.className.split(' ')[0].split('-')[0] || 'widget';
        
        let extraProps = '';
        if (el.querySelector('.progressbar-fill')) {
            const currentProgress = el.querySelector('.progressbar-fill').style.width;
            extraProps += `
                <div class="prop-group">
                    <label>Progresso (%):</label>
                    <input type="number" value="${parseInt(currentProgress)}" id="prop-progress" min="0" max="100">
                </div>
            `;
        }

        panel.innerHTML = `
            <div class="prop-group">
                <label>Texto/Título:</label>
                <input type="text" value="${this.getWidgetText(el)}" id="prop-text">
            </div>
            <div class="prop-group">
                <label>Largura (px):</label>
                <input type="number" value="${parseInt(el.style.width) || 0}" id="prop-w">
            </div>
            <div class="prop-group">
                <label>Altura (px):</label>
                <input type="number" value="${parseInt(el.style.height) || 0}" id="prop-h">
            </div>
            <div class="prop-group">
                <label>Posição X:</label>
                <input type="number" value="${parseInt(el.style.left)}" id="prop-x">
            </div>
            <div class="prop-group">
                <label>Posição Y:</label>
                <input type="number" value="${parseInt(el.style.top)}" id="prop-y">
            </div>
            <div class="prop-group">
                <label>Camada (Z-Index):</label>
                <input type="number" value="${el.style.zIndex}" id="prop-z">
            </div>
            <div class="prop-group">
                <label>Dica (Hint):</label>
                <input type="text" value="${el.getAttribute('data-hint') || ''}" id="prop-hint" placeholder="Texto do balão amarelo...">
            </div>
            <div class="prop-group layer-controls">
                <button id="btn-front" class="tool-btn">Trazer para Frente</button>
                <button id="btn-back" class="tool-btn">Enviar para Trás</button>
            </div>
            ${extraProps}
        `;

        // Event listeners
        document.getElementById('prop-text').addEventListener('input', (e) => {
            this.setWidgetText(el, e.target.value);
        });

        document.getElementById('prop-w').addEventListener('input', (e) => {
            el.style.width = `${e.target.value}px`;
        });

        document.getElementById('prop-h').addEventListener('input', (e) => {
            el.style.height = `${e.target.value}px`;
        });

        document.getElementById('prop-x').addEventListener('input', (e) => {
            el.style.left = `${e.target.value}px`;
        });

        document.getElementById('prop-y').addEventListener('input', (e) => {
            el.style.top = `${e.target.value}px`;
        });

        document.getElementById('prop-z').addEventListener('input', (e) => {
            el.style.zIndex = e.target.value;
        });

        document.getElementById('prop-hint').addEventListener('input', (e) => {
            if (e.target.value) {
                el.setAttribute('data-hint', e.target.value);
            } else {
                el.removeAttribute('data-hint');
            }
        });

        document.getElementById('btn-front').addEventListener('click', () => {
            this.bringToFront(el);
            document.getElementById('prop-z').value = el.style.zIndex;
        });

        document.getElementById('btn-back').addEventListener('click', () => {
            this.sendToBack(el);
            document.getElementById('prop-z').value = el.style.zIndex;
        });

        if (document.getElementById('prop-progress')) {
            document.getElementById('prop-progress').addEventListener('input', (e) => {
                const fill = el.querySelector('.progressbar-fill');
                if (fill) fill.style.width = `${e.target.value}%`;
            });
        }
    }

    getWidgetText(el) {
        const inner = el.querySelector('.btn-retro, .label-retro, .groupbox-title, .input-retro');
        if (!inner) return '';
        if (inner.tagName === 'INPUT') return inner.value;
        return inner.innerText;
    }

    setWidgetText(el, text) {
        const inner = el.querySelector('.btn-retro, .label-retro, .groupbox-title, .input-retro');
        if (inner) {
            if (inner.tagName === 'INPUT') inner.value = text;
            else inner.innerText = text;
        }
    }

    bringToFront(el) {
        el.style.zIndex = ++this.maxZIndex;
    }

    sendToBack(el) {
        el.style.zIndex = --this.minZIndex;
    }

    exportLayout() {
        // Clonar para não afetar o canvas real durante a exportação
        const canvasClone = this.canvas.cloneNode(true);
        const editorElements = canvasClone.querySelectorAll('[data-editor-only="true"]');
        editorElements.forEach(el => el.remove());

        const htmlContent = canvasClone.innerHTML;
        const theme = this.themeSelector.value;
        
        const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Estilos exportados para Electron */
        body { background: #008080; margin: 0; padding: 20px; }
        .gui-container { position: relative; width: 800px; height: 600px; background: #c0c0c0; }
        .gui-widget { position: absolute; }
        ${this.getThemeCSS(theme)}
    </style>
</head>
<body class="theme-${theme}">
    <div class="gui-container">
        ${htmlContent}
    </div>
</body>
</html>`;

        const blob = new Blob([fullHtml], {type: 'text/html'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'interface-retro.html';
        a.click();
    }

    getThemeCSS(theme) {
        // Estilos essenciais para exportação
        const base = `
            .gui-widget { position: absolute; font-family: sans-serif; }
            .progressbar-fill { height: 100%; transition: width 0.3s; }
            [data-hint] { position: relative; }
            [data-hint]::after {
                content: attr(data-hint);
                position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%);
                background: #ffffe1; border: 1px solid #000; padding: 2px 6px;
                font-size: 11px; color: #000; white-space: nowrap;
                z-index: 1000; visibility: hidden; opacity: 0; transition: opacity 0.2s;
                box-shadow: 2px 2px 2px rgba(0,0,0,0.2);
            }
            [data-hint]:hover::after { visibility: visible; opacity: 1; }
        `;

        const themes = {
            win95: `
                .theme-win95 .btn-retro { background: #c0c0c0; border: 2px solid; border-color: #fff #000 #000 #fff; padding: 4px 10px; }
                .theme-win95 .btn-retro:hover { background: #d4d0c8; }
                .theme-win95 .input-retro { background: #fff; border: 2px solid; border-color: #808080 #fff #fff #808080; padding: 2px 4px; }
                .theme-win95 .groupbox-retro { border: 2px solid #808080; position: relative; padding: 15px 10px 10px; box-shadow: 1px 1px #fff, inset 1px 1px #fff; }
                .theme-win95 .groupbox-title { position: absolute; top: -8px; left: 10px; background: #c0c0c0; padding: 0 4px; font-size: 11px; }
                .theme-win95 .progressbar-retro { background: #c0c0c0; border: 1px solid #808080; box-shadow: inset 1px 1px #000; padding: 2px; height: 20px; }
                .theme-win95 .progressbar-fill { background: #000080; }
            `,
            'apple-classic': `
                .theme-apple-classic .btn-retro { background: #fff; border: 1px solid #000; border-radius: 3px; padding: 3px 12px; box-shadow: 1px 1px 0px #000; }
                .theme-apple-classic .btn-retro:hover { background: #f0f0f0; }
                .theme-apple-classic .groupbox-retro { border: 1px solid #000; position: relative; padding: 15px 10px 10px; }
                .theme-apple-classic .groupbox-title { position: absolute; top: -8px; left: 10px; background: #fff; border: 1px solid #000; padding: 0 4px; font-size: 11px; }
                .theme-apple-classic .progressbar-retro { background: #fff; border: 1px solid #000; height: 16px; }
                .theme-apple-classic .progressbar-fill { background: repeating-linear-gradient(45deg, #000, #000 2px, #fff 2px, #fff 4px); }
            `,
            vista: `
                .theme-vista .btn-retro { background: linear-gradient(180deg, #f2f2f2 0%, #dddddd 100%); border: 1px solid #707070; border-radius: 3px; padding: 4px 14px; }
                .theme-vista .btn-retro:hover { background: linear-gradient(180deg, #eaf6fd 0%, #a7d9f5 100%); border-color: #3c7fb1; }
                .theme-vista .input-retro { background: #fff; border: 1px solid #abadb3; border-radius: 2px; padding: 3px 5px; }
                .theme-vista .groupbox-retro { border: 1px solid rgba(0,0,0,0.15); background: rgba(255,255,255,0.4); backdrop-filter: blur(5px); border-radius: 5px; padding: 20px 10px 10px; position: relative; }
                .theme-vista .groupbox-title { position: absolute; top: 5px; left: 12px; font-weight: 600; font-size: 11px; color: #1e395b; }
                .theme-vista .progressbar-retro { background: #e6e6e6; border: 1px solid #bcbcbc; border-radius: 2px; height: 18px; overflow: hidden; }
                .theme-vista .progressbar-fill { background: linear-gradient(180deg, #a7d9f5 0%, #3a7ebf 100%); }
            `,
            xp: `
                .theme-xp .btn-retro { background: linear-gradient(180deg, #ffffff 0%, #ece9d8 100%); border: 1px solid #003c74; border-radius: 3px; padding: 4px 14px; }
                .theme-xp .btn-retro:hover { background: linear-gradient(180deg, #fff 0%, #ffad55 100%); border-color: #ff8e00; }
                .theme-xp .groupbox-retro { border: 1px solid #d0d0bf; border-radius: 4px; padding: 15px 10px 10px; position: relative; }
                .theme-xp .groupbox-title { position: absolute; top: -8px; left: 10px; background: #ece9d8; padding: 0 3px; color: #0046d5; font-weight: bold; }
                .theme-xp .progressbar-retro { background: #fff; border: 1px solid #6b9cde; height: 16px; padding: 1px; }
                .theme-xp .progressbar-fill { background: linear-gradient(90deg, #21a121 0%, #a2e0a2 50%, #21a121 100%); background-size: 20px 100%; }
            `
        };

        return base + (themes[theme] || '');
    }
}

// Inicializar
window.addEventListener('DOMContentLoaded', () => {
    new RetroBuilder();
});
