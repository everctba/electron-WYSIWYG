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
        this.selectedWidgets = [];
        this.snapSize = 8;
        this.maxZIndex = 100;
        this.minZIndex = 100;
        this.activeTool = null;
        this.isDrawing = false;
        this.isSelecting = false;
        this.drawStartX = 0;
        this.drawStartY = 0;
        this.drawingPreview = null;

        this.init();
        this.loadProject(); // Carregar projeto salvo ao iniciar
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();

        // Timer de auto-save a cada 5 segundos
        setInterval(() => this.saveProject(), 5000);
    }

    newProject() {
        if (confirm('Deseja realmente iniciar um novo projeto? Todos os elementos atuais serão removidos.')) {
            this.canvas.innerHTML = '';
            this.widgets = [];
            this.clearSelection();
            this.saveProject();
            console.log('Novo projeto iniciado.');
        }
    }

    saveProject() {
        const projectData = {
            theme: this.themeSelector.value,
            maxZIndex: this.maxZIndex,
            minZIndex: this.minZIndex,
            canvasHTML: this.canvas.innerHTML,
            // Guardamos a lista de widgets para reconstruir as referências se necessário
            widgetsCount: this.widgets.length
        };

        localStorage.setItem('retro-builder-project', JSON.stringify(projectData));
        console.log('Projeto salvo automaticamente às ' + new Date().toLocaleTimeString());
    }

    loadProject() {
        const savedData = localStorage.getItem('retro-builder-project');
        if (!savedData) return;

        try {
            const project = JSON.parse(savedData);

            // Restaurar Tema
            this.themeSelector.value = project.theme || 'win95';
            document.body.className = `theme-${this.themeSelector.value}`;

            // Restaurar Contadores de Z-Index
            this.maxZIndex = project.maxZIndex || 100;
            this.minZIndex = project.minZIndex || 100;

            // Restaurar Canvas
            this.canvas.innerHTML = project.canvasHTML;

            // Limpar handlers de redimensionamento e seleções que podem ter ficado no HTML salvo
            const legacyHandles = this.canvas.querySelectorAll('.resize-handle');
            legacyHandles.forEach(h => h.remove());
            const legacySelected = this.canvas.querySelectorAll('.selected');
            legacySelected.forEach(s => s.classList.remove('selected'));
            const legacyPreviews = this.canvas.querySelectorAll('.drawing-preview, .marquee-selection');
            legacyPreviews.forEach(p => p.remove());

            // Re-vincular eventos aos widgets restaurados
            this.widgets = [];
            const restoredWidgets = this.canvas.querySelectorAll('.gui-widget');
            restoredWidgets.forEach(w => {
                this.widgets.push(w);
                this.attachWidgetEvents(w);
            });

            console.log('Projeto restaurado com sucesso!');
        } catch (e) {
            console.error('Erro ao carregar projeto salvo:', e);
        }
    }

    attachWidgetEvents(el) {
        // Remove listeners antigos se houver (para evitar duplicidade)
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);

        newEl.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Evita mousedown no canvas
            this.startDragging(e, newEl);
        });

        // Se for um grupo, precisamos garantir que os filhos não interceptem o mousedown do pai
        if (newEl.classList.contains('gui-group')) {
            const children = newEl.querySelectorAll('.gui-widget');
            children.forEach(c => {
                c.style.pointerEvents = 'none'; // Filhos de grupo não recebem eventos, o grupo pai trata tudo
            });
        }

        // Atualizar referência na lista global
        const index = this.widgets.indexOf(el);
        if (index > -1) this.widgets[index] = newEl;
        else this.widgets.push(newEl);
    }

    setupEventListeners() {
        this.themeSelector.addEventListener('change', (e) => {
            document.body.className = `theme-${e.target.value}`;
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            this.openExportModal();
        });

        document.getElementById('close-modal-btn').addEventListener('click', () => {
            this.closeExportModal();
        });

        document.getElementById('cancel-export-btn').addEventListener('click', () => {
            this.closeExportModal();
        });

        document.getElementById('confirm-export-btn').addEventListener('click', () => {
            const format = document.querySelector('input[name="export-format"]:checked').value;
            if (format === 'html') {
                this.exportLayout();
            } else if (format === 'fxml') {
                this.exportFXML();
            }
            this.closeExportModal();
        });

        document.getElementById('new-project-btn').addEventListener('click', () => {
            this.newProject();
        });

        // Canvas events for Drawing, Selection & Marquee
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.activeTool) {
                this.startDrawing(e);
            } else if (e.target === this.canvas) {
                if (!e.shiftKey && !e.ctrlKey) {
                    this.clearSelection();
                }
                this.startMarquee(e);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing) {
                this.updateDrawing(e);
            } else if (this.isSelecting) {
                this.updateMarquee(e);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (this.isDrawing) {
                this.finishDrawing(e);
            } else if (this.isSelecting) {
                this.finishMarquee(e);
            }
        });

        // Keyboard events
        window.addEventListener('keydown', (e) => {
            // Grouping: Ctrl+G
            if (e.ctrlKey && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.groupSelected();
                return;
            }

            // Ungrouping: Alt+G
            if (e.altKey && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.ungroupSelected();
                return;
            }

            // Delete widget
            if (e.key === 'Delete' && this.selectedWidgets.length > 0) {
                this.selectedWidgets.forEach(w => {
                    w.remove();
                    this.widgets = this.widgets.filter(item => item !== w);
                });
                this.clearSelection();
                this.saveProject(); // Salvar após deletar
            }

            // ESC to cancel tool
            if (e.key === 'Escape') {
                this.setTool(null);
            }
        }, true); // Use capture phase to intercept before browser defaults if possible
    }

    setTool(type) {
        this.activeTool = type;
        const items = document.querySelectorAll('.widget-item');
        items.forEach(item => {
            if (item.dataset.type === type) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Change cursor on canvas
        this.canvas.style.cursor = type ? 'crosshair' : 'default';
    }

    startDrawing(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.isDrawing = true;
        this.drawStartX = Math.round((e.clientX - rect.left) / this.snapSize) * this.snapSize;
        this.drawStartY = Math.round((e.clientY - rect.top) / this.snapSize) * this.snapSize;

        this.drawingPreview = document.createElement('div');
        this.drawingPreview.className = 'drawing-preview';
        this.drawingPreview.style.left = `${this.drawStartX}px`;
        this.drawingPreview.style.top = `${this.drawStartY}px`;
        this.canvas.appendChild(this.drawingPreview);
    }

    updateDrawing(e) {
        const rect = this.canvas.getBoundingClientRect();
        let currentX = Math.round((e.clientX - rect.left) / this.snapSize) * this.snapSize;
        let currentY = Math.round((e.clientY - rect.top) / this.snapSize) * this.snapSize;

        const width = currentX - this.drawStartX;
        const height = currentY - this.drawStartY;

        this.drawingPreview.style.width = `${Math.abs(width)}px`;
        this.drawingPreview.style.height = `${Math.abs(height)}px`;
        this.drawingPreview.style.left = `${width < 0 ? currentX : this.drawStartX}px`;
        this.drawingPreview.style.top = `${height < 0 ? currentY : this.drawStartY}px`;
    }

    finishDrawing(e) {
        this.isDrawing = false;
        const finalWidth = parseInt(this.drawingPreview.style.width);
        const finalHeight = parseInt(this.drawingPreview.style.height);
        const finalX = parseInt(this.drawingPreview.style.left);
        const finalY = parseInt(this.drawingPreview.style.top);

        this.drawingPreview.remove();
        this.drawingPreview = null;

        if (finalWidth > 5 && finalHeight > 5) {
            const widget = this.addWidget(this.activeTool, finalX, finalY);
            widget.style.width = `${finalWidth}px`;
            widget.style.height = `${finalHeight}px`;
            this.updatePropertiesPanel(widget);
        }

        this.setTool(null);
    }

    startMarquee(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.isSelecting = true;
        this.drawStartX = e.clientX - rect.left;
        this.drawStartY = e.clientY - rect.top;

        this.drawingPreview = document.createElement('div');
        this.drawingPreview.className = 'marquee-selection';
        this.drawingPreview.style.left = `${this.drawStartX}px`;
        this.drawingPreview.style.top = `${this.drawStartY}px`;
        this.canvas.appendChild(this.drawingPreview);
    }

    updateMarquee(e) {
        this.updateDrawing(e); // Reuse logic for visual box
    }

    finishMarquee(e) {
        this.isSelecting = false;
        const rect = this.drawingPreview.getBoundingClientRect();

        // Selecionar widgets que interceptam a caixa de marquee
        this.widgets.forEach(w => {
            const wRect = w.getBoundingClientRect();
            // Lógica de intersecção: se as caixas se sobrepõem em qualquer ponto
            const overlaps = !(
                wRect.right < rect.left ||
                wRect.left > rect.right ||
                wRect.bottom < rect.top ||
                wRect.top > rect.bottom
            );

            if (overlaps) {
                this.selectWidget(w, true);
            }
        });

        this.drawingPreview.remove();
        this.drawingPreview = null;
    }

    setupDragAndDrop() {
        const widgetItems = document.querySelectorAll('.widget-item');

        widgetItems.forEach(item => {
            // Support both Click-to-Select and Drag-and-Drop
            item.addEventListener('click', () => {
                this.setTool(item.dataset.type);
            });

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
        switch (type) {
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
        widgetEl.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startDragging(e, widgetEl);
        });

        this.canvas.appendChild(widgetEl);
        this.widgets.push(widgetEl);
        this.selectWidget(widgetEl);
        this.saveProject(); // Salvar imediatamente ao adicionar
        return widgetEl;
    }

    selectWidget(el, multi = false) {
        if (!el) {
            this.clearSelection();
            return;
        }

        // Se o elemento clicado faz parte de um grupo, selecionamos o grupo pai (raiz)
        let root = el;
        while (root.parentElement && root.parentElement.classList.contains('gui-widget')) {
            root = root.parentElement;
        }
        el = root;

        if (!multi) {
            this.clearSelection();
        }

        if (!this.selectedWidgets.includes(el)) {
            this.selectedWidgets.push(el);
            el.classList.add('selected');
            this.addResizeHandles(el);
        } else if (multi) {
            // Toggle se já estiver selecionado no modo multi
            this.selectedWidgets = this.selectedWidgets.filter(w => w !== el);
            el.classList.remove('selected');
            this.removeResizeHandles(el);
        }

        const lastSelected = this.selectedWidgets[this.selectedWidgets.length - 1];
        if (lastSelected) {
            this.updatePropertiesPanel(lastSelected);
        } else {
            document.getElementById('properties-panel').innerHTML = '<p class="empty-msg">Selecione um widget</p>';
        }
    }

    clearSelection() {
        this.selectedWidgets.forEach(w => {
            w.classList.remove('selected');
            this.removeResizeHandles(w);
        });
        this.selectedWidgets = [];
        document.getElementById('properties-panel').innerHTML = '<p class="empty-msg">Selecione um widget</p>';
    }

    groupSelected() {
        if (this.selectedWidgets.length < 2) return;

        // Calculate bounding box of selected widgets
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.selectedWidgets.forEach(w => {
            const x = parseInt(w.style.left);
            const y = parseInt(w.style.top);
            const width = parseInt(w.style.width);
            const height = parseInt(w.style.height);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        // Create group container
        const groupEl = document.createElement('div');
        groupEl.className = 'gui-widget gui-group';
        groupEl.style.left = `${minX}px`;
        groupEl.style.top = `${minY}px`;
        groupEl.style.width = `${maxX - minX}px`;
        groupEl.style.height = `${maxY - minY}px`;
        groupEl.style.zIndex = ++this.maxZIndex;
        groupEl.setAttribute('data-type', 'group');

        // Move widgets into group
        this.selectedWidgets.forEach(w => {
            const x = parseInt(w.style.left) - minX;
            const y = parseInt(w.style.top) - minY;
            w.style.left = `${x}px`;
            w.style.top = `${y}px`;
            w.style.pointerEvents = 'none'; // Desabilitar eventos nos filhos do grupo
            groupEl.appendChild(w);
            // Remove from global widgets list since it's now inside a group
            this.widgets = this.widgets.filter(item => item !== w);
        });

        groupEl.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startDragging(e, groupEl);
        });

        this.canvas.appendChild(groupEl);
        this.widgets.push(groupEl);
        this.clearSelection();
        this.selectWidget(groupEl);
        this.saveProject(); // Salvar após agrupar
    }

    ungroupSelected() {
        const newSelection = [];
        this.selectedWidgets.forEach(group => {
            if (!group.classList.contains('gui-group')) return;

            const groupX = parseInt(group.style.left);
            const groupY = parseInt(group.style.top);
            const children = Array.from(group.children).filter(c => c.classList.contains('gui-widget'));

            children.forEach(w => {
                const x = parseInt(w.style.left) + groupX;
                const y = parseInt(w.style.top) + groupY;

                // Restaurar propriedades antes de re-vincular
                w.style.left = `${x}px`;
                w.style.top = `${y}px`;
                w.style.pointerEvents = 'auto';

                // Mover para o canvas principal
                this.canvas.appendChild(w);

                // Re-vincular eventos (isso vai clonar o elemento e adicionar à lista widgets)
                this.attachWidgetEvents(w);

                // Pegar a nova referência (clonada) para a seleção
                const newlyAttached = this.widgets[this.widgets.length - 1];
                newSelection.push(newlyAttached);
            });

            group.remove();
            this.widgets = this.widgets.filter(item => item !== group);
        });

        this.clearSelection();
        // Manter os elementos que foram desagrupados selecionados
        newSelection.forEach(w => this.selectWidget(w, true));
        this.saveProject(); // Salvar após desagrupar
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
            this.saveProject(); // Salvar ao terminar de arrastar/duplicar
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    startDragging(e, el) {
        e.preventDefault();
        e.stopPropagation();

        // Se o elemento clicado faz parte de um grupo, selecionamos o grupo pai (raiz)
        let root = el;
        while (root.parentElement && root.parentElement.classList.contains('gui-widget')) {
            root = root.parentElement;
        }
        el = root;

        const isMulti = e.shiftKey || e.ctrlKey;
        const isAlreadySelected = this.selectedWidgets.includes(el);

        // Lógica de seleção no mousedown
        if (isMulti) {
            this.selectWidget(el, true);
        } else if (!isAlreadySelected) {
            this.selectWidget(el, false);
        }

        const startX = e.clientX;
        const startY = e.clientY;
        let hasDuplicated = false;
        let hasMoved = false;

        // Snapshot the current selection to ensure stable duplication/movement
        // Filtramos para garantir que apenas elementos válidos no DOM sejam movidos
        let targetWidgets = this.selectedWidgets.filter(w => document.body.contains(w));

        const initialPositions = targetWidgets.map(w => ({
            el: w,
            left: parseInt(w.style.left) || 0,
            top: parseInt(w.style.top) || 0
        }));

        // Mudar cursor global para indicar arrasto
        document.body.style.cursor = 'move';

        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                hasMoved = true;
            }

            // Check for Alt key duplication on first move
            if (moveEvent.altKey && !hasDuplicated && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                const newClones = [];
                targetWidgets.forEach(w => {
                    const clone = w.cloneNode(true);

                    clone.classList.remove('selected');
                    const handles = clone.querySelectorAll('.resize-handle');
                    handles.forEach(h => h.remove());

                    clone.addEventListener('mousedown', (dragEv) => {
                        this.startDragging(dragEv, clone);
                    });

                    clone.style.zIndex = ++this.maxZIndex;

                    this.canvas.appendChild(clone);
                    this.widgets.push(clone);
                    newClones.push(clone);
                });

                this.clearSelection();
                newClones.forEach(c => this.selectWidget(c, true));

                hasDuplicated = true;
                targetWidgets = newClones;
                return;
            }

            initialPositions.forEach((pos, index) => {
                const currentEl = targetWidgets[index];
                if (!currentEl) return;

                let x = pos.left + dx;
                let y = pos.top + dy;

                // Snap to grid
                x = Math.round(x / this.snapSize) * this.snapSize;
                y = Math.round(y / this.snapSize) * this.snapSize;

                currentEl.style.left = `${x}px`;
                currentEl.style.top = `${y}px`;
            });

            const lastSelected = targetWidgets[targetWidgets.length - 1];
            if (lastSelected) {
                this.updatePropertiesPanel(lastSelected);
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';

            if (!hasMoved && !isMulti && isAlreadySelected && this.selectedWidgets.length > 1) {
                this.selectWidget(el, false);
            }

            this.saveProject();
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

        if (el.querySelector('.btn-retro')) {
            const btn = el.querySelector('.btn-retro');
            extraProps += `
                <div class="prop-group">
                    <label>Estado do Botão:</label>
                    <select id="prop-btn-state">
                        <option value="normal" ${!btn.classList.contains('focused') && !btn.disabled ? 'selected' : ''}>Normal</option>
                        <option value="focused" ${btn.classList.contains('focused') ? 'selected' : ''}>Focado</option>
                        <option value="disabled" ${btn.disabled || btn.classList.contains('disabled') ? 'selected' : ''}>Desabilitado</option>
                    </select>
                </div>
            `;

            // Adicionar opção de cor se o tema for Aqua
            if (this.themeSelector.value === 'apple-aqua') {
                extraProps += `
                    <div class="prop-group">
                        <label>Cor Aqua:</label>
                        <select id="prop-aqua-color">
                            <option value="graphite" ${!btn.classList.contains('aqua-blue') ? 'selected' : ''}>Grafite (Padrão)</option>
                            <option value="blue" ${btn.classList.contains('aqua-blue') ? 'selected' : ''}>Azul Gummy</option>
                        </select>
                    </div>
                `;
            }
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

        if (document.getElementById('prop-btn-state')) {
            document.getElementById('prop-btn-state').addEventListener('change', (e) => {
                const btn = el.querySelector('.btn-retro');
                if (!btn) return;

                // Reset states
                btn.classList.remove('focused', 'disabled');
                btn.disabled = false;

                if (e.target.value === 'focused') {
                    btn.classList.add('focused');
                } else if (e.target.value === 'disabled') {
                    btn.classList.add('disabled');
                    btn.disabled = true;
                }
                this.saveProject(); // Salvar após mudar estado
            });
        }

        if (document.getElementById('prop-aqua-color')) {
            document.getElementById('prop-aqua-color').addEventListener('change', (e) => {
                const btn = el.querySelector('.btn-retro');
                if (!btn) return;

                if (e.target.value === 'blue') {
                    btn.classList.add('aqua-blue');
                } else {
                    btn.classList.remove('aqua-blue');
                }
                this.saveProject(); // Salvar após mudar cor
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

    openExportModal() {
        document.getElementById('export-modal').classList.remove('hidden');
    }

    closeExportModal() {
        document.getElementById('export-modal').classList.add('hidden');
    }

    exportFXML() {
        const canvasClone = this.canvas.cloneNode(true);
        const editorElements = canvasClone.querySelectorAll('[data-editor-only="true"]');
        editorElements.forEach(el => el.remove());

        const theme = this.themeSelector.value;
        const rawCSS = this.getThemeCSS(theme);
        const fxCSS = this.convertToJavaFXCSS(rawCSS);

        const fxmlChildren = this.generateFXMLNodes(canvasClone);

        const fxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<AnchorPane prefHeight="600.0" prefWidth="800.0" stylesheets="@interface-retro.css" xmlns="http://javafx.com/javafx/11.0.1" xmlns:fx="http://javafx.com/fxml/1">
${fxmlChildren}
</AnchorPane>`;

        // Download FXML
        const blobFxml = new Blob([fxmlContent], { type: 'application/xml' });
        const urlFxml = URL.createObjectURL(blobFxml);
        const aFxml = document.createElement('a');
        aFxml.href = urlFxml;
        aFxml.download = 'interface-retro.fxml';
        aFxml.click();

        // Download CSS
        const blobCss = new Blob([fxCSS], { type: 'text/css' });
        const urlCss = URL.createObjectURL(blobCss);
        const aCss = document.createElement('a');
        aCss.href = urlCss;
        aCss.download = 'interface-retro.css';

        // Timeout para que navegadores permitam downloads sequenciais
        setTimeout(() => aCss.click(), 200);
    }

    generateFXMLNodes(parentEl) {
        let fxmlChildren = '';
        const widgets = Array.from(parentEl.children);

        widgets.forEach(w => {
            if (!w.classList.contains('gui-widget')) return;

            let innerText = this.getWidgetText(w) || '';
            innerText = innerText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

            const layoutX = parseInt(w.style.left) || 0;
            const layoutY = parseInt(w.style.top) || 0;
            const prefWidth = parseInt(w.style.width) || 100;
            const prefHeight = parseInt(w.style.height) || 100;

            let nodeTag = 'Pane';
            let attrs = `layoutX="${layoutX}" layoutY="${layoutY}" prefWidth="${prefWidth}" prefHeight="${prefHeight}"`;
            let styleClass = '';
            let hasChildren = false;

            if (w.querySelector('.btn-retro')) {
                nodeTag = 'Button';
                attrs += ` text="${innerText}"`;
                styleClass = 'btn-retro';
            } else if (w.querySelector('.input-retro')) {
                nodeTag = 'TextField';
                attrs += ` text="${innerText}"`;
                styleClass = 'input-retro';
            } else if (w.querySelector('.label-retro')) {
                nodeTag = 'Label';
                attrs += ` text="${innerText}"`;
                styleClass = 'label-retro';
            } else if (w.querySelector('.progressbar-retro')) {
                nodeTag = 'ProgressBar';
                const fill = w.querySelector('.progressbar-fill');
                let progress = 0.5;
                if (fill && fill.style.width) {
                    progress = parseInt(fill.style.width) / 100;
                }
                attrs += ` progress="${progress}"`;
                styleClass = 'progressbar-retro';
            } else if (w.dataset?.type === 'groupbox' || w.querySelector('.groupbox-retro')) {
                nodeTag = 'TitledPane';
                attrs += ` text="${innerText}" collapsible="false"`;
                styleClass = 'groupbox-retro';
            } else if (w.classList.contains('gui-group')) {
                nodeTag = 'Pane';
                hasChildren = true;
            } else {
                nodeTag = 'Pane';
            }

            if (styleClass) {
                attrs += ` styleClass="${styleClass}"`;
            }

            if (hasChildren) {
                fxmlChildren += `\n    <${nodeTag} ${attrs}>\n        <children>${this.generateFXMLNodes(w).replace(/\n/g, '\n            ')}\n        </children>\n    </${nodeTag}>`;
            } else {
                fxmlChildren += `\n    <${nodeTag} ${attrs} />`;
            }
        });
        return fxmlChildren;
    }

    convertToJavaFXCSS(css) {
        let parsed = css.replace(/\.theme-[a-zA-Z0-9-]+\s+/g, '');

        parsed = parsed.replace(/background:\s*(?!none)([^;]+);/g, '-fx-background-color: $1;');
        parsed = parsed.replace(/background-color:\s*([^;]+);/g, '-fx-background-color: $1;');

        // Simular a conversão de border (simplificado)
        parsed = parsed.replace(/border:\s*(?!none)[^#]*([^;]+);/g, '-fx-border-color: $1; -fx-border-width: 1px;');
        parsed = parsed.replace(/border-color:\s*([^;]+);/g, '-fx-border-color: $1;');

        parsed = parsed.replace(/color:\s*([^;]+);/g, '-fx-text-fill: $1;');
        parsed = parsed.replace(/border-radius:\s*([^;]+);/g, '-fx-background-radius: $1; -fx-border-radius: $1;');
        parsed = parsed.replace(/padding:\s*([^;]+);/g, '-fx-padding: $1;');

        parsed += `\n\n.root { -fx-font-family: "sans-serif"; -fx-font-size: 12px; }`;
        return parsed;
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

        const blob = new Blob([fullHtml], { type: 'text/html' });
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
            .gui-group { border: none; background: none; }
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
                .theme-win95 .btn-retro.focused { outline: 1px dotted #000; outline-offset: -4px; }
                .theme-win95 .btn-retro:disabled, .theme-win95 .btn-retro.disabled { color: #808080; text-shadow: 1px 1px #fff; cursor: not-allowed; }
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
                .theme-xp .btn-retro.focused { border-color: #ff8e00; box-shadow: inset 0 0 0 1px #ff8e00, inset 0 0 0 2px #fff; }
                .theme-xp .btn-retro:disabled, .theme-xp .btn-retro.disabled { background: #f5f5f5; border-color: #ccc; color: #999; cursor: not-allowed; }
                .theme-xp .groupbox-retro { border: 1px solid #d0d0bf; border-radius: 4px; padding: 15px 10px 10px; position: relative; }
                .theme-xp .groupbox-title { position: absolute; top: -8px; left: 10px; background: #ece9d8; padding: 0 3px; color: #0046d5; font-weight: bold; }
                .theme-xp .progressbar-retro { background: #fff; border: 1px solid #6b9cde; height: 16px; padding: 1px; }
                .theme-xp .progressbar-fill { background: linear-gradient(90deg, #21a121 0%, #a2e0a2 50%, #21a121 100%); background-size: 20px 100%; }
            `,
            'apple-aqua': `
                .theme-apple-aqua .btn-retro { background: linear-gradient(180deg, #ffffff 0%, #b5b5b5 50%, #d5d5d5 100%); border: 1px solid #777; border-radius: 20px; padding: 4px 20px; }
                .theme-apple-aqua .btn-retro.focused { box-shadow: 0 0 5px #3875d7; border-color: #2c5ba3; }
                .theme-apple-aqua .input-retro { background: #fff; border: 1px solid #999; border-radius: 4px; padding: 3px 8px; }
                .theme-apple-aqua .groupbox-retro { border: 1px solid #ccc; background: rgba(255, 255, 255, 0.3); border-radius: 8px; padding: 20px 10px 10px; position: relative; }
                .theme-apple-aqua .groupbox-title { position: absolute; top: 5px; left: 15px; font-weight: bold; font-size: 11px; color: #555; }
                .theme-apple-aqua .progressbar-retro { background: #e0e0e2; border: 1px solid #999; border-radius: 10px; height: 14px; overflow: hidden; }
                .theme-apple-aqua .progressbar-fill { background: linear-gradient(180deg, #7ebcf6 0%, #3875d7 100%); border-radius: 10px; }
                .theme-apple-aqua .btn-retro.aqua-blue { background: linear-gradient(180deg, #7ebcf6 0%, #3875d7 100%); border-color: #2c5ba3; color: #fff; text-shadow: 0 -1px 0 rgba(0,0,0,0.3); }
             `
        };

        return base + (themes[theme] || '');
    }
}

// Inicializar
window.addEventListener('DOMContentLoaded', () => {
    new RetroBuilder();
});
