/**
 * content.js (v2.1 - Robust Initialization & Full Code)
 * - Sửa lỗi giao diện không hiển thị trên một số trang (đặc biệt là các trang SPA - Single Page Application).
 * - Thêm cơ chế chờ cho đến khi `document.body` sẵn sàng trước khi khởi tạo ứng dụng.
 * - Bọc toàn bộ logic khởi tạo trong try-catch để ngăn lỗi làm sập toàn bộ script.
 * - Đây là phiên bản đầy đủ, bao gồm tất cả các hàm chức năng.
 */
class ConverterApp {
    constructor() {
        // --- Cấu hình ---
        this.hostname = window.location.hostname;
        this.ICONS = { // SVG icons để không phụ thuộc vào file ngoài
            select: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3C1.9 3 1 3.9 1 5V19C1 20.1 1.9 21 3 21H21C22.1 21 23 20.1 23 19V5C23 3.9 22.1 3 21 3ZM21 19H3V5H21V19ZM5 7H19V17H5V7Z"/></svg>`,
            translate: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.87 15.07L10.33 12.56L10 12.74V17.5H12V13.81L14.07 15.88L15.5 14.47L12.87 11.84L15.5 9.21L14.07 7.8L12 9.88V6.5H10V10.26L10.33 10.04L12.87 7.53L11.46 6.12L9 8.59L6.54 6.12L5.13 7.53L7.67 10.04L5.13 12.55L6.54 13.96L9 11.49L11.46 13.96L12.87 15.07Z"/></svg>`,
            stop: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 18H6V6H18V18Z"/></svg>`,
            redo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`,
            swap: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>`,
            close: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
            palette: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4c-.83 0-1.5-.67-1.5-1.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`
        };
        this.STYLE_OPTIONS = {
            themes: [
                { name: 'Sáng', className: 'theme-light', bg: '#FFFFFF' },
                { name: 'Vàng sậm', className: 'theme-sepia', bg: '#fbf0d9' },
                { name: 'Xanh dịu', className: 'theme-mint', bg: '#eef5f3' },
                { name: 'Xám', className: 'theme-gray', bg: '#e1e1e1' },
                { name: 'Tối', className: 'theme-dark', bg: '#1e1e1e' }
            ],
            fonts: ["Palatino", "Georgia", "Times New Roman", "Arial"],
            sizes: { min: 14, max: 32, step: 1, default: 18 },
            lineHeights: { min: 1.4, max: 2.4, step: 0.1, default: 1.7 },
            widths: { min: 600, max: 1200, step: 50, default: 800 }
        };

        // --- Trạng thái ---
        this.state = {
            isSelectionMode: false,
            isStreaming: false,
            isTranslated: false,
            originalContent: null,
            translatedContent: null,
            currentSelector: null,
            siteConfig: {},
            styleConfig: {},
            segmentCounter: 0,
        };

        // --- Elements ---
        this.elements = {
            fabContainer: null,
            translateBtn: null,
            reTranslateBtn: null,
            selectBtn: null,
            styleBtn: null,
            stylePanel: null,
            selectionIcon: null,
        };

        // --- Binding ---
        this.bound = {
            handleMessage: this.handleMessage.bind(this),
            toggleSelectionMode: this.toggleSelectionMode.bind(this),
            highlightElement: this.highlightElement.bind(this),
            unhighlightElement: this.unhighlightElement.bind(this),
            selectElement: this.selectElement.bind(this),
            handleKeydown: this.handleKeydown.bind(this),
            handleMainButtonClick: this.handleMainButtonClick.bind(this),
            toggleStylePanel: this.toggleStylePanel.bind(this),
            handlePanelAction: this.handlePanelAction.bind(this),
            handleTextSelectionPopup: this.handleTextSelectionPopup.bind(this),
            hideSelectionIcon: this.hideSelectionIcon.bind(this),
        };
    }

    async init() {
        const data = await chrome.storage.sync.get(['siteSelectors', 'styleConfig']);
        this.state.siteConfig = data.siteSelectors || {};
        this.state.styleConfig = data.styleConfig || {};
        this.state.currentSelector = this.state.siteConfig[this.hostname];
        
        this.injectFab();
        this.createStylePanel();
        
        this.applyCurrentStyles();
        this.updateFabState();
        this.bindEvents();
        console.log("Biên Dịch Convert v2.1 Initialized Successfully.");
    }

    bindEvents() {
        chrome.runtime.onMessage.addListener(this.bound.handleMessage);
        document.addEventListener('mouseup', this.bound.handleTextSelectionPopup);
        document.addEventListener('mousedown', this.bound.hideSelectionIcon, true);
    }
    
    handleMessage(request) {
        const { type, context = {}, chunk, error } = request;
        const { placeholderId } = context;

        if (!this.state.isStreaming && ['STREAM_CHUNK', 'STREAM_END'].includes(type)) {
             return;
        }

        const targetElement = placeholderId ? document.getElementById(placeholderId) : this.getContentElement();
        if (!targetElement && type !== 'TRANSLATE_SELECTION_REQUEST') return;

        switch (type) {
            case 'STREAM_START':
                targetElement.innerHTML = '';
                if (!placeholderId) {
                    this.state.isStreaming = true;
                    this.updateFabState();
                    this.showNotification('🚀 Bắt đầu dịch...');
                }
                break;
            case 'STREAM_CHUNK':
                targetElement.insertAdjacentHTML('beforeend', chunk.replace(/\n/g, '<br>'));
                break;
            case 'STREAM_END':
                this.state.isStreaming = false;
                if (placeholderId) {
                    const finalContainer = this.createFinalSegment(targetElement, context.originalText);
                    targetElement.replaceWith(finalContainer);
                } else {
                    this.state.isTranslated = true;
                    this.state.translatedContent = targetElement.innerHTML;
                    sessionStorage.setItem(`bientran_cache_${this.hostname}`, this.state.translatedContent);
                    this.updateFabState();
                    this.showNotification('✅ Đã dịch xong!', false, 2000);
                }
                break;
            case 'TRANSLATE_ERROR':
                this.state.isStreaming = false;
                if (placeholderId) {
                    targetElement.replaceWith(document.createTextNode(context.originalText));
                } else {
                    if (this.state.originalContent) targetElement.innerHTML = this.state.originalContent;
                }
                this.updateFabState();
                this.showNotification(`Lỗi: ${error}`, true, 5000);
                break;
            case 'TRANSLATE_SELECTION_REQUEST':
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    this.translateSelection(request.text, selection.getRangeAt(0));
                }
                break;
        }
    }

    handleMainButtonClick() {
        if (this.state.isStreaming) {
            this.stopTranslation();
            return;
        }

        const contentElement = this.getContentElement();
        if (!contentElement) {
            this.showNotification('Vui lòng chọn vùng nội dung chính bằng nút [chọn vùng] trước.', true);
            return;
        }
        
        if (this.state.isTranslated) {
            contentElement.innerHTML = this.state.originalContent;
            this.state.isTranslated = false;
        } else {
            if (!this.state.originalContent) {
                this.state.originalContent = contentElement.innerHTML;
            }
            if (this.state.translatedContent) {
                contentElement.innerHTML = this.state.translatedContent;
                this.state.isTranslated = true;
            } else {
                this.startTranslation();
            }
        }
        this.updateFabState();
    }
    
    startTranslation(force = false) {
        const contentElement = this.getContentElement();
        if (!contentElement) return;

        if (!this.state.originalContent || force) {
            this.state.originalContent = contentElement.innerHTML;
        }

        const cachedContent = sessionStorage.getItem(`bientran_cache_${this.hostname}`);

        if (!force && cachedContent) {
            this.state.translatedContent = cachedContent;
            contentElement.innerHTML = cachedContent;
            this.state.isTranslated = true;
            this.updateFabState();
            this.showNotification('💡 Đã tải bản dịch từ cache!', false, 1500);
            return;
        }

        this.state.isStreaming = true;
        this.updateFabState();
        chrome.runtime.sendMessage({
            type: 'PERFORM_STREAM_TRANSLATION',
            text: contentElement.innerText,
            context: {}
        });
    }

    stopTranslation() {
        if (!this.state.isStreaming) return;
        this.state.isStreaming = false;
        
        const contentElement = this.getContentElement();
        if (contentElement && this.state.originalContent) {
            contentElement.innerHTML = this.state.originalContent;
        }
        
        this.state.isTranslated = false;
        this.updateFabState();
        this.showNotification('🚫 Đã dừng dịch.', false, 2000);
    }
    
    translateSelection(textToTranslate, range) {
        this.state.isStreaming = true;
        const placeholderId = `bientran-placeholder-${this.state.segmentCounter++}`;
        const placeholder = document.createElement('span');
        placeholder.id = placeholderId;
        placeholder.className = 'translated-segment-loading';
        placeholder.textContent = 'Đang dịch...';

        try {
            range.deleteContents();
            range.insertNode(placeholder);
        } catch (e) {
            this.showNotification("Không thể dịch vùng chọn này.", true);
            this.state.isStreaming = false;
            return;
        }
        
        chrome.runtime.sendMessage({
            type: 'PERFORM_STREAM_TRANSLATION',
            text: textToTranslate,
            context: { placeholderId, originalText: textToTranslate }
        });
    }
    
    injectFab() {
        if (document.getElementById('converter-fab-container')) return;
        this.elements.fabContainer = document.createElement('div');
        this.elements.fabContainer.id = 'converter-fab-container';

        const createBtn = (id, icon, tooltipText, onClick) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.innerHTML = icon + `<span class="converter-tooltip">${tooltipText}</span>`;
            btn.onclick = onClick;
            this.elements.fabContainer.appendChild(btn);
            return btn;
        };
        
        this.elements.styleBtn = createBtn('converter-palette-btn', this.ICONS.palette, 'Tùy chỉnh Giao diện', this.bound.toggleStylePanel);
        this.elements.selectBtn = createBtn('converter-select-btn', this.ICONS.select, 'Chọn vùng nội dung', this.bound.toggleSelectionMode);
        this.elements.reTranslateBtn = createBtn('converter-retranslate-btn', this.ICONS.redo, 'Dịch lại từ đầu', () => this.startTranslation(true));
        this.elements.translateBtn = createBtn('converter-translate-btn', this.ICONS.translate, 'Dịch nội dung', this.bound.handleMainButtonClick);
        
        document.body.appendChild(this.elements.fabContainer);
    }
    
    updateFabState() {
        if (!this.elements.translateBtn) return;
        
        const contentElement = this.getContentElement();
        const mainBtn = this.elements.translateBtn;
        const reTransBtn = this.elements.reTranslateBtn;
        let mainIcon = this.ICONS.translate;
        let mainTooltip = 'Dịch nội dung';
        let mainClass = 'state-default';
        reTransBtn.style.display = 'none';

        if (!contentElement) {
             mainTooltip = 'Hãy chọn vùng nội dung';
        } else if (this.state.isStreaming) {
            mainIcon = this.ICONS.stop;
            mainTooltip = 'Dừng dịch';
            mainClass = 'state-loading';
        } else if (this.state.isTranslated) {
            mainIcon = this.ICONS.swap;
            mainTooltip = 'Hiển thị bản gốc';
            mainClass = 'state-translated';
            reTransBtn.style.display = 'flex';
        } else {
            if (this.state.translatedContent || sessionStorage.getItem(`bientran_cache_${this.hostname}`)) {
                mainTooltip = 'Hiển thị bản dịch (từ cache)';
                mainClass = 'state-cached';
                reTransBtn.style.display = 'flex';
            }
        }
        
        mainBtn.innerHTML = mainIcon + `<span class="converter-tooltip">${mainTooltip}</span>`;
        mainBtn.className = mainClass;
    }

    toggleSelectionMode() {
        this.state.isSelectionMode = !this.state.isSelectionMode;
        document.body.classList.toggle('converter-selecting', this.state.isSelectionMode);
        this.elements.selectBtn.classList.toggle('active', this.state.isSelectionMode);

        const action = this.state.isSelectionMode ? 'addEventListener' : 'removeEventListener';
        document[action]('mouseover', this.bound.highlightElement);
        document[action]('mouseout', this.bound.unhighlightElement);
        document[action]('click', this.bound.selectElement, true);
        document[action]('keydown', this.bound.handleKeydown, true);
    
        if (this.state.isSelectionMode) {
            this.showNotification('Di chuột để chọn vùng, nhấn để xác nhận, hoặc nhấn ESC để hủy.');
        } else {
             document.querySelectorAll('.converter-highlight').forEach(el => el.classList.remove('converter-highlight'));
        }
    }

    highlightElement(e) { e.target.classList.add('converter-highlight'); }
    unhighlightElement(e) { e.target.classList.remove('converter-highlight'); }
    
    selectElement(e) {
        if(!this.state.isSelectionMode) return;
        e.preventDefault(); 
        e.stopPropagation();
        
        const target = e.target;
        let selector = target.tagName.toLowerCase();
        if (target.id) {
            const validId = target.id.trim().split(/\s+/)[0];
            if(validId) selector = `#${CSS.escape(validId)}`;
        } else if (target.className && typeof target.className === 'string') {
            const classes = target.className.trim().split(/\s+/).filter(Boolean).map(c => CSS.escape(c)).join('.');
            if (classes) selector += `.${classes}`;
        }

        this.state.currentSelector = selector;
        this.state.siteConfig[this.hostname] = selector;
        chrome.storage.sync.set({ siteSelectors: this.state.siteConfig });
        
        this.state.originalContent = null;
        this.state.translatedContent = null;
        this.state.isTranslated = false;
        sessionStorage.removeItem(`bientran_cache_${this.hostname}`);
        
        this.showNotification(`✅ Đã lưu vùng chọn: ${selector}`);
        this.toggleSelectionMode();
        this.updateFabState();
        this.applyCurrentStyles();
    }
    
