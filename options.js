/**
 * options.js (v2.0)
 * - Tái cấu trúc thành object `app` để quản lý logic.
 * - Thêm tính năng sửa selector trực tiếp trên bảng.
 * - Thay thế `confirm` bằng UI không chặn.
 * - Cải thiện hệ thống thông báo.
 * - Thêm nút hiện/ẩn API Key.
 */
document.addEventListener('DOMContentLoaded', () => {
    const FALLBACK_MODELS = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-pro"];

    const ui = {
        apiKeyInput: document.getElementById('apiKey'),
        modelSelect: document.getElementById('model'),
        saveButton: document.getElementById('save-settings'),
        notificationDiv: document.getElementById('status-notification'),
        sitesTableBody: document.getElementById('sites-tbody'),
        toggleVisibilityBtn: document.getElementById('toggle-visibility'),
    };

    const app = {
        siteConfig: {},
        init() {
            this.loadSettings();
            this.bindEvents();
        },
        
        bindEvents() {
            ui.saveButton.addEventListener('click', () => this.saveApiSettings());
            ui.toggleVisibilityBtn.addEventListener('click', () => this.toggleApiKeyVisibility());
            ui.apiKeyInput.addEventListener('input', () => this.loadModelsOnKeyInput());

            ui.sitesTableBody.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;
                
                const action = target.dataset.action;
                const domain = target.dataset.domain;

                if (action === 'delete') this.deleteSite(domain);
                if (action === 'edit') this.editSite(domain, target);
                if (action === 'save') this.saveSite(domain, target);
                if (action === 'cancel') this.cancelEdit(domain, target);
            });
        },

        async loadSettings() {
            const data = await chrome.storage.sync.get(['geminiApiKey', 'geminiModel', 'siteSelectors']);
            if (data.geminiApiKey) {
                ui.apiKeyInput.value = data.geminiApiKey;
                this.loadModels(data.geminiApiKey, data.geminiModel);
            } else {
                this.populateModels(["Vui lòng nhập API Key hợp lệ"], null, true);
            }
            this.siteConfig = data.siteSelectors || {};
            this.renderTable();
        },

        async saveApiSettings() {
            const apiKey = ui.apiKeyInput.value.trim();
            if (!apiKey) {
                this.showNotification('Vui lòng nhập API Key', true);
                return;
            }
            await chrome.storage.sync.set({ geminiApiKey: apiKey, geminiModel: ui.modelSelect.value });
            this.showNotification('Đã lưu cài đặt API thành công!');
            this.loadModels(apiKey, ui.modelSelect.value); // Tải lại model để xác thực key
        },

        async loadModels(apiKey, selectedModel) {
            if (!apiKey) {
                this.populateModels(["Vui lòng nhập API Key hợp lệ"], null, true);
                return;
            }
            ui.modelSelect.disabled = true;
            this.populateModels(["Đang tải models..."], null, true);
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error?.message || 'API Key không hợp lệ hoặc có lỗi mạng');

                const supportedModels = data.models
                    .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
                    .map(m => m.name.replace('models/', ''));
                
                this.populateModels(supportedModels.length > 0 ? supportedModels : FALLBACK_MODELS, selectedModel, false);
            } catch (error) {
                this.showNotification(`Lỗi tải model: ${error.message}`, true);
                this.populateModels(FALLBACK_MODELS, selectedModel, false); // Hiển thị model dự phòng khi lỗi
            } finally {
                ui.modelSelect.disabled = false;
            }
        },

        // Hàm debounced để không gọi API liên tục khi người dùng gõ phím
        loadModelsOnKeyInput: debounce(function() {
             app.loadModels(ui.apiKeyInput.value.trim(), ui.modelSelect.value);
        }, 500),

        populateModels(models, selected, disabled = false) {
            ui.modelSelect.innerHTML = '';
            models.forEach(name => {
                const option = new Option(name, name);
                option.selected = (name === selected);
                ui.modelSelect.add(option);
            });
            ui.modelSelect.disabled = disabled;
        },

        renderTable() {
            ui.sitesTableBody.innerHTML = '';
            const domains = Object.keys(this.siteConfig);
            if (domains.length === 0) {
                ui.sitesTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">Chưa có cấu hình nào được lưu.</td></tr>';
                return;
            }
            domains.forEach(domain => {
                const selector = this.siteConfig[domain] || '';
                const row = ui.sitesTableBody.insertRow();
                row.dataset.domain = domain;
                row.innerHTML = this.createRowHtml(domain, selector);
            });
        },
        
        createRowHtml(domain, selector, isEditing = false) {
             if (isEditing) {
                return `
                    <td>${domain}</td>
                    <td><input type="text" class="edit-input" value="${escapeHTML(selector)}"></td>
                    <td>
                        <button class="btn btn-primary action-btn" data-action="save" data-domain="${domain}">Lưu</button>
                        <button class="btn btn-secondary action-btn" data-action="cancel" data-domain="${domain}">Hủy</button>
                    </td>
                `;
             }
             return `
                <td>${domain}</td>
                <td>${escapeHTML(selector)}</td>
                <td>
                    <button class="btn btn-secondary action-btn" data-action="edit" data-domain="${domain}">Sửa</button>
                    <button class="btn btn-danger action-btn" data-action="delete" data-domain="${domain}">Xóa</button>
                </td>
             `;
        },
        
        editSite(domain, editBtn) {
            const row = editBtn.closest('tr');
            const currentSelector = this.siteConfig[domain];
            row.innerHTML = this.createRowHtml(domain, currentSelector, true);
            row.querySelector('.edit-input').focus();
        },

        saveSite(domain, saveBtn) {
            const row = saveBtn.closest('tr');
            const input = row.querySelector('.edit-input');
            const newSelector = input.value.trim();
            
            this.siteConfig[domain] = newSelector;
            chrome.storage.sync.set({ siteSelectors: this.siteConfig }, () => {
                this.showNotification(`Đã cập nhật selector cho ${domain}.`);
                row.innerHTML = this.createRowHtml(domain, newSelector, false);
            });
        },

        cancelEdit(domain, cancelBtn) {
            const row = cancelBtn.closest('tr');
            const originalSelector = this.siteConfig[domain];
            row.innerHTML = this.createRowHtml(domain, originalSelector, false);
        },
        
        deleteSite(domain) {
            // Thay thế confirm bằng UI nội tuyến
            const row = ui.sitesTableBody.querySelector(`tr[data-domain="${domain}"]`);
            if (!row) return;

            const selectorCell = row.cells[1];
            const originalContent = selectorCell.innerHTML;
            selectorCell.innerHTML = `Bạn chắc chắn muốn xóa? 
                <button class="btn-confirm-delete" data-domain="${domain}">Có</button> 
                <button class="btn-cancel-delete">Không</button>`;
            
            row.querySelector('.btn-confirm-delete').onclick = () => {
                delete this.siteConfig[domain];
                chrome.storage.sync.set({ siteSelectors: this.siteConfig }, () => {
                    this.showNotification(`Đã xóa cấu hình cho ${domain}.`);
                    this.renderTable();
                });
            };
            row.querySelector('.btn-cancel-delete').onclick = () => {
                selectorCell.innerHTML = originalContent;
            };
        },
        
        toggleApiKeyVisibility() {
            const isPassword = ui.apiKeyInput.type === 'password';
            ui.apiKeyInput.type = isPassword ? 'text' : 'password';
            ui.toggleVisibilityBtn.textContent = isPassword ? '🙈' : '👁️';
        },

        showNotification(message, isError = false) {
            ui.notificationDiv.textContent = message;
            ui.notificationDiv.className = `notification ${isError ? 'error' : 'success'}`;
            ui.notificationDiv.style.display = 'block';
            setTimeout(() => ui.notificationDiv.style.display = 'none', 4000);
        }
    };
    
    // --- TIỆN ÍCH ---
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
    function escapeHTML(str) {
        const p = document.createElement("p");
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    app.init();
});