    handleKeydown(e) {
        if (this.state.isSelectionMode && e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSelectionMode();
            this.showNotification('Đã hủy chọn vùng.', false, 1500);
        }
    }

    createStylePanel() {
        if (document.getElementById('converter-style-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'converter-style-panel';
        
        const themeDots = this.STYLE_OPTIONS.themes.map(theme => 
            `<div class="theme-dot" style="background-color: ${theme.bg};" data-action="set-theme" data-value="${theme.className}" title="${theme.name}"></div>`
        ).join('');

        const fontBtns = this.STYLE_OPTIONS.fonts.map(font => 
            `<button class="font-btn" data-action="set-font" data-value="${font}">${font.split(',')[0]}</button>`
        ).join('');

        panel.innerHTML = `
            <div class="style-panel-header">
                <h3>Tùy chỉnh Giao diện</h3>
                <button class="close-btn" data-action="close-panel" title="Đóng">&times;</button>
            </div>
            <div class="style-panel-body">
                <div class="style-row"><label>Theme</label><div class="controls theme-controls">${themeDots}</div></div>
                <div class="style-row"><label>Font chữ</label><div class="controls font-controls">${fontBtns}</div></div>
                <div class="style-row"><label>Cỡ chữ</label><div class="controls"><button data-action="change-size" data-value="-1">A-</button><span id="size-display"></span><button data-action="change-size" data-value="1">A+</button></div></div>
                <div class="style-row"><label>Giãn dòng</label><div class="controls"><button data-action="change-lineHeight" data-value="-0.1">&#8645; -</button><span id="lineHeight-display"></span><button data-action="change-lineHeight" data-value="0.1">&#8645; +</button></div></div>
                <div class="style-row"><label>Độ rộng</label><div class="controls"><button data-action="change-width" data-value="-50">&#8596; -</button><span id="width-display"></span><button data-action="change-width" data-value="50">&#8596; +</button></div></div>
            </div>
        `;
        document.body.appendChild(panel);
        this.elements.stylePanel = panel;
        panel.addEventListener('click', this.bound.handlePanelAction);
    }
    
    toggleStylePanel() {
        if (!this.elements.stylePanel) this.createStylePanel();
        const isVisible = this.elements.stylePanel.classList.toggle('visible');
        if(isVisible) {
            this.updatePanelUI();
        }
    }
    
    handlePanelAction(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const { action, value } = target.dataset;

        if (action === 'close-panel') {
            this.toggleStylePanel();
            return;
        }

        if (!this.getContentElement()) {
            this.showNotification("Vui lòng chọn vùng nội dung trước.", true);
            return;
        }

        const settings = this.getCurrentStyleSettings();
        const { sizes, lineHeights, widths } = this.STYLE_OPTIONS;

        switch(action) {
            case 'set-theme': settings.theme = value; break;
            case 'set-font': settings.font = value; break;
            case 'change-size': settings.size = Math.max(sizes.min, Math.min(sizes.max, settings.size + Number(value))); break;
            case 'change-lineHeight': settings.lineHeight = parseFloat(Math.max(lineHeights.min, Math.min(lineHeights.max, settings.lineHeight + Number(value))).toFixed(1)); break;
            case 'change-width': settings.width = Math.max(widths.min, Math.min(widths.max, settings.width + Number(value))); break;
        }
        
        this.updateAndSaveStyles(settings);
    }

    getCurrentStyleSettings() {
        const defaults = {
            theme: this.STYLE_OPTIONS.themes[0].className,
            font: this.STYLE_OPTIONS.fonts[0],
            size: this.STYLE_OPTIONS.sizes.default,
            lineHeight: this.STYLE_OPTIONS.lineHeights.default,
            width: this.STYLE_OPTIONS.widths.default,
        };
        return { ...defaults, ...(this.state.styleConfig[this.hostname] || {}) };
    }

    updateAndSaveStyles(newSettings) {
        this.state.styleConfig[this.hostname] = newSettings;
        chrome.storage.sync.set({ styleConfig: this.state.styleConfig });
        this.applyCurrentStyles();
        this.updatePanelUI();
    }
    
    applyCurrentStyles() {
        const contentElement = this.getContentElement();
        if (!contentElement) return;

        const settings = this.getCurrentStyleSettings();
        
        this.STYLE_OPTIONS.themes.forEach(theme => contentElement.classList.remove(theme.className));
        contentElement.classList.add(settings.theme);

        contentElement.style.fontFamily = `'${settings.font}', sans-serif`;
        contentElement.style.fontSize = `${settings.size}px`;
        contentElement.style.lineHeight = settings.lineHeight;
        contentElement.style.maxWidth = `${settings.width}px`;
        contentElement.style.margin = '20px auto';
    }
    
    updatePanelUI() {
        if (!this.elements.stylePanel || !this.elements.stylePanel.classList.contains('visible')) return;
        const settings = this.getCurrentStyleSettings();

        this.elements.stylePanel.querySelectorAll('.theme-dot').forEach(dot => dot.classList.toggle('active', dot.dataset.value === settings.theme));
        this.elements.stylePanel.querySelectorAll('.font-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.value === settings.font));
        this.elements.stylePanel.querySelector('#size-display').textContent = settings.size;
        this.elements.stylePanel.querySelector('#lineHeight-display').textContent = settings.lineHeight.toFixed(1);
        this.elements.stylePanel.querySelector('#width-display').textContent = settings.width;
    }

    handleTextSelectionPopup(event) {
        if (event.target.closest('#converter-fab-container, .segment-actions, .translated-segment, #converter-selection-icon, #converter-style-panel')) return;
        
        setTimeout(() => {
            const selection = window.getSelection();
            if (!selection?.rangeCount || selection.isCollapsed) {
                this.hideSelectionIcon();
                return;
            }
            const selectedText = selection.toString().trim();
            if (selectedText.length < 5) return;

            if (!this.elements.selectionIcon) {
                this.elements.selectionIcon = document.createElement('button');
                this.elements.selectionIcon.id = 'converter-selection-icon';
                this.elements.selectionIcon.innerHTML = this.ICONS.translate;
                this.elements.selectionIcon.title = "Dịch đoạn văn này";
                document.body.appendChild(this.elements.selectionIcon);
            }
            
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            this.elements.selectionIcon.style.top = `${window.scrollY + rect.bottom + 5}px`;
            this.elements.selectionIcon.style.left = `${window.scrollX + rect.left + (rect.width / 2) - 18}px`;
            this.elements.selectionIcon.classList.add('visible');
            
            this.elements.selectionIcon.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.translateSelection(selectedText, range);
                this.hideSelectionIcon();
            };
        }, 10);
    }
    
    hideSelectionIcon(event) {
        if (event?.target.closest('#converter-selection-icon')) return;
        if (this.elements.selectionIcon) this.elements.selectionIcon.classList.remove('visible');
    }

    createFinalSegment(streamedElement, originalText) {
        const segmentId = `ts-${this.state.segmentCounter++}`;
        const wrapper = document.createElement('span');
        wrapper.id = segmentId;
        wrapper.className = 'translated-segment';
        wrapper.innerHTML = streamedElement.innerHTML;
        wrapper.dataset.original = originalText;
        wrapper.dataset.translated = wrapper.textContent;
        wrapper.dataset.state = 'translated';

        const actions = this.createSegmentActions(segmentId);
        const finalContainer = document.createElement('span');
        finalContainer.appendChild(wrapper);
        finalContainer.appendChild(actions);
        return finalContainer;
    }

    createSegmentActions(segmentId) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'segment-actions';
        const createBtn = (icon, title, onClick) => {
            const btn = document.createElement('button');
            btn.innerHTML = icon;
            btn.title = title;
            btn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); onClick(); };
            actionsContainer.appendChild(btn);
        };
        
        createBtn(this.ICONS.swap, 'Chuyển đổi Gốc/Dịch', () => {
            const segment = document.getElementById(segmentId);
            if (!segment) return;
            const isTranslated = segment.dataset.state === 'translated';
            segment.textContent = isTranslated ? segment.dataset.original : segment.dataset.translated;
            segment.dataset.state = isTranslated ? 'original' : 'translated';
        });

        createBtn(this.ICONS.close, 'Loại bỏ bản dịch', () => {
            const segment = document.getElementById(segmentId);
            if(segment?.parentElement) {
                segment.parentElement.replaceWith(document.createTextNode(segment.dataset.original));
            }
        });
        return actionsContainer;
    }
    
    getContentElement() {
        if (!this.state.currentSelector) return null;
        try {
            return document.querySelector(this.state.currentSelector);
        } catch (e) {
            this.showNotification("Selector không hợp lệ, vui lòng chọn lại.", true);
            this.state.currentSelector = null;
            this.state.siteConfig[this.hostname] = null;
            chrome.storage.sync.set({ siteSelectors: this.state.siteConfig });
            return null;
        }
    }

    showNotification(message, isError = false, duration = 3000) {
        let el = document.getElementById('converter-notification');
        if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
        if (!el) {
            el = document.createElement('div');
            el.id = 'converter-notification';
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.className = isError ? 'error' : 'success';
        el.classList.add('visible');
        this.notificationTimeout = setTimeout(() => {
            el.classList.remove('visible');
        }, duration);
    }
}

/**
 * Hàm khởi tạo chính của ứng dụng.
 */
function main() {
    try {
        if (window.converterAppInitialized) return;
        window.converterAppInitialized = true;
        new ConverterApp().init();
    } catch (e) {
        console.error("Lỗi khởi tạo Biên Dịch Convert:", e);
    }
}

/**
 * Hàm kiểm tra và chờ đợi document.body.
 */
function waitForBody() {
    if (document.body) {
        main();
    } else {
        const observer = new MutationObserver(() => {
            if (document.body) {
                observer.disconnect();
                main();
            }
        });
        observer.observe(document.documentElement, { childList: true });
    }
}

waitForBody();
