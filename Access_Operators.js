// ==UserScript==
// @name         Автоматизация настроек доступа 🔍
// @namespace    http://tampermonkey.net/
// @version      2.9.3
// @description  Проставление доступа по операторам в режиме прозвона
// @author       ReRu (@Ruslan_Intertrade)
// @match        *://leadvertex.ru/admin/callmodeNew/settings.html?category=*
// @match        *://leadvertex.ru/admin/callmodeNew/rules.html*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/ReRu4/LeadVertex/main/Access_Operators.js
// @downloadURL  https://raw.githubusercontent.com/ReRu4/LeadVertex/main/Access_Operators.js
// ==/UserScript==
(function () {
    'use strict';

    const CONCURRENT_LIMIT = 10; // Количество одновременных запросов
    const swap = "accessConfig";

    function decrypt(encrypted, secret) {
        if (!encrypted || !secret) return null;
        let decrypted = '';
        for (let i = 0; i < encrypted.length; i++) {
            decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ secret.charCodeAt(i % secret.length));
        }
        return decrypted;
    }

    GM_registerMenuCommand('🔑 Установить параметры', () => {
        const encryptedKey = prompt('Шаг 1/2: Введите ваш токен доступа:');
        if (!encryptedKey) {
            return;
        }

        const secret = prompt('Шаг 2/2: Введите ключ для расшифровки (секретную фразу):');
        if (!secret) {
            alert('Установка отменена, так как не был введен ключ для расшифровки.');
            return;
        }

        GM_setValue(swap, { encryptedKey, secret });
        location.reload();
    });

    GM_registerMenuCommand('⚠️ Удалить параметры', () => {
        if (confirm('Вы уверены, что хотите удалить параметры доступа?')) {
            GM_setValue(swap, null);
            location.reload();
        }
    });

    // Логирование с временной меткой
    const debug = (message, data) => {
        const timestamp = new Date().toLocaleTimeString();
        if (data) {
            console.log(`[DEBUG ${timestamp}]`, message, data);
        } else {
            console.log(`[DEBUG ${timestamp}]`, message);
        }
    };

    debug('Инициализация скрипта');

    // Загрузка данных проектов с GitHub
    async function loadProjectCategories() {
        const url = 'https://raw.githubusercontent.com/ReRu4/LeadVertex/refs/heads/main/projects.md';

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: (response) => {
                    if (response.status === 200) {
                        try {
                            const categories = parseProjectData(response.responseText);
                            resolve(categories);
                        } catch (e) {
                            console.error('Ошибка парсинга данных проектов:', e);
                            resolve(new Map()); // Возвращаем пустую карту в случае ошибки
                        }
                    } else {
                        console.error('Ошибка загрузки данных проектов:', response.statusText);
                        resolve(new Map());
                    }
                },
                onerror: (err) => {
                    console.error('Сетевая ошибка при загрузке данных проектов:', err);
                    resolve(new Map());
                }
            });
        });
    }

    // Парсинг табличных данных проектов
    function parseProjectData(data) {
        const lines = data.split('\n');
        const categories = new Map();

        for (const line of lines) {
            const parts = line.split('\t').map(part => part.trim());

            if (parts.length >= 2) {
                const category = parts[0];
                const project = parts[1];

                if (category && project && category !== '--' && !category.includes('--')) {
                    if (!categories.has(category)) {
                        categories.set(category, []);
                    }
                    categories.get(category).push(project);
                }
            }
        }

        return categories;
    }

    const columnMap15 = {
        1: { group: "1", type: "0" },
        2: { group: "1", type: "1" },
        3: { group: "1", type: "2" },
        4: { group: "2", type: "0" },
        5: { group: "2", type: "1" },
        6: { group: "2", type: "2" },
        7: { group: "3", type: "0" },
        8: { group: "3", type: "1" },
        9: { group: "3", type: "2" },
        10: { group: "4", type: "0" },
        11: { group: "4", type: "1" },
        12: { group: "4", type: "2" },
        13: { group: "5", type: "0" },
        14: { group: "5", type: "1" },
        15: { group: "5", type: "2" },
    };



    const columnMap9 = {
        1: { group: "1", type: "0" },
        2: { group: "1", type: "1" },
        3: { group: "1", type: "2" },
        4: { group: "4", type: "0" },
        5: { group: "4", type: "1" },
        6: { group: "4", type: "2" },
        7: { group: "5", type: "0" },
        8: { group: "5", type: "1" },
        9: { group: "5", type: "2" },
    };

    let projectCategories = new Map();
    let operatorsCache = {};
    const rulesCache = new Map();

    // Добавление глобальных стилей
    const addGlobalStyle = (css) => {
        const head = document.getElementsByTagName('head')[0];
        if (!head) return;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    };

    addGlobalStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :root {
            --primary-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
            --primary-color: #10b981;
            --primary-dark: #059669;
            --secondary-gradient: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            --accent-gradient: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            --danger-gradient: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            --dark-bg: #1f2937;
            --darker-bg: #111827;
            --card-bg: #ffffff;
            --text-color: #1f2937;
            --text-muted: #6b7280;
            --border-color: #e5e7eb;
            --hover-bg: #f9fafb;
            --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            --shadow-glow: 0 0 20px rgba(16, 185, 129, 0.4);
            --shadow-glow-purple: 0 0 20px rgba(139, 92, 246, 0.4);
        }

        @keyframes slideInRight {
            from {
                transform: translateX(100%) translateY(-50%);
                opacity: 0;
            }
            to {
                transform: translateX(0) translateY(-50%);
                opacity: 1;
            }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
        }

        .access-panel {
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            background: var(--card-bg);
            border-radius: 20px;
            box-shadow: var(--shadow-xl);
            padding: 28px;
            z-index: 9999;
            width: 340px;
            max-height: 90vh;
            overflow-y: auto;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: var(--text-color);
            display: flex;
            flex-direction: column;
            gap: 18px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            animation: slideInRight 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid var(--border-color);
        }

        .access-panel::-webkit-scrollbar {
            width: 8px;
        }

        .access-panel::-webkit-scrollbar-track {
            background: #f3f4f6;
            border-radius: 10px;
        }

        .access-panel::-webkit-scrollbar-thumb {
            background: var(--primary-gradient);
            border-radius: 10px;
        }

        .access-panel.shifted {
            right: 360px;
        }

        .operator-search-panel {
            position: fixed;
            top: 50%;
            transform: translateY(-50%);
            right: 20px;
            width: 660px;
            background: var(--card-bg);
            border-radius: 20px;
            box-shadow: var(--shadow-xl);
            padding: 28px;
            z-index: 9998;
            max-height: 90vh;
            overflow-y: auto;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: var(--text-color);
            display: flex;
            flex-direction: column;
            gap: 18px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0;
            pointer-events: none;
            border: 1px solid var(--border-color);
        }

        .operator-search-panel::-webkit-scrollbar {
            width: 8px;
        }

        .operator-search-panel::-webkit-scrollbar-track {
            background: #f3f4f6;
            border-radius: 10px;
        }

        .operator-search-panel::-webkit-scrollbar-thumb {
            background: var(--primary-gradient);
            border-radius: 10px;
        }

        .operator-search-panel.visible {
            right: 380px;
            opacity: 1;
            pointer-events: auto;
            animation: slideInRight 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .search-results-container {
            border: 2px solid var(--border-color);
            border-radius: 16px;
            padding: 18px;
            margin-top: 14px;
            max-height: 45vh;
            overflow-y: auto;
            background: #f9fafb;
            box-shadow: inset var(--shadow-sm);
        }

        .search-results-container::-webkit-scrollbar {
            width: 6px;
        }

        .search-results-container::-webkit-scrollbar-thumb {
            background: var(--primary-gradient);
            border-radius: 10px;
        }

        .operator-group {
            margin-bottom: 14px;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 14px;
            transition: all 0.3s ease;
        }

        .operator-group:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        .operator-group-header {
            font-weight: 600;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-radius: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: white;
            border: 2px solid var(--border-color);
        }

        .operator-group-header:hover {
            border-color: var(--primary-color);
            box-shadow: var(--shadow-md), var(--shadow-glow);
            transform: translateY(-2px);
        }

        .operator-group-content {
            padding-left: 24px;
            margin-top: 10px;
            display: none;
            animation: fadeIn 0.3s ease;
        }

        .operator-group-content.visible {
            display: block;
        }

        .operator-group-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 10px;
            transition: all 0.2s ease;
            border-radius: 8px;
        }

        .operator-group-item:hover {
            background: var(--hover-bg);
        }

        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 3px solid transparent;
            background: linear-gradient(white, white) padding-box,
                        var(--primary-gradient) border-box;
            border-image: var(--primary-gradient);
            border-image-slice: 0 0 1 0;
        }

        .panel-title {
            font-size: 24px;
            font-weight: 800;
            background: var(--primary-gradient);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
            letter-spacing: -0.8px;
        }

        .control-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 10px;
        }

        .control-label {
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 6px;
            color: var(--dark-bg);
            letter-spacing: -0.3px;
            text-transform: uppercase;
            font-size: 11px;
            opacity: 0.8;
        }

        .hint-text {
            font-size: 12px;
            color: var(--text-muted);
            margin-top: -2px;
            font-style: italic;
        }

        .access-button {
            background: var(--primary-gradient);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px 18px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: var(--shadow-md);
            position: relative;
            overflow: hidden;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 12px;
        }

        .access-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: left 0.6s;
        }

        .access-button:hover::before {
            left: 100%;
        }

        .access-button:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-lg), var(--shadow-glow);
        }

        .access-button:active {
            transform: translateY(0);
            box-shadow: var(--shadow-sm);
        }

        .secondary-button {
            background: white;
            color: var(--text-color);
            border: 2px solid var(--border-color);
            box-shadow: var(--shadow-sm);
        }

        .secondary-button:hover {
            background: var(--hover-bg);
            border-color: var(--primary-color);
        }

        .danger-button {
            background: var(--danger-gradient);
            color: white;
        }

        .danger-button:hover {
            box-shadow: var(--shadow-lg), 0 0 20px rgba(239, 68, 68, 0.4);
        }

        .success-button {
            background: var(--primary-gradient);
            color: white;
        }

        .success-button:hover {
            box-shadow: var(--shadow-lg), var(--shadow-glow);
        }

        .access-input, .access-textarea {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid var(--border-color);
            border-radius: 12px;
            font-size: 14px;
            box-sizing: border-box;
            white-space: normal;
            font-family: 'Inter', sans-serif;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: white;
            font-weight: 500;
        }

        .access-input:focus, .access-select:focus, .access-textarea:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
            background: #f0fdf4;
        }

        .access-checkbox {
            margin-right: 10px;
            width: 20px;
            height: 20px;
            cursor: pointer;
            accent-color: var(--primary-color);
        }

        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 8px;
        }

        /* Современные iOS-style переключатели */
        .settings-toggles {
            display: flex;
            flex-direction: column;
            gap: 14px;
            margin-bottom: 20px;
            padding: 16px;
            background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
            border-radius: 16px;
            border: 2px solid var(--border-color);
        }

        .toggle-switch {
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
            user-select: none;
            position: relative;
            padding: 4px 0;
        }

        .toggle-switch input[type="checkbox"] {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: relative;
            width: 52px;
            height: 28px;
            background: #d1d5db;
            border-radius: 34px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            flex-shrink: 0;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .toggle-slider::before {
            content: '';
            position: absolute;
            width: 22px;
            height: 22px;
            left: 3px;
            top: 3px;
            background: white;
            border-radius: 50%;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch:hover .toggle-slider {
            background: #9ca3af;
        }

        .toggle-switch input:checked + .toggle-slider {
            background: var(--primary-gradient);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 12px rgba(16, 185, 129, 0.3);
        }

        .toggle-switch input:checked + .toggle-slider::before {
            transform: translateX(24px);
        }

        .toggle-switch:active .toggle-slider::before {
            width: 26px;
        }

        .toggle-text {
            font-weight: 600;
            font-size: 14px;
            color: var(--text-color);
            transition: color 0.2s ease;
        }

        .toggle-switch:hover .toggle-text {
            color: var(--primary-color);
        }

        .toggle-switch input:checked ~ .toggle-text {
            color: var(--primary-dark);
        }

        .field-block {
            border: 2px solid var(--border-color);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            background: white;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: var(--shadow-sm);
        }

        .field-block:hover {
            border-color: var(--primary-color);
            box-shadow: var(--shadow-lg);
            transform: translateY(-4px);
        }

        .field-block-title {
            font-weight: 800;
            margin-bottom: 16px;
            font-size: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: var(--dark-bg);
            letter-spacing: -0.5px;
        }

        .remove-field {
            color: #ef4444;
            cursor: pointer;
            font-size: 22px;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
            border: none;
            padding: 0;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .remove-field:hover {
            background: var(--danger-gradient);
            color: white;
            transform: rotate(90deg) scale(1.1);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .projects-list {
            max-height: 340px;
            overflow-y: auto;
            border: 2px solid var(--border-color);
            border-radius: 12px;
            padding: 14px;
            background: white;
            margin-top: 10px;
            box-shadow: inset var(--shadow-sm);
        }

        .projects-list::-webkit-scrollbar {
            width: 6px;
        }

        .projects-list::-webkit-scrollbar-thumb {
            background: var(--primary-gradient);
            border-radius: 10px;
        }

        .project-item {
            display: flex;
            align-items: center;
            padding: 10px 8px;
            border-bottom: 1px solid var(--border-color);
            transition: all 0.2s ease;
            border-radius: 8px;
        }

        .project-item:hover {
            background: #f0fdf4;
            border-color: var(--primary-color);
        }

        .project-item:last-child {
            border-bottom: none;
        }

        .project-name {
            margin-left: 12px;
            flex-grow: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 600;
            font-size: 13px;
        }

        .list-actions {
            display: flex;
            gap: 8px;
        }

        .projects-actions-bar {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }

        .projects-action-btn {
            flex: 1;
            font-size: 13px;
            padding: 10px 14px;
            cursor: pointer;
            background: white;
            border: 2px solid var(--border-color);
            border-radius: 10px;
            font-weight: 700;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            color: var(--text-color);
            font-family: 'Inter', sans-serif;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }

        .projects-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .projects-action-btn:active {
            transform: translateY(0);
        }

        .select-all-btn {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
            border-color: var(--primary-color);
            color: var(--primary-dark);
        }

        .select-all-btn:hover {
            background: var(--primary-gradient);
            color: white;
            border-color: var(--primary-color);
            box-shadow: var(--shadow-md), var(--shadow-glow);
        }

        .unselect-all-btn {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%);
            border-color: #ef4444;
            color: #dc2626;
        }

        .unselect-all-btn:hover {
            background: var(--danger-gradient);
            color: white;
            border-color: #ef4444;
            box-shadow: var(--shadow-md), 0 0 20px rgba(239, 68, 68, 0.4);
        }

        .list-action {
            font-size: 12px;
            padding: 4px 8px;
            cursor: pointer;
            color: var(--primary-color);
            background: rgba(16, 185, 129, 0.1);
            border: none;
            border-radius: 6px;
            font-weight: 600;
            transition: all 0.2s ease;
        }

        .list-action:hover {
            background: rgba(16, 185, 129, 0.2);
            transform: scale(1.05);
        }

        .button-container {
            display: flex;
            gap: 14px;
            margin-top: 14px;
        }

        .divider {
            height: 3px;
            background: var(--primary-gradient);
            margin: 20px 0;
            border-radius: 3px;
            opacity: 0.3;
        }

        .access-select {
            width: 100%;
            height: 48px;
            padding: 12px 16px;
            border: 2px solid var(--border-color);
            border-radius: 12px;
            font-size: 14px;
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: white;
            cursor: pointer;
        }

        .access-select:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }

        .progress-container {
            margin-top: 24px;
            display: none;
            animation: fadeIn 0.4s ease;
        }

        .progress-bar {
            height: 14px;
            background: #e5e7eb;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }

        .progress-fill {
            height: 100%;
            background: var(--primary-gradient);
            width: 0%;
            transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 20px;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);
            position: relative;
            overflow: hidden;
        }

        .progress-fill::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            right: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
            animation: shimmer 2s infinite;
        }

        .progress-text {
            margin-top: 10px;
            text-align: center;
            font-size: 13px;
            font-weight: 700;
            color: var(--text-color);
        }

        .access-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .field-actions {
            display: flex;
            gap: 8px;
        }

        .users-input-wrapper {
            display: flex;
            align-items: stretch;
            gap: 10px;
        }

        .users-input-wrapper .access-textarea {
            flex-grow: 1;
            margin: 0;
        }

        .find-operators-btn {
            flex-shrink: 0;
        }

        /* Стили для кастомных скроллбаров */
        * {
            scrollbar-width: thin;
            scrollbar-color: var(--primary-color) #f3f4f6;
        }
    `);    function makeSafeId(str) {
        if (!str) return 'id-empty';
        try {
            const utf8 = encodeURIComponent(str);
            const binary = unescape(utf8);
            const b64 = btoa(binary);
            const b64url = b64.replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
            return `id-${b64url}`;
        } catch (e) {
            return `id-${str.replace(/[^a-zA-Z0-9]+/g, '-')}`;
        }
    }

    async function runWithConcurrency(tasks, limit) {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const p = Promise.resolve().then(() => task());
            results.push(p);

            if (limit <= 0) continue;

            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);

            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }

        return Promise.all(results);
    }

    if (location.href.includes("settings.html")) {
        const panel = document.createElement('div');
        panel.className = 'access-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 class="panel-title">Настройка доступа</h3>
                    <button id="showSearchPanelBtn" class="access-button secondary-button" title="Найти операторов" style="padding: 5px 8px; font-size: 12px;">🔍</button>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button id="closeButton" class="access-button danger-button" style="padding: 5px 8px; font-size: 12px;">✕</button>
                </div>
            </div>

            <div class="settings-toggles">
                <label class="toggle-switch">
                    <input type="checkbox" id="legacyModeToggle">
                    <span class="toggle-slider"></span>
                    <span class="toggle-text">⚡ Старый режим</span>
                </label>

                <label class="toggle-switch">
                    <input type="checkbox" id="columnRangeToggle">
                    <span class="toggle-slider"></span>
                    <span class="toggle-text">📊 Использовать 15 колонок</span>
                </label>

                <label class="toggle-switch">
                    <input type="checkbox" id="templatesPerSettingToggle">
                    <span class="toggle-slider"></span>
                    <span class="toggle-text">🎯 Режим категорий</span>
                </label>
            </div>

            <div class="control-group" id="projectsControlGroup">
                <label class="control-label" id="projectsControlLabel">Выберите таблицы:</label>
                <button id="toggleButton" class="access-button secondary-button" style="width: 100%; margin-bottom: 8px;">
                    📋 Показать проекты
                </button>
                <div class="projects-actions-bar">
                    <button id="selectAllButton" class="projects-action-btn select-all-btn">✓ Выбрать все</button>
                    <button id="unselectAllButton" class="projects-action-btn unselect-all-btn">✕ Снять все</button>
                </div>
                <div id="namesList" class="projects-list" style="display: none;"></div>
            </div>

            <div class="control-group" id="templateControlGroup">
                <label class="control-label" id="templateControlLabel">Использовать шаблон:</label>
                <select id="templateSelect" class="access-select">
                    <option value="">Выберите шаблон</option>
                    <option value="template1">Шаблон ночников</option>
                    <option value="template2">Стажёры DZ</option>
                </select>
            </div>

            <div class="control-group">
                <label class="control-label">Настройки доступа:</label>
                <div id="fieldsContainer">
                    <div class="field-block mainBlock">
                        <div class="field-block-title">
                            Настройка #1
                        </div>
                        <div class="control-group">
                            <label class="control-label">Колонки (через пробел):</label>
                            <input type="text" class="columnsInput access-input" placeholder="Например: 1 2 3">
                        </div>
                        <div class="control-group">
                            <label class="control-label">Операторы:</label>
                            <textarea rows="3" class="usersInput access-textarea" placeholder="По одному оператору на строку"></textarea>
                        </div>
                        <div class="control-group">
                            <label class="control-label">Действие:</label>
                            <select class="actionSelect access-select">
                                <option value="1">Включить доступ</option>
                                <option value="0">Отключить доступ</option>
                            </select>
                        </div>
                        <div class="control-group projects-or-category">
                            <label class="control-label">Категория (шаблон):</label>
                            <select class="categorySelect access-select"></select>
                        </div>
                    </div>
                </div>
                <button id="addFieldButton" class="access-button secondary-button">+ Добавить поле настроек</button>
            </div>

            <div class="progress-container" id="progressContainer">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text" id="progressText">Обработано: 0 / 0</div>
            </div>

            <div class="divider"></div>

            <div class="button-container">
                <button id="confirmButton" class="access-button success-button" style="flex-grow: 1;">Применить</button>
            </div>
        `;
        document.body.appendChild(panel);

        const searchPanel = document.createElement('div');
        searchPanel.id = 'operatorSearchPanel';
        searchPanel.className = 'operator-search-panel';
        searchPanel.innerHTML = `
            <div class="panel-header">
                <h3 class="panel-title">Поиск</h3>
            </div>

                <div style="display:flex; gap:10px; align-items:center; justify-content:flex-start;">
                    <label style="display:flex; align-items:center; gap:8px; font-weight:600;">
                        <input type="checkbox" id="categorySearchToggle" class="access-checkbox">
                        Поиск по категориям
                    </label>
                </div>

            <div class="search-controls-wrapper" style="display: flex; gap: 15px; align-items: stretch;">
                <div class="search-section" style="flex: 1; display: flex; flex-direction: column;">
                    <label class="control-label" style="font-weight: bold; font-size: 15px; margin-bottom: 8px; display: block;">Список операторов</label>
                    <div class="control-group" style="flex-grow: 1;">
                        <textarea id="operatorAccessSearchTextarea" rows="3" class="access-textarea" placeholder="Логины операторов, по одному на строку"></textarea>
                    </div>
                    <button id="runOperatorAccessSearchBtn" class="access-button success-button" style="width: 100%; margin-top: 5px;">Найти</button>
                </div>

                <div class="search-section" style="flex: 1; display: flex; flex-direction: column;">
                    <label class="control-label" style="font-weight: bold; font-size: 15px; margin-bottom: 8px; display: block;">Список колонок</label>
                    <div class="control-group" style="flex-grow: 1;">
                        <input type="text" id="searchColumnsInput" class="access-input" placeholder="Номера колонок">
                        <span class="hint-text">Оставьте пустым для группировки</span>
                    </div>
                    <button id="runOperatorSearchBtn" class="access-button success-button" style="width: 100%; margin-top: 5px;">Найти</button>
                </div>
            </div>

            <div class="divider" style="margin: 20px 0;"></div>

            <div class="results-area">
                <div id="operatorAccessResultsContainer" class="search-results-container" style="display: none;"></div>
                <div id="columnSearchResultsContainer" class="search-results-container" style="display: none;"></div>
                <div id="applySearchContainer" class="button-container" style="flex-direction: column; gap: 5px; display: none; margin-top: 10px;"></div>
            </div>
        `;
        document.body.appendChild(searchPanel);

    // Модальное окно для вставки шаблона
        (function setupClipboardTool(){
            const pasteModal = document.createElement('div');
            pasteModal.id = 'pasteModal';
            pasteModal.style.position = 'fixed';
            pasteModal.style.left = '50%';
            pasteModal.style.top = '50%';
            pasteModal.style.transform = 'translate(-50%,-50%)';
            pasteModal.style.background = '#fff';
            pasteModal.style.border = '1px solid #ccc';
            pasteModal.style.padding = '12px';
            pasteModal.style.zIndex = '10001';
            pasteModal.style.display = 'none';
            pasteModal.style.width = '640px';
            pasteModal.innerHTML = `
                <div style="font-weight:700; margin-bottom:8px;">Вставьте шаблон (пример в документации)</div>
                <textarea id="pasteTemplateTextarea" rows="14" style="width:100%; box-sizing:border-box;"></textarea>
                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
                    <button id="applyPasteBtn" class="access-button success-button">Применить</button>
                    <button id="cancelPasteBtn" class="access-button secondary-button">Отмена</button>
                </div>`;
            document.body.appendChild(pasteModal);

            function showPasteModal(){ pasteModal.style.display = 'block'; document.getElementById('pasteTemplateTextarea').focus(); }
            function hidePasteModal(){ pasteModal.style.display = 'none'; }

            document.getElementById('cancelPasteBtn').addEventListener('click', hidePasteModal);
            document.getElementById('applyPasteBtn').addEventListener('click', () => {
                const text = document.getElementById('pasteTemplateTextarea').value || '';
                try { const parsed = parseTemplateText(text); applyParsedTemplate(parsed); hidePasteModal(); }
                catch (err) { alert('Ошибка разбора шаблона: ' + (err && err.message ? err.message : err)); }
            });

            setTimeout(() => {
                const showBtn = document.getElementById('showSearchPanelBtn');
                if (showBtn && showBtn.parentElement) {
                    const clipBtn = document.createElement('button');
                    clipBtn.id = 'pasteFromClipboardBtn';
                    clipBtn.className = 'access-button secondary-button';
                    clipBtn.style.padding = '5px 8px';
                    clipBtn.style.fontSize = '12px';
                    clipBtn.title = 'Вставить шаблон';
                    clipBtn.textContent = '📋';
                    showBtn.parentElement.insertBefore(clipBtn, showBtn.nextSibling);
                    clipBtn.addEventListener('click', showPasteModal);
                }
            }, 50);
        })();

        // Управление видимостью глобальных контролов
        function updateGlobalProjectControlsVisibility() {
            const perSetting = document.getElementById('templatesPerSettingToggle')?.checked;
            const labels = panel.querySelectorAll('.control-group label.control-label');
            labels.forEach(l => {
                const txt = l.textContent ? l.textContent.trim() : '';
                if (txt.startsWith('Выберите таблицы')) {
                    l.style.display = perSetting ? 'none' : '';
                }
                if (txt.startsWith('Использовать шаблон')) {
                    l.style.display = perSetting ? 'none' : '';
                }
            });
            const templateSelectEl = document.getElementById('templateSelect');
            if (templateSelectEl) templateSelectEl.style.display = perSetting ? 'none' : '';
        }

        // Инициализация состояния templatesPerSettingToggle из localStorage
        const savedTemplatesPerSetting = localStorage.getItem('proZvon_templatesPerSetting');
        if (savedTemplatesPerSetting !== null) {
            const saved = savedTemplatesPerSetting === '1';
            const tgl = document.getElementById('templatesPerSettingToggle');
            if (tgl) tgl.checked = saved;
        }
        updateGlobalProjectControlsVisibility();

        // Обработчик изменения templatesPerSettingToggle
        const tmplToggle = document.getElementById('templatesPerSettingToggle');
        if (tmplToggle) {
            tmplToggle.addEventListener('change', () => {
                localStorage.setItem('proZvon_templatesPerSetting', tmplToggle.checked ? '1' : '0');
                updateProjectsOrCategoryUI();
                updateGlobalProjectControlsVisibility();
            });
        }

        const confirmButton = document.getElementById('confirmButton');

        const settings = GM_getValue(swap);
        if (!settings || !settings.encryptedKey || !settings.secret) {
            confirmButton.disabled = true;
            confirmButton.textContent = 'Параметры не заданы';
        }

        document.getElementById('closeButton').addEventListener('click', () => {
            panel.remove();
            searchPanel.remove();
            if (observer) observer.disconnect();
        });

        const rows = document.querySelectorAll("tr");
        const namesMap = new Map();
        const namesList = document.getElementById('namesList');
        const toggleButton = document.getElementById('toggleButton');
        const selectAllButton = document.getElementById('selectAllButton');
        const unselectAllButton = document.getElementById('unselectAllButton');

        let projectCount = 0;
        rows.forEach(row => {
            const nameElement = row.querySelector('td:nth-child(2) a');
            const configLinkElement = row.querySelector('td:nth-child(1) a');
            const cells = Array.from(row.querySelectorAll('td:nth-child(n+3)'));
            const values = cells.map(cell => parseFloat(cell.textContent.trim()) || 0);
            const hasNonZeroValue = values.some(value => value > 0);

            if (nameElement && configLinkElement) {
                projectCount++;
                const name = nameElement.textContent.trim();
                const configLink = configLinkElement.href;

                const projectName = name.toLowerCase().replace(/\s+/g, '-');
                const subdomain = projectName;

                // project info logging removed for performance
                namesMap.set(name, { configLink, subdomain });

                const container = document.createElement('div');
                container.className = 'project-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'access-checkbox';
                checkbox.value = subdomain;
                checkbox.dataset.configLink = configLink;
                checkbox.dataset.projectName = name;
                checkbox.id = `checkbox-${name.replace(/\s+/g, '-')}`;
                checkbox.checked = hasNonZeroValue;

                const label = document.createElement('label');
                label.className = 'project-name';
                label.htmlFor = `checkbox-${name.replace(/\s+/g, '-')}`;
                label.textContent = name;
                label.title = name;

                container.appendChild(checkbox);
                container.appendChild(label);
                namesList.appendChild(container);
            }
        });

    fillCategorySelects();
    updateProjectsOrCategoryUI();

        loadProjectCategories().then(categories => {
            projectCategories = categories;
            if (categories.size > 0) {
                populateTemplateSelect();
                fillCategorySelects();
                updateProjectsOrCategoryUI();
            }
        });

        // Заполнение селекта шаблонов категориями
        function populateTemplateSelect() {
            const templateSelect = document.getElementById('templateSelect');

            const existingCategories = templateSelect.querySelectorAll('option[value^="category_"]');
            existingCategories.forEach(option => option.remove());

            projectCategories.forEach((projects, category) => {
                const option = document.createElement('option');
                option.value = `category_${category}`;
                option.textContent = category;
                templateSelect.appendChild(option);
            });
        }

        // Обработчики событий для списка проектов
        toggleButton.addEventListener('click', () => {
            const isVisible = namesList.style.display !== 'none';
            namesList.style.display = isVisible ? 'none' : 'block';
            toggleButton.innerHTML = isVisible ? '📋 Показать проекты' : '📂 Скрыть проекты';
        });

        selectAllButton.addEventListener('click', () => {
            document.querySelectorAll('#namesList input[type="checkbox"]').forEach(cb => cb.checked = true);
        });

        unselectAllButton.addEventListener('click', () => {
            document.querySelectorAll('#namesList input[type="checkbox"]').forEach(cb => cb.checked = false);
        });

        // Обработчик добавления нового поля настроек
        let fieldCounter = 1;
        document.getElementById('addFieldButton').addEventListener('click', () => {
            fieldCounter++;
            const fieldBlock = document.createElement('div');
            fieldBlock.className = 'field-block additionalBlock';
            fieldBlock.innerHTML = `
                <div class="field-block-title">
                    Настройка #${fieldCounter}
                    <div class="field-actions">
                        <button class="remove-field">×</button>
                    </div>
                </div>
                <div class="control-group">
                    <label class="control-label">Колонки (через пробел):</label>
                    <input type="text" class="columnsInput access-input" placeholder="Например: 1 2 3">
                </div>
                <div class="control-group">
                    <label class="control-label">Операторы:</label>
                    <textarea rows="3" class="usersInput access-textarea" placeholder="По одному оператору на строку"></textarea>
                </div>
                <div class="control-group">
                    <label class="control-label">Действие:</label>
                    <select class="actionSelect access-select">
                        <option value="1">Включить доступ</option>
                        <option value="0">Отключить доступ</option>
                    </select>
                </div>
                <div class="control-group projects-or-category">
                    <label class="control-label">Категория (шаблон):</label>
                    <select class="categorySelect access-select"></select>
                </div>
            `;

                // Добавляем select проектов в новый блок (заполним далее)
                document.getElementById('fieldsContainer').appendChild(fieldBlock);
                fillCategorySelects();
                updateProjectsOrCategoryUI();
                updateGlobalProjectControlsVisibility();

            // Обработчик удаления поля
            fieldBlock.querySelector('.remove-field').addEventListener('click', () => {
                fieldBlock.remove();
                reorderFieldBlocks();
                // (projectsSelect removed) обновляем category selects
                fillCategorySelects();
            });
        });

        // Функция для перенумерации блоков настроек после удаления
        function reorderFieldBlocks() {
            const blocks = document.querySelectorAll('.field-block');
            blocks.forEach((block, index) => {
                const titleEl = block.querySelector('.field-block-title');
                if (titleEl) {
                    titleEl.childNodes[0].nodeValue = `Настройка #${index + 1}`;
                }
            });
            fieldCounter = blocks.length;
        }



        // Заполнение .categorySelect опциями на основе projectCategories
        function fillCategorySelects() {
            const categories = Array.from(projectCategories.keys());
            document.querySelectorAll('.categorySelect').forEach(sel => {
                const current = sel.value;
                sel.innerHTML = '';
                const emptyOpt = document.createElement('option');
                emptyOpt.value = '';
                emptyOpt.textContent = '(не выбрано)';
                sel.appendChild(emptyOpt);
                categories.forEach(cat => {
                    const o = document.createElement('option');
                    o.value = cat;
                    o.textContent = cat;
                    if (cat === current) o.selected = true;
                    sel.appendChild(o);
                });
            });
        }

        // Переключатель видимости projectsSelect / categorySelect в соответствии с toggle
        function updateProjectsOrCategoryUI() {
            const perSetting = document.getElementById('templatesPerSettingToggle')?.checked;
            document.querySelectorAll('.projects-or-category').forEach(block => {
                // покажем или спрячем весь control-group с категорией
                block.style.display = perSetting ? '' : 'none';
            });
            // Скрывать/показывать глобальный список проектов
            const namesListEl = document.getElementById('namesList');
            const toggleButtonEl = document.getElementById('toggleButton');
            const selectAllBtn = document.getElementById('selectAllButton');
            const unselectAllBtn = document.getElementById('unselectAllButton');
            if (namesListEl) {
                if (perSetting) {
                    namesListEl.style.display = 'none';
                    if (toggleButtonEl) toggleButtonEl.style.display = 'none';
                    if (selectAllBtn) selectAllBtn.style.display = 'none';
                    if (unselectAllBtn) unselectAllBtn.style.display = 'none';
                } else {
                    if (toggleButtonEl) toggleButtonEl.style.display = 'inline-block';
                    if (selectAllBtn) selectAllBtn.style.display = 'inline-block';
                    if (unselectAllBtn) unselectAllBtn.style.display = 'inline-block';
                    // namesList visibility controlled elsewhere (toggle button)
                }
            }

            const projectsControlGroup = document.getElementById('projectsControlGroup');
            const templateControlGroup = document.getElementById('templateControlGroup');
            if (projectsControlGroup) projectsControlGroup.style.display = perSetting ? 'none' : '';
            if (templateControlGroup) templateControlGroup.style.display = perSetting ? 'none' : '';
        }

        // слушаем переключение шаблонов в панели
        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'templatesPerSettingToggle') {
                updateProjectsOrCategoryUI();
            }
        });

        // --- НОВАЯ ЛОГИКА ДЛЯ ПОИСКА ДОСТУПОВ ОПЕРАТОРОВ ---

    function parseTemplateText(text) {
            if (!text || !text.trim()) return [];
            const lines = text.split(/\r?\n/).map(l => l.trim());
            const result = [];
            let currentCategory = null;
            let currentColorGroup = null; // Зеленых, Желтых, Красных
            let currentColumns = [];
            let currentUsers = [];

            function pushBlock() {
                if (currentCategory && currentUsers.length > 0) {
                    let cat = result.find(r => r.category === currentCategory);
                    if (!cat) {
                        cat = { category: currentCategory, blocks: [] };
                        result.push(cat);
                    }
                    cat.blocks.push({
                        columns: currentColumns.slice(),
                        users: currentUsers.slice(),
                        colorGroup: currentColorGroup
                    });
                    currentColumns = [];
                    currentUsers = [];
                    currentColorGroup = null;
                }
            }

            for (let i = 0; i < lines.length; i++) {
                const ln = lines[i];

                // Пропускаем пустые строки
                if (!ln) continue;

                // Проверяем, является ли строка цветовой группой
                const colorMatch = ln.match(/^(Зеленых|Желтых|Красных|Зеленые|Желтые|Красные)$/i);
                if (colorMatch) {
                    pushBlock();
                    currentColorGroup = colorMatch[1];
                    currentColumns = [];
                    currentUsers = [];
                    continue;
                }

                // Проверяем, является ли строка логином оператора (латинские буквы, цифры, подчеркивания)
                if (/^[A-Za-z0-9_\-аАеЕ]+$/.test(ln) && !/^\d+$/.test(ln)) {
                    if (!currentCategory) {
                        // Если нет категории, эта строка — название категории
                        pushBlock();
                        currentCategory = ln;
                        currentColorGroup = null;
                        currentColumns = [];
                        currentUsers = [];
                    } else {
                        // Это логин оператора
                        currentUsers.push(ln);
                    }
                    continue;
                }

                // Проверяем, является ли строка колонками (только цифры и пробелы)
                const maybeCols = ln.split(/\s+/).map(x => x.trim()).filter(x => x !== '').map(x => Number(x)).filter(n => !Number.isNaN(n));
                if (maybeCols.length > 0 && /^[\d\s]+$/.test(ln)) {
                    if (!currentCategory) {
                        throw new Error('Найдены колонки до указания категории проекта');
                    }
                    // Если уже есть логины, значит колонки относятся к предыдущему блоку
                    if (currentUsers.length > 0) {
                        pushBlock();
                    }
                    currentColumns = maybeCols;
                    continue;
                }

                // Если строка содержит кириллицу и не цветовая группа - это категория проекта
                if (/[а-яА-ЯёЁ]/.test(ln) && !colorMatch) {
                    pushBlock();
                    currentCategory = ln;
                    currentColorGroup = null;
                    currentColumns = [];
                    currentUsers = [];
                    continue;
                }
            }

            // Пушим последний блок
            pushBlock();

            return result;
        }

    function applyParsedTemplate(parsed) {
            if (!Array.isArray(parsed) || parsed.length === 0) return;
            const fieldsContainer = document.getElementById('fieldsContainer');
            const existingBlocks = Array.from(document.querySelectorAll('.field-block'));
            let blockIndex = 0;

            parsed.forEach(catEntry => {
                const category = catEntry.category;
                catEntry.blocks.forEach(blockSpec => {
                    let targetBlock = existingBlocks[blockIndex];
                    if (!targetBlock) {
                        document.getElementById('addFieldButton').click();
                        const allBlocks = Array.from(document.querySelectorAll('.field-block'));
                        targetBlock = allBlocks[allBlocks.length - 1];
                        existingBlocks.push(targetBlock);
                    }

                    // Обновляем заголовок блока с информацией о цветовой группе
                    const blockTitle = targetBlock.querySelector('.field-block-title');
                    if (blockTitle && blockSpec.colorGroup) {
                        blockTitle.textContent = `${category} - ${blockSpec.colorGroup}`;
                    }

                    const catSel = targetBlock.querySelector('.categorySelect');
                    if (catSel) {
                        if (!Array.from(catSel.options).some(o=>o.value === category)) {
                            const op = document.createElement('option'); op.value = category; op.textContent = category; catSel.appendChild(op);
                        }
                        catSel.value = category;
                    }

                    const columnsInput = targetBlock.querySelector('.columnsInput');
                    if (columnsInput) {
                        if (blockSpec.columns && blockSpec.columns.length) {
                            columnsInput.value = blockSpec.columns.join(' ');
                        } else {
                            columnsInput.value = '';
                        }
                    }

                    const usersTa = targetBlock.querySelector('.usersInput');
                    if (usersTa) {
                        if (blockSpec.users && blockSpec.users.length) {
                            usersTa.value = blockSpec.users.join('\n');
                        } else {
                            usersTa.value = '';
                        }
                    }

                    blockIndex++;
                });
            });
        }

    // Получить правила доступа проекта (парсинг конфигурации)
        async function fetchProjectRules(project) {
            const key = project.configLink || project.subdomain || project.name;
            if (rulesCache.has(key)) {
                return rulesCache.get(key);
            }
            const use15Columns = document.getElementById('columnRangeToggle').checked;
            const columnMap = use15Columns ? columnMap15 : columnMap9;

            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: project.configLink,
                    onload: (response) => {
                        if (response.status === 200) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(response.responseText, 'text/html');
                            const operatorAccess = new Map();

                            const rows = doc.querySelectorAll("tr");
                            rows.forEach(row => {
                                const usernameElement = row.querySelector("td:first-child");
                                const username = usernameElement?.textContent?.trim();

                                if (username && username !== 'Имя пользователя') {
                                    const accessibleColumns = new Set();
                                    for (const [col, { group, type }] of Object.entries(columnMap)) {
                                        const checkbox = row.querySelector(`td[data-group="${group}"][data-type="${type}"] input[type="checkbox"]`);
                                        if (checkbox && checkbox.checked) {
                                            accessibleColumns.add(Number(col));
                                        }
                                    }
                                    operatorAccess.set(username.toLowerCase(), accessibleColumns);
                                }
                            });
                            resolve({ project, access: operatorAccess, error: null });
                            // кешировать распаршенные правила
                            try { rulesCache.set(key, { project, access: operatorAccess, error: null }); } catch(e){}
                        } else {
                            console.error(`Ошибка загрузки правил для ${project.name}:`, response.statusText);
                            const res = { project, access: new Map(), error: response.statusText };
                            try { rulesCache.set(key, res); } catch(e) {}
                            resolve(res);
                        }
                    },
                    onerror: (err) => {
                        console.error(`Сетевая ошибка при загрузке правил для ${project.name}:`, err);
                        const res = { project, access: new Map(), error: err };
                        try { rulesCache.set(key, res); } catch(e) {}
                        resolve(res);
                    }
                });
            });
        }


        // Обработчик выбора шаблона
        const templateSelect = document.getElementById('templateSelect');
        templateSelect.addEventListener('change', (event) => {
            const selectedTemplate = event.target.value;

            const fieldsContainer = document.getElementById('fieldsContainer');
            fieldsContainer.innerHTML = '';
            fieldCounter = 0;

            if (selectedTemplate.startsWith("category_")) {
                // Обработка выбора категории
                const categoryName = selectedTemplate.replace("category_", "");
                const categoryProjects = projectCategories.get(categoryName) || [];

                // Снимаем галочки со всех проектов
                const checkboxes = document.querySelectorAll('#namesList input[type="checkbox"]');
                checkboxes.forEach(checkbox => checkbox.checked = false);

                // Отмечаем проекты из выбранной категории
                checkboxes.forEach(checkbox => {
                    const projectName = checkbox.nextElementSibling.textContent.trim().toLowerCase();
                    const subdomain = checkbox.value.toLowerCase();

                    // Проверяем точное совпадение названия проекта или субдомена
                    if (categoryProjects.some(project => {
                        const projectLower = project.toLowerCase().trim();
                        return projectName === projectLower || subdomain === projectLower;
                    })) {
                        checkbox.checked = true;
                    }
                });

                // Создаем базовый блок настроек для категории
                fieldCounter++;
                const fieldBlock = document.createElement('div');
                fieldBlock.className = 'field-block additionalBlock';
                fieldBlock.innerHTML = `
                    <div class="field-block-title">
                        Настройка для категории: ${categoryName}
                    </div>
                    <div class="control-group">
                        <label class="control-label">Колонки (через пробел):</label>
                        <input type="text" class="columnsInput access-input" placeholder="Например: 1 2 3">
                        <span class="hint-text">Введите "all" для выбора всех колонок</span>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Операторы:</label>
                        <textarea rows="3" class="usersInput access-textarea" placeholder="По одному оператору на строку"></textarea>
                        <span class="hint-text">Введите "all" для выбора всех операторов</span>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Действие:</label>
                        <select class="actionSelect access-select">
                            <option value="1">Включить доступ</option>
                            <option value="0">Отключить доступ</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Проекты для этой настройки (опционально):</label>
                        <!-- projectsSelect removed: используем categorySelect -->
                    </div>
                `;
                fieldsContainer.appendChild(fieldBlock);
                fillCategorySelects();
                return;
            }

            if (selectedTemplate === "template1") {
                // Шаблон ночников
                const templates = [
                    "1 2 3 9",
                    "3 4 9",
                    "4 9",
                    "5 6 7 9",
                    "7 8 9"
                ];

                fillCategorySelects();
                fillCategorySelects();
                templates.forEach((template, index) => {
                    fieldCounter++;
                    const fieldBlock = document.createElement('div');
                    fieldBlock.className = 'field-block additionalBlock';
                    fieldBlock.innerHTML = `
                        <div class="field-block-title">
                            Настройка #${fieldCounter}
                            ${index > 0 ? `
                            <div class="field-actions">
                                <button class="remove-field">×</button>
                            </div>` : ''}
                        </div>
                        <div class="control-group">
                            <label class="control-label">Колонки (через пробел):</label>
                            <input type="text" class="columnsInput access-input" value="${template}">
                            <span class="hint-text">Введите "all" для выбора всех колонок</span>
                        </div>
                        <div class="control-group">
                            <label class="control-label">Операторы:</label>
                            <textarea rows="3" class="usersInput access-textarea" placeholder="По одному оператору на строку"></textarea>
                            <span class="hint-text">Введите "all" для выбора всех операторов</span>
                        </div>
                        <div class="control-group">
                            <label class="control-label">Действие:</label>
                            <select class="actionSelect access-select">
                                <option value="1">Включить доступ</option>
                                <option value="0">Отключить доступ</option>
                            </select>
                        </div>
                    `;
                    fieldsContainer.appendChild(fieldBlock);

                    //  обработчик удаления только для дополнительных блоков
                    if (index > 0) {
                        fieldBlock.querySelector('.remove-field').addEventListener('click', () => {
                            fieldBlock.remove();
                            reorderFieldBlocks();
                            fillCategorySelects();
                        });
                    }
                });
            }
            else if (selectedTemplate === "template2") {
                // Шаблон стажеров DZ
                fieldCounter++;
                const columns = "7 8 9";
                const targetProjects = [
                    "rino",
                    "cardiofort-dz",
                    "arthrofix-dz",
                    "valeocard-dz"
                ];

                const fieldBlock = document.createElement('div');
                fieldBlock.className = 'field-block additionalBlock';
                fieldBlock.innerHTML = `
                    <div class="field-block-title">
                        Настройка #${fieldCounter}
                    </div>
                    <div class="control-group">
                        <label class="control-label">Колонки (через пробел):</label>
                        <input type="text" class="columnsInput access-input" value="${columns}">
                        <span class="hint-text">Введите "all" для выбора всех колонок</span>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Операторы:</label>
                        <textarea rows="3" class="usersInput access-textarea" placeholder="По одному оператору на строку"></textarea>
                        <span class="hint-text">Введите "all" для выбора всех операторов</span>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Действие:</label>
                        <select class="actionSelect access-select">
                            <option value="1">Включить доступ</option>
                            <option value="0">Отключить доступ</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Проекты для этой настройки (опционально):</label>
                            <!-- projectsSelect removed: используем categorySelect -->
                    </div>
                `;
                fieldsContainer.appendChild(fieldBlock);
                fillCategorySelects();

                // Снимаем галочки со всех проектов
                const checkboxes = document.querySelectorAll('#namesList input[type="checkbox"]');
                checkboxes.forEach(checkbox => checkbox.checked = false);

                checkboxes.forEach(checkbox => {
                    const projectName = checkbox.nextElementSibling.textContent.trim().toLowerCase();
                    const subdomain = checkbox.value.toLowerCase();

                    // Проверяем точное совпадение с одним из целевых проектов
                    if (targetProjects.some(target => {
                        const targetLower = target.toLowerCase().trim();
                        return projectName === targetLower || subdomain === targetLower;
                    })) {
                        checkbox.checked = true;
                    }
                });
            }
        });

        // Обработчик закрытия панели
        document.getElementById('closeButton').addEventListener('click', () => {
            panel.remove();
            searchPanel.remove();
        });

        async function findOperatorsWithAccess(projects, columns) {
            let hasErrors = false;

            const results = await runWithConcurrency(projects.map(p => () => fetchProjectRules(p)), CONCURRENT_LIMIT);

            results.forEach(result => {
                if (result.error) hasErrors = true;
            });

            if (hasErrors) {
                alert('При поиске операторов возникли ошибки. Некоторые проекты могли быть пропущены. Подробности в консоли.');
            }

            const mergedOperatorAccess = new Map();
            results.forEach(({ access }) => {
                access.forEach((accessibleColumns, operator) => {
                    const operatorLower = operator.toLowerCase();
                    if (!mergedOperatorAccess.has(operatorLower)) {
                        mergedOperatorAccess.set(operatorLower, { name: operator, columns: new Set() });
                    }
                    accessibleColumns.forEach(col => mergedOperatorAccess.get(operatorLower).columns.add(col));
                });
            });

            if (columns.length > 0) {
                const filteredOperators = [];
                mergedOperatorAccess.forEach(({ name, columns: accessibleColumns }) => {
                    if (columns.every(c => accessibleColumns.has(c))) {
                        filteredOperators.push(name);
                    }
                });
                return { type: 'flat', data: filteredOperators.sort() };
            }

            const groupedOperators = new Map();
            mergedOperatorAccess.forEach(({ name, columns: accessibleColumns }) => {
                if (accessibleColumns.size > 0) {
                    const sortedColumns = [...accessibleColumns].sort((a, b) => a - b);
                    const key = sortedColumns.join(', ');
                    if (!groupedOperators.has(key)) {
                        groupedOperators.set(key, []);
                    }
                    groupedOperators.get(key).push(name);
                }
            });

            groupedOperators.forEach(operators => operators.sort());

            return { type: 'grouped', data: groupedOperators };
        }

    // Получить правила для нескольких проектов (использует кеш и ограничение параллельности)
    async function fetchRulesForProjects(projects) {
            // Нормализовать ключи проектов для исключения повторных загрузок
            const unique = [];
            const seen = new Set();
            projects.forEach(p => {
                const key = p.configLink || p.subdomain || (p.name || '').toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(p);
                }
            });

            // Подготовить задачи загрузки для проектов, отсутствующих в кеше
            const toFetch = [];
            unique.forEach(p => {
                const key = p.configLink || p.subdomain || (p.name || '').toLowerCase();
                if (!rulesCache.has(key)) toFetch.push(p);
            });

            if (toFetch.length > 0) {
                await runWithConcurrency(toFetch.map(p => () => fetchProjectRules(p)), CONCURRENT_LIMIT);
            }

            // Собрать результаты из кеша
            const results = unique.map(p => {
                const key = p.configLink || p.subdomain || (p.name || '').toLowerCase();
                return rulesCache.get(key) || { project: p, access: new Map(), error: 'no-data' };
            });
            return results;
        }

        const showSearchPanelBtn = document.getElementById('showSearchPanelBtn');
        const runOperatorSearchBtn = document.getElementById('runOperatorSearchBtn');

        const toggleSearchPanel = (visible) => {
            searchPanel.classList.toggle('visible', visible);
        };

        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                searchPanel.style.height = `${entry.contentRect.height}px`;
            }
        });

        observer.observe(panel);

        showSearchPanelBtn.addEventListener('click', () => {
            const isVisible = searchPanel.classList.contains('visible');
            toggleSearchPanel(!isVisible);
        });

        runOperatorSearchBtn.addEventListener('click', async () => {
            try { rulesCache && rulesCache.clear && rulesCache.clear(); } catch (e) { }
            const columnsInput = document.getElementById('searchColumnsInput').value.trim();
            const columns = columnsInput ? columnsInput.split(' ').map(Number).filter(n => n > 0) : [];

            const selectedProjects = Array.from(document.querySelectorAll('#namesList input[type="checkbox"]:checked'))
                .map(cb => ({
                    name: cb.dataset.projectName,
                    configLink: cb.dataset.configLink
                }));

            if (selectedProjects.length === 0) {
                alert('Сначала выберите проекты на основной панели.');
                return;
            }

            const columnSearchResultsContainer = document.getElementById('columnSearchResultsContainer');
            const operatorAccessResultsContainer = document.getElementById('operatorAccessResultsContainer');
            const applySearchContainer = document.getElementById('applySearchContainer');

            runOperatorSearchBtn.disabled = true;
            runOperatorSearchBtn.textContent = 'Поиск...';
            columnSearchResultsContainer.innerHTML = 'Загрузка...';
            columnSearchResultsContainer.style.display = 'block';
            operatorAccessResultsContainer.style.display = 'none'; // скрытие других результатов
            operatorAccessResultsContainer.innerHTML = '';
            applySearchContainer.style.display = 'none';


            try {
                const categorySearch = document.getElementById('categorySearchToggle').checked;

                if (categorySearch) {
                    // поиск по категориям: агрегируем по категориям, используя projectCategories
                    const results = await findOperatorsWithAccessByCategory(selectedProjects, columns);
                    renderCategorySearchResults(results);
                } else {
                    const results = await findOperatorsWithAccess(selectedProjects, columns);
                    renderSearchResults(results);
                }
            } catch (error) {
                console.error('Ошибка при поиске операторов:', error);
                columnSearchResultsContainer.innerHTML = '<p style="color: var(--danger-color);">Произошла ошибка. Подробности в консоли.</p>';
            } finally {
                runOperatorSearchBtn.disabled = false;
                runOperatorSearchBtn.textContent = 'Найти';
            }
        });

        // --- ПОИСК ПО КАТЕГОРИЯМ ---
        // Агрегирует доступы операторов по категориям офферов
        async function findOperatorsWithAccessByCategory(selectedProjects, columns) {
            // projectCategories: Map<category, [projectNames]>
            const use15Columns = document.getElementById('columnRangeToggle').checked;
            const columnMap = use15Columns ? columnMap15 : columnMap9;

            // Сопоставим subdomain -> project name из selectedProjects
            const selectedBySubdomain = new Map();
            selectedProjects.forEach(p => selectedBySubdomain.set(p.subdomain || p.name.toLowerCase().replace(/\s+/g,'-'), p));

            // Агрегация: соберём проекты, участвующие в выбранных категориях
            const categoryResults = new Map();
            const categoryToMatched = new Map();
            const allMatchedProjects = [];

            for (const [category, projects] of projectCategories.entries()) {
                const matchedProjects = [];
                for (const projNameFragment of projects) {
                    for (const [subdomain, proj] of selectedBySubdomain.entries()) {
                        const pname = (proj.name || '').toLowerCase().trim();
                        const subdomainLower = subdomain.toLowerCase().trim();
                        const projFragmentLower = projNameFragment.toLowerCase().trim();

                        // Точное совпадение названия или субдомена
                        if (pname === projFragmentLower || subdomainLower === projFragmentLower) {
                            // избегать дубликатов
                            if (!matchedProjects.some(mp => (mp.configLink || mp.name) === (proj.configLink || proj.name))) matchedProjects.push(proj);
                        }
                    }
                }
                if (matchedProjects.length) {
                    categoryToMatched.set(category, matchedProjects);
                    matchedProjects.forEach(mp => allMatchedProjects.push(mp));
                }
            }

            if (allMatchedProjects.length === 0) return categoryResults;

            // Уникальные проекты — загрузим их правила единожды
            const uniqueProjects = [];
            const seen = new Set();
            allMatchedProjects.forEach(p => {
                const key = p.configLink || p.subdomain || (p.name || '').toLowerCase();
                if (!seen.has(key)) { seen.add(key); uniqueProjects.push(p); }
            });

            // Для каждой категории загружаем правила проектов динамически (чтобы видеть актуальные изменения)
            for (const [category, matchedProjects] of categoryToMatched.entries()) {
                const merged = new Map(); // operatorLower -> Set(columns)
                // Получаем правила для проектов категории сейчас
                const rulesResults = await runWithConcurrency(matchedProjects.map(p => () => fetchProjectRules(p)), CONCURRENT_LIMIT);
                rulesResults.forEach(({ access }) => {
                    access.forEach((colsSet, operator) => {
                        const op = operator.toLowerCase();
                        if (!merged.has(op)) merged.set(op, new Set());
                        colsSet.forEach(c => merged.get(op).add(c));
                    });
                });

                // Фильтрация по запрошенным колонкам
                if (columns && columns.length) {
                    const filtered = [];
                    merged.forEach((colsSet, op) => {
                        if (columns.every(c => colsSet.has(c))) filtered.push(op);
                    });
                    categoryResults.set(category, { type: 'flat', data: filtered.sort() });
                } else {
                    // группировка по набору колонок
                    const grouped = new Map();
                    merged.forEach((colsSet, op) => {
                        if (colsSet.size === 0) return; // пропускаем
                        const key = [...colsSet].sort((a,b)=>a-b).join(', ');
                        if (!grouped.has(key)) grouped.set(key, []);
                        grouped.get(key).push(op);
                    });
                    grouped.forEach(arr => arr.sort());
                    categoryResults.set(category, { type: 'grouped', data: grouped, projects: matchedProjects.map(p=>p.name || p.subdomain) });
                }
            }

            return categoryResults; // Map category -> {type, data, projects}
        }

        // Рендер результатов поиска по категориям
        function renderCategorySearchResults(categoryResults) {
            const container = document.getElementById('columnSearchResultsContainer');
            container.innerHTML = '';

            if (!categoryResults || categoryResults.size === 0) {
                container.innerHTML = '<p>По выбранным проектам категории не найдены или нет операторов.</p>';
                return;
            }

            // Для каждой категории рисуем блок
            for (const [category, info] of categoryResults.entries()) {
                const safeId = makeSafeId(`cat-${category}`);
                let html = `<div class="operator-group" style="margin-bottom:12px;">`;
                html += `<div class="operator-group-header" style="display:flex; justify-content:space-between; align-items:center;"><strong>Категория: ${category}</strong><span style="font-size:12px;color:#6c757d;">Проектов: ${ (info.projects||[]).length }</span></div>`;

                if (info.type === 'flat') {
                    if (!info.data.length) {
                        html += `<div style="padding-left:15px; margin-top:6px; color:#6c757d;">Операторы не найдены.</div>`;
                    } else {
                        html += `<div style="padding-left:10px; margin-top:6px;">`;
                        info.data.forEach(op => {
                            html += `<div class="operator-group-item"><input type="checkbox" class="search-result-checkbox" value="${op}" checked> <label>${op}</label></div>`;
                        });
                        html += `</div>`;
                    }
                } else if (info.type === 'grouped') {
                    if (!info.data || info.data.size === 0) {
                        html += `<div style="padding-left:15px; margin-top:6px; color:#6c757d;">Операторы не найдены.</div>`;
                    } else {
                        const sortedGroups = new Map([...info.data.entries()].sort());
                        html += `<div style="padding-left:10px; margin-top:6px;">`;
                        sortedGroups.forEach((operators, groupKey) => {
                            const gid = makeSafeId(`${safeId}-${groupKey}`);
                            html += `<div class="operator-group">
                                        <div class="operator-group-header" data-target="${gid}"><span>Колонки: ${groupKey} (${operators.length})</span><input type="checkbox" class="group-select-all-checkbox" title="Выбрать всю группу"></div>
                                        <div id="${gid}" class="operator-group-content">`;
                            operators.forEach(op => html += `<div class="operator-group-item"><input type="checkbox" class="search-result-checkbox" value="${op}"> <label>${op}</label></div>`);
                            html += `</div></div>`;
                        });
                        html += `</div>`;
                    }
                }

                html += `</div>`;
                container.innerHTML += html;
            }

            // Показываем контейнер
            container.style.display = 'block';

            // Добавляем панель "Применить к настройкам" (как для поиска по колонкам)
            const applySearchContainer = document.getElementById('applySearchContainer');
            if (applySearchContainer) {
                if (!categoryResults || categoryResults.size === 0) {
                    applySearchContainer.innerHTML = '';
                    applySearchContainer.style.display = 'none';
                } else {
                    let applyHtml = `
                        <label class="control-label">Применить к настройкам:</label>
                        <div class="checkbox-container" style="flex-direction: column; align-items: flex-start; gap: 5px; padding-left: 10px;">
                            <div class="operator-group-item">
                                <input type="checkbox" id="apply-to-all-settings-checkbox" class="access-checkbox">
                                <label for="apply-to-all-settings-checkbox" style="font-weight: bold;">Выбрать все</label>
                            </div>`;

                    const fieldBlocks = document.querySelectorAll('.field-block');
                    fieldBlocks.forEach((block, index) => {
                        const title = block.querySelector('.field-block-title').childNodes[0].nodeValue.trim();
                        applyHtml += `
                            <div class="operator-group-item">
                                <input type="checkbox" class="apply-setting-checkbox access-checkbox" data-target-index="${index}" id="apply-setting-${index}">
                                <label for="apply-setting-${index}">${title}</label>
                            </div>`;
                    });

                    applyHtml += `</div><button id="applySelectedOperatorsBtn" class="access-button success-button" style="margin-top: 10px;">Применить выбранным</button>`;
                    applySearchContainer.innerHTML = applyHtml;
                    applySearchContainer.style.display = 'flex';
                }
            }
        }

        function renderSearchResults(results) {
            const columnSearchResultsContainer = document.getElementById('columnSearchResultsContainer');
            const applySearchContainer = document.getElementById('applySearchContainer');
            columnSearchResultsContainer.innerHTML = '';
            applySearchContainer.innerHTML = '';

            const hasOperators = (results.type === 'flat' && results.data.length > 0) || (results.type === 'grouped' && results.data.size > 0);

            if (results.type === 'flat') {
                if (!hasOperators) {
                    columnSearchResultsContainer.innerHTML = '<p>Операторы не найдены.</p>';
                } else {
                    results.data.forEach(op => {
                        columnSearchResultsContainer.innerHTML += `
                        <div class="operator-group-item">
                            <input type="checkbox" class="search-result-checkbox" value="${op}" checked>
                            <label>${op}</label>
                        </div>`;
                    });
                }
            } else if (results.type === 'grouped') {
                if (!hasOperators) {
                    columnSearchResultsContainer.innerHTML = '<p>Операторы не найдены.</p>';
                } else {
                    const sortedGroups = new Map([...results.data.entries()].sort());
                    sortedGroups.forEach((operators, groupKey) => {
                        const groupId = makeSafeId(`group-${groupKey}`);
                        const groupHtml = `
                        <div class="operator-group">
                            <div class="operator-group-header" data-target="${groupId}">
                                <span>Колонки: ${groupKey} (${operators.length})</span>
                                <input type="checkbox" class="group-select-all-checkbox" title="Выбрать всю группу">
                            </div>
                            <div id="${groupId}" class="operator-group-content">
                                ${operators.map(op => `
                                    <div class="operator-group-item">
                                        <input type="checkbox" class="search-result-checkbox" value="${op}">
                                        <label>${op}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                        columnSearchResultsContainer.innerHTML += groupHtml;
                    });
                }
            }

            if (!hasOperators) {
                applySearchContainer.style.display = 'none';
                return;
            }

            let applyHtml = `
                <label class="control-label">Применить к настройкам:</label>
                <div class="checkbox-container" style="flex-direction: column; align-items: flex-start; gap: 5px; padding-left: 10px;">
                    <div class="operator-group-item">
                        <input type="checkbox" id="apply-to-all-settings-checkbox" class="access-checkbox">
                        <label for="apply-to-all-settings-checkbox" style="font-weight: bold;">Выбрать все</label>
                    </div>`;

            const fieldBlocks = document.querySelectorAll('.field-block');
            fieldBlocks.forEach((block, index) => {
                const title = block.querySelector('.field-block-title').childNodes[0].nodeValue.trim();
                applyHtml += `
                    <div class="operator-group-item">
                        <input type="checkbox" class="apply-setting-checkbox access-checkbox" data-target-index="${index}" id="apply-setting-${index}">
                        <label for="apply-setting-${index}">${title}</label>
                    </div>`;
            });

            applyHtml += `</div><button id="applySelectedOperatorsBtn" class="access-button success-button" style="margin-top: 10px;">Применить выбранным</button>`;

            applySearchContainer.innerHTML = applyHtml;
            applySearchContainer.style.display = 'flex';
        }

        document.getElementById('columnSearchResultsContainer').addEventListener('click', event => {
            const header = event.target.closest('.operator-group-header');
            if (header && !event.target.classList.contains('group-select-all-checkbox')) {
                const targetId = header.dataset.target;
                if (!targetId) return;
                const content = document.getElementById(targetId);
                if (content) content.classList.toggle('visible');
            }

            if (event.target.classList.contains('group-select-all-checkbox')) {
                const group = event.target.closest('.operator-group');
                const isChecked = event.target.checked;
                group.querySelectorAll('.search-result-checkbox').forEach(cb => cb.checked = isChecked);
            }
        });

        (function() {
            const container = document.getElementById('applySearchContainer');
            if (!container) return;
            container.addEventListener('click', event => {
                const target = event.target;
                const applySearchContainer = document.getElementById('applySearchContainer');

                if (target.id === 'apply-to-all-settings-checkbox') {
                    const isChecked = target.checked;
                    applySearchContainer.querySelectorAll('.apply-setting-checkbox').forEach(cb => cb.checked = isChecked);
                    return;
                }

                if (target.id === 'applySelectedOperatorsBtn') {
                    // Собираем выбранных операторов: сначала из columnSearchResultsContainer, затем из operatorAccessResultsContainer
                    const colContainer = document.getElementById('columnSearchResultsContainer');
                    const opContainer = document.getElementById('operatorAccessResultsContainer');
                    const fromColumn = colContainer ? Array.from(colContainer.querySelectorAll('.search-result-checkbox:checked')).map(cb => cb.value) : [];
                    let selectedOperators = Array.from(new Set(fromColumn));
                    if (!selectedOperators.length && opContainer) {
                        const fromOp = Array.from(opContainer.querySelectorAll('.search-result-checkbox:checked')).map(cb => cb.value);
                        selectedOperators = Array.from(new Set(fromOp));
                    }
                    if (!selectedOperators.length) {
                        alert('Выберите хотя бы одного оператора в результатах поиска для применения.');
                        return;
                    }

                    const selectedSettingsIndexes = Array.from(applySearchContainer.querySelectorAll('.apply-setting-checkbox:checked'))
                        .map(cb => cb.dataset.targetIndex);

                    if (selectedSettingsIndexes.length === 0) {
                        alert('Выберите хотя бы одну настройку для применения.');
                        return;
                    }

                    const uniqueSorted = Array.from(new Set(selectedOperators)).sort((a,b)=>a.localeCompare(b, undefined, {sensitivity:'base'}));
                    const fieldBlocks = document.querySelectorAll('.field-block');
                    selectedSettingsIndexes.forEach(idx => {
                        const index = Number(idx);
                        const block = fieldBlocks[index];
                        if (block) {
                            const ta = block.querySelector('.usersInput.access-textarea');
                            if (ta) ta.value = uniqueSorted.join('\n');
                        }
                    });

                    // Оставляем панель применения видимой (пользователь просил, чтобы она не исчезала)
                    // Покажем краткое сообщение об успешном применении и не очищаем UI
                    try {
                        // удаляем старое сообщение, если есть
                        const oldMsg = applySearchContainer.querySelector('.apply-status-msg');
                        if (oldMsg) oldMsg.remove();
                        const statusEl = document.createElement('div');
                        statusEl.className = 'apply-status-msg';
                        statusEl.style.color = 'var(--success-color)';
                        statusEl.style.fontSize = '13px';
                        statusEl.style.marginTop = '6px';
                        statusEl.textContent = `Применено к ${selectedSettingsIndexes.length} настройкам.`;
                        applySearchContainer.appendChild(statusEl);

                        // автоматически убрать сообщение через 4 секунды, не трогая остальные элементы
                        setTimeout(() => {
                            const el = applySearchContainer.querySelector('.apply-status-msg');
                            if (el) el.remove();
                        }, 4000);
                    } catch (e) {
                        console.error('Не получилось показать статус применения:', e);
                    }
                }
            });
        })();

        document.getElementById('operatorAccessResultsContainer').addEventListener('click', event => {
            const icon = event.target.closest('.info-icon');
            if (icon) {
                const targetId = icon.dataset.targetId;
                if (!targetId) return;
                const detailsElement = document.getElementById(targetId);
                if (detailsElement) {
                    detailsElement.style.display = detailsElement.style.display === 'none' ? 'block' : 'none';
                }
            }
        });

        // --- НОВАЯ ЛОГИКА ДЛЯ ПОИСКА ДОСТУПОВ ОПЕРАТОРОВ ---

        async function findAccessForOperators(projects, targetOperators) {
            const allPromises = projects.map(fetchProjectRules);
            const resultsByProject = await Promise.all(allPromises);

            const operatorInfo = new Map();
            targetOperators.forEach(op => {
                operatorInfo.set(op.toLowerCase(), {
                    name: op,
                    foundIn: new Map(),
                    notFoundIn: new Set()
                });
            });

            resultsByProject.forEach(({ project, access, error }) => {
                if (error) return;

                operatorInfo.forEach((info, operatorLower) => {
                    if (access.has(operatorLower)) {
                        const accessibleColumns = access.get(operatorLower);
                        if (accessibleColumns.size > 0) {
                            info.foundIn.set(project.name, accessibleColumns);
                        }
                    } else {
                        info.notFoundIn.add(project.name);
                    }
                });
            });
            return operatorInfo;
        }

        function renderOperatorAccessResults(results) {
            const operatorAccessResultsContainer = document.getElementById('operatorAccessResultsContainer');
            operatorAccessResultsContainer.innerHTML = '';

            if (results.size === 0) {
                operatorAccessResultsContainer.innerHTML = '<p>Операторы не найдены или у них нет доступов в выбранных проектах.</p>';
                return;
            }

            let html = '';
            let operatorIndex = 0;
            results.forEach(({ name, foundIn, notFoundIn }) => {
                const detailsId = `not-found-details-${operatorIndex}`;

                html += `<div class="operator-group" style="padding: 10px; border-radius: 6px; background: #f0f4f8; margin-bottom: 12px;">`;
                html += `<div class="operator-group-header" style="background: none; padding: 0; font-size: 16px; display: flex; justify-content: space-between; align-items: center;">`;
                html += `<strong>Оператор: ${name}</strong>`;

                if (notFoundIn.size > 0) {
                    html += `<span class="info-icon" title="Показать проекты, где оператор не найден" data-target-id="${detailsId}" style="cursor: pointer; font-size: 18px;">ℹ️</span>`;
                }
                html += `</div>`; // End of header

                if (notFoundIn.size > 0) {
                    html += `<div id="${detailsId}" class="not-found-details" style="display: none; padding: 8px; margin-top: 8px; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px;">`;
                    html += `<strong style="font-size: 13px;">Не найден в проектах:</strong><br/>`;
                    html += [...notFoundIn].sort().join('<br/>');
                    html += `</div>`;
                }

                if (foundIn.size === 0) {
                    html += `<div style="padding-left: 15px; margin-top: 5px; color: #6c757d;">Нет доступов в выбранных проектах.</div>`;
                } else {
                    const sortedProjects = new Map([...foundIn.entries()].sort());
                    sortedProjects.forEach((columns, projectName) => {
                        const sortedColumns = [...columns].sort((a, b) => a - b).join(', ');
                        html += `<div style="padding-left: 15px; margin-top: 5px;"><strong>${projectName}:</strong> ${sortedColumns}</div>`;
                    });
                }
                html += `</div>`;
                operatorIndex++;
            });

            operatorAccessResultsContainer.innerHTML = html;
        }

        document.getElementById('runOperatorAccessSearchBtn').addEventListener('click', async (e) => {
            try { rulesCache && rulesCache.clear && rulesCache.clear(); } catch (err) { }
            const button = e.target;
            const operatorNames = document.getElementById('operatorAccessSearchTextarea').value.trim().split('\n').filter(Boolean).map(s => s.trim());

            if (operatorNames.length === 0) {
                alert('Введите хотя бы одного оператора для поиска.');
                return;
            }

            const selectedProjects = Array.from(document.querySelectorAll('#namesList input[type="checkbox"]:checked'))
                .map(cb => ({
                    name: cb.dataset.projectName,
                    configLink: cb.dataset.configLink
                }));

            if (selectedProjects.length === 0) {
                alert('Сначала выберите проекты на основной панели.');
                return;
            }

            const columnSearchResultsContainer = document.getElementById('columnSearchResultsContainer');
            const operatorAccessResultsContainer = document.getElementById('operatorAccessResultsContainer');
            const applySearchContainer = document.getElementById('applySearchContainer');

            button.disabled = true;
            button.textContent = 'Поиск...';
            operatorAccessResultsContainer.innerHTML = 'Загрузка...';
            operatorAccessResultsContainer.style.display = 'block';
            columnSearchResultsContainer.style.display = 'none'; // Скрываем другие результаты
            columnSearchResultsContainer.innerHTML = '';
            applySearchContainer.style.display = 'none';

            try {
                const categorySearch = document.getElementById('categorySearchToggle').checked;

                if (categorySearch) {
                    operatorAccessResultsContainer.innerHTML = 'Загрузка...';
                    const results = await findAccessForOperatorsByCategory(selectedProjects, operatorNames);
                    renderOperatorAccessResultsByCategory(results);
                } else {
                    const results = await findAccessForOperators(selectedProjects, operatorNames);
                    renderOperatorAccessResults(results);
                }
            } catch (error) {
                console.error('Ошибка при поиске доступов операторов:', error);
                operatorAccessResultsContainer.innerHTML = '<p style="color: var(--danger-color);">Произошла ошибка. Подробности в консоли.</p>';
            } finally {
                button.disabled = false;
                button.textContent = 'Найти';
            }
        });

        // Поиск доступов операторов, агрегированных по категориям
        async function findAccessForOperatorsByCategory(selectedProjects, targetOperators) {
            // selectedProjects: [{name, configLink, maybe subdomain}]
            // targetOperators: array of login strings
            const operatorsLower = targetOperators.map(o => o.toLowerCase());

            // Построим карту выбранных проектов по поддомену/имени для быстрого поиска
            const selectedMap = new Map();
            selectedProjects.forEach(p => {
                const key = (p.subdomain || (p.name || '')).toLowerCase();
                selectedMap.set(key, p);
            });

            // Для каждой категории возьмём проекты, которые пересекаются с выбранными
            const result = new Map(); // category -> Map(operatorLower -> { foundIn: Map(project->Set(cols)), notFoundIn:Set })

            // Сначала соберём все проекты, которые участвуют хотя бы в одной выбранной категории
            const categoryToMatched = new Map();
            const allMatched = [];
            for (const [category, projects] of projectCategories.entries()) {
                const matched = [];
                for (const frag of projects) {
                    const fragLower = frag.toLowerCase().trim();
                    for (const [key, p] of selectedMap.entries()) {
                        const keyLower = key.toLowerCase().trim();
                        const pnameLower = (p.name || '').toLowerCase().trim();

                        // Точное совпадение ключа или имени проекта
                        if (keyLower === fragLower || pnameLower === fragLower) {
                            if (!matched.some(mp => (mp.configLink || mp.name) === (p.configLink || p.name))) matched.push(p);
                        }
                    }
                }
                if (matched.length) {
                    categoryToMatched.set(category, matched);
                    matched.forEach(m => allMatched.push(m));
                }
            }

            if (allMatched.length === 0) return result;

            // Для каждой категории загружаем правила проектов динамически (чтобы видеть актуальные изменения)
            for (const [category, matched] of categoryToMatched.entries()) {
                const mapForCategory = new Map();
                operatorsLower.forEach(op => mapForCategory.set(op, { name: op, foundIn: new Map(), notFoundIn: new Set() }));

                // Получаем правила текущих проектов категории
                const rulesResults = await runWithConcurrency(matched.map(p => () => fetchProjectRules(p)), CONCURRENT_LIMIT);

                // Пробегаем результаты и наполняем структуру
                for (let i = 0; i < matched.length; i++) {
                    const project = matched[i];
                    const key = project.configLink || project.subdomain || project.name;
                    const rr = rulesResults[i] || rulesCache.get(key) || { access: new Map() };
                    const { access } = rr;
                    operatorsLower.forEach(opLower => {
                        if (access && access.has(opLower)) {
                            const cols = access.get(opLower);
                            if (cols && cols.size > 0) {
                                mapForCategory.get(opLower).foundIn.set(project.name || project.subdomain || key, cols);
                            }
                        } else {
                            mapForCategory.get(opLower).notFoundIn.add(project.name || project.subdomain || key);
                        }
                    });
                }

                result.set(category, mapForCategory);
            }

            return result; // Map category -> Map(operatorLower -> {name, foundIn, notFoundIn})
        }

        // Рендер результатов поиска операторов по категориям (для введённых логинов)
        function renderOperatorAccessResultsByCategory(categoryResults) {
            const container = document.getElementById('operatorAccessResultsContainer');
            container.innerHTML = '';

            if (!categoryResults || categoryResults.size === 0) {
                container.innerHTML = '<p>Операторы не найдены в выбранных категориях.</p>';
                return;
            }
            let html = '';
            let operatorIndex = 0;

            for (const [category, mapForCategory] of categoryResults.entries()) {
                // Небольшой заголовок категории
                html += `<div style="margin-bottom:8px;"><strong>Категория: ${category}</strong></div>`;

                // mapForCategory: Map(opLower -> {name, foundIn, notFoundIn})
                mapForCategory.forEach((info, opLower) => {
                    const detailsId = `not-found-details-${makeSafeId(category)}-${operatorIndex}`;
                    html += `<div class="operator-group" style="padding: 10px; border-radius: 6px; background: #f0f4f8; margin-bottom: 12px;">`;
                    html += `<div class="operator-group-header" style="background: none; padding: 0; font-size: 16px; display: flex; justify-content: space-between; align-items: center;">`;
                    html += `<strong>Оператор: ${info.name}</strong>`;

                    if (info.notFoundIn && info.notFoundIn.size > 0) {
                        html += `<span class="info-icon" title="Показать проекты, где оператор не найден" data-target-id="${detailsId}" style="cursor: pointer; font-size: 18px;">ℹ️</span>`;
                    }
                    html += `</div>`; // end header

                    if (info.notFoundIn && info.notFoundIn.size > 0) {
                        html += `<div id="${detailsId}" class="not-found-details" style="display: none; padding: 8px; margin-top: 8px; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px;">`;
                        html += `<strong style="font-size: 13px;">Не найден в проектах:</strong><br/>`;
                        html += [...info.notFoundIn].sort().join('<br/>');
                        html += `</div>`;
                    }

                    if (!info.foundIn || info.foundIn.size === 0) {
                        html += `<div style="padding-left: 15px; margin-top: 5px; color: #6c757d;">Нет доступов в выбранных проектах.</div>`;
                    } else {
                        const sortedProjects = new Map([...info.foundIn.entries()].sort());
                        sortedProjects.forEach((columns, projectName) => {
                            const sortedColumns = [...columns].sort((a, b) => a - b).join(', ');
                            html += `<div style="padding-left: 15px; margin-top: 5px;"><strong>${projectName}:</strong> ${sortedColumns}</div>`;
                        });
                    }

                    html += `</div>`; // end operator-group
                    operatorIndex++;
                });
            }

            container.innerHTML = html;
            container.style.display = 'block';

            // При показе результатов по логинам/категориям панель применения настроек не используется
            const applySearchContainer = document.getElementById('applySearchContainer');
            if (applySearchContainer) {
                applySearchContainer.innerHTML = '';
                applySearchContainer.style.display = 'none';
            }
        }

        // NOTE: обработчик кнопки просмотра подключений категорий удалён — функционал объединён с поиском по категориям


        async function getActiveOperators(subdomain, water) {
            if (operatorsCache && operatorsCache[subdomain]) {
                return operatorsCache[subdomain];
            }

            return new Promise((resolve, reject) => {
                const url = `https://${subdomain}.leadvertex.ru/api/admin/getActiveOperators.html?token=${water}`;
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    onload: (response) => {
                        if (response.status === 200) {
                            try {
                                const data = JSON.parse(response.responseText);
                                operatorsCache[subdomain] = data;
                                resolve(data);
                            } catch (e) {
                                reject(new Error(`Ошибка парсинга ответа сервера: ${e.message}`));
                            }
                        } else {
                            reject(new Error(`HTTP ошибка ${response.status}: ${response.statusText}`));
                        }
                    },
                    onerror: (err) => {
                        reject(new Error(`Ошибка сетевого запроса: ${err.error || 'неизвестная ошибка'}`));
                    }
                });
            });
        }

        async function setOperatorRule(subdomain, trash, operatorID, group, type, set) {
            return new Promise((resolve, reject) => {
                const url = `https://${subdomain}.leadvertex.ru/api/callmode/v2/setOperatorRule.html?token=${trash}`;
                const params = new URLSearchParams();
                params.append('operatorID', operatorID);
                params.append('group', group);
                params.append('type', type);
                params.append('set', set);

                const requestData = params.toString();

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: url,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    data: requestData,
                    onload: (response) => {
                        if (response.status === 200) {
                            try {
                                const result = JSON.parse(response.responseText);
                                if (result.result === 'OK') {
                                    resolve(true);
                                } else {
                                    reject(new Error(`Неожиданный ответ сервера: ${JSON.stringify(result)}`));
                                }
                            } catch (e) {
                                reject(new Error(`Ошибка парсинга ответа сервера: ${e.message}`));
                            }
                        } else {
                            reject(new Error(`HTTP ошибка ${response.status}: ${response.statusText}`));
                        }
                    },
                    onerror: (err) => {
                        reject(new Error(`Ошибка сетевого запроса: ${err.error || 'неизвестная ошибка'}`));
                    }
                });
            });
        }

        // Функция для обновления прогресса
        function updateProgress(current, total) {
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            const percent = Math.round((current / total) * 100);

            progressFill.style.width = `${percent}%`;
            progressText.textContent = `Обработано: ${current} / ${total}`;
        }

        // Обработчик подтверждения настроек
        document.getElementById('confirmButton').addEventListener('click', async () => {
            const useLegacyMode = document.getElementById('legacyModeToggle').checked;

            if (useLegacyMode) {
                // --- ЛОГИКА СТАРОЙ ВЕРСИИ (UI) ---
                const selectedLinks = Array.from(document.querySelectorAll('#namesList input[type="checkbox"]:checked')).map(cb => cb.dataset.configLink);
                const use15Columns = document.getElementById('columnRangeToggle').checked;

                if (!selectedLinks.length) {
                    alert("Выберите хотя бы одну таблицу.");
                    return;
                }

                sessionStorage.setItem('use15Columns', use15Columns);

                const fieldBlocks = document.querySelectorAll('.field-block');
                const blocksData = Array.from(fieldBlocks).map(block => {
                     const actionValue = block.querySelector('.actionSelect').value;
                     const columnsInputValue = block.querySelector('.columnsInput').value.trim();
                     const usersInputValue = block.querySelector('.usersInput').value.trim();

                     return {
                        columnsInput: columnsInputValue.toLowerCase(),
                        columns: columnsInputValue.split(' ').map(Number).filter(Boolean),
                        users: usersInputValue.split('\n').map(user => user.trim().toLowerCase()).filter(Boolean),
                        action: actionValue === "1" ? "включить" : "отключить"
                    };
                });

                if (blocksData.some(data => (!data.columns.length && data.columnsInput !== 'all') || (!data.users.length && !data.users.includes('all')))) {
                    alert("Заполните все поля колонок и операторов.");
                    return;
                }

                sessionStorage.setItem('selectedLinks', JSON.stringify(selectedLinks));
                sessionStorage.setItem('blocksData', JSON.stringify(blocksData));

                alert("Начинается обработка в медленном режиме...");
                window.location.href = selectedLinks[0];

            } else {
                // --- ЛОГИКА НОВОЙ ВЕРСИИ (API) ---
                const settings = GM_getValue(swap);

                if (!settings || !settings.encryptedKey || !settings.secret) {
                    alert("Параметры доступа или ключ расшифровки не найдены. Пожалуйста, установите их через меню Tampermonkey.");
                    return;
                }

                let top;
                try {
                    top = decrypt(settings.encryptedKey, settings.secret);
                    if (!top) throw new Error("Результат расшифровки - пустая строка.");
                } catch (e) {
                    alert(`Ошибка при расшифровке токена: ${e.message}. Убедитесь, что вы ввели правильные зашифрованные данные и ключ расшифровки.`);
                    return;
                }

                const selectedProjects = Array.from(document.querySelectorAll('#namesList input[type="checkbox"]:checked'))
                    .map(cb => ({
                        subdomain: cb.value,
                        name: cb.dataset.projectName || cb.value
                    }));

                const use15Columns = document.getElementById('columnRangeToggle').checked;
                const columnMap = use15Columns ? columnMap15 : columnMap9;
                const allColumns = Object.keys(columnMap).map(Number);

                if (!selectedProjects.length) {
                    alert("Выберите хотя бы один проект.");
                    return;
                }

                const fieldBlocks = document.querySelectorAll('.field-block');
                const blocksData = Array.from(fieldBlocks).map(block => {
                    const columnsInput = block.querySelector('.columnsInput').value.trim().toLowerCase();
                    let columns;

                    if (columnsInput === 'all') {
                        columns = allColumns;
                    } else {
                        columns = columnsInput.split(' ').map(Number).filter(Boolean);
                    }

                    return {
                        columns: columns,
                        users: block.querySelector('.usersInput').value.trim().split('\n').map(user => user.trim()).filter(Boolean),
                        action: block.querySelector('.actionSelect').value
                    };
                });

                const templatesPerSetting = document.getElementById('templatesPerSettingToggle')?.checked;
                const perBlockProjects = [];

                if (templatesPerSetting) {
                    Array.from(fieldBlocks).forEach(block => {
                        const catSel = block.querySelector('.categorySelect');

                        if (catSel && catSel.value) {
                            const cat = catSel.value;
                            let fragments = projectCategories.get(cat) || [];

                            if (fragments.length === 0) {
                                fragments = [cat];
                            }

                            const matched = [];
                            const allProjectItems = document.querySelectorAll('#namesList .project-item');

                            allProjectItems.forEach(item => {
                                const cb = item.querySelector('input[type="checkbox"]');
                                const label = item.querySelector('.project-name');
                                if (!cb || !label) return;
                                const pname = label.textContent.trim().toLowerCase();
                                const sub = cb.value.toLowerCase();
                                const isMatch = fragments.some(f => {
                                    const fLower = f.toLowerCase().trim();
                                    // Точное совпадение названия или субдомена
                                    return pname === fLower || sub === fLower;
                                });

                                if (isMatch) {
                                    matched.push({ subdomain: cb.value, name: label.textContent.trim() });
                                }
                            });

                            perBlockProjects.push({ projects: matched, hasCategory: true });
                        } else {
                            perBlockProjects.push({ projects: [], hasCategory: false });
                        }
                    });
                }

                if (blocksData.some(data => !data.columns.length || !data.users.length)) {
                    alert("Заполните все поля колонок и операторов.");
                    return;
                }

                const confirmButton = document.getElementById('confirmButton');
                document.getElementById('progressContainer').style.display = 'block';
                confirmButton.disabled = true;
                confirmButton.textContent = 'Обработка...';

                const tasks = [];
                const operatorsByDomain = {};

                // Соберём список всех уникальных проектов, по которым нужно работать
                const allProjectsToFetch = new Map(); // subdomain -> {subdomain, name}
                if (templatesPerSetting) {
                    perBlockProjects.forEach(blockInfo => {
                        if (blockInfo.hasCategory) {
                            // Используем только проекты категории
                            blockInfo.projects.forEach(p => allProjectsToFetch.set(p.subdomain, p));
                        } else {
                            // Нет категории — используем глобальные выбранные проекты
                            selectedProjects.forEach(p => allProjectsToFetch.set(p.subdomain, p));
                        }
                    });
                } else {
                    // Без per-setting mode — всегда глобальные selectedProjects
                    selectedProjects.forEach(p => allProjectsToFetch.set(p.subdomain, p));
                }

                // Получаем операторов для всех используемых доменов (параллельно, с лимитом)
                const fetchFns = Array.from(allProjectsToFetch.values()).map(project => {
                    return async () => {
                        const subdomain = project.subdomain;
                        try {
                            operatorsByDomain[subdomain] = await getActiveOperators(subdomain, top);
                        } catch (error) {
                            console.error(`Ошибка получения операторов для ${subdomain}:`, error);
                            operatorsByDomain[subdomain] = null;
                        }
                    };
                });

                await runWithConcurrency(fetchFns, CONCURRENT_LIMIT);

                // Построим задачи: для каждой настройки — по её списку проектов (или по глобальным, если список пуст)
                for (let i = 0; i < blocksData.length; i++) {
                    const blockData = blocksData[i];
                    const { columns, users, action } = blockData;

                    let projectsForBlock = selectedProjects;
                    if (templatesPerSetting && perBlockProjects[i]) {
                        if (perBlockProjects[i].hasCategory) {
                            projectsForBlock = perBlockProjects[i].projects;
                            if (projectsForBlock.length === 0) {
                                continue;
                            }
                        }
                    }

                        for (const project of projectsForBlock) {
                            const { subdomain, name } = project;
                            const operators = operatorsByDomain[subdomain];
                            if (!operators) continue;

                            const loginToIds = {};
                            for (const [id, login] of Object.entries(operators)) {
                                const key = (login || '').toLowerCase();
                                if (!loginToIds[key]) loginToIds[key] = [];
                                loginToIds[key].push(id);
                            }

                            let operatorIds = [];
                            if (users.includes("all")) {
                                operatorIds = Object.keys(operators);
                            } else {
                                for (const user of users) {
                                    const key = user.toLowerCase();
                                    if (loginToIds[key]) operatorIds.push(...loginToIds[key]);
                                }
                            }

                            // Дедуп и push задач
                            const uniqueOpIds = Array.from(new Set(operatorIds));
                            for (const operatorId of uniqueOpIds) {
                                const operatorLogin = operators[operatorId];
                                for (const column of columns) {
                                    const { group, type } = columnMap[column];
                                    tasks.push(() => setOperatorRule(subdomain, top, operatorId, group, type, action).catch(error => {
                                        console.error(`Ошибка установки правила для ${operatorLogin} в ${name}:`, error);
                                    }));
                                }
                            }
                        }
                }

                const totalOperations = tasks.length;
                let completedOperations = 0;
                updateProgress(0, totalOperations);

                // Выполним задачи с ограниченным параллелизмом и обновлением прогресса
                const wrappedTasks = tasks.map(fn => async () => {
                    await fn();
                    completedOperations++;
                    updateProgress(completedOperations, totalOperations);
                });

                await runWithConcurrency(wrappedTasks, CONCURRENT_LIMIT);

                // Все задачи выполнены
                confirmButton.disabled = false;
                confirmButton.textContent = 'Применить';
            }
        });
    }

     if (location.href.includes("rules.html")) {
        const selectedLinks = JSON.parse(sessionStorage.getItem('selectedLinks') || "[]");
        const blocksData = JSON.parse(sessionStorage.getItem('blocksData') || "[]");
        const use15Columns = JSON.parse(sessionStorage.getItem('use15Columns'));
        const columnMap = use15Columns ? columnMap15 : columnMap9;

        let isProcessing = false;

        if (!selectedLinks.length || !blocksData.length) {
            return;
        }

        async function processCurrentPage(targetUsers, columns, enable, columnsInput) {
            let processedOperators = 0;
            return new Promise(resolve => {
                const applyToAll = targetUsers.includes("all");
                const useAllColumns = columnsInput === "all";

                if (useAllColumns) {
                    columns = Object.keys(columnMap).map(Number);
                }

                if (applyToAll) {
                    let clickedCount = 0;
                    columns.forEach(column => {
                        const mapping = columnMap[column];
                        if (mapping) {
                            const { group, type } = mapping;
                            const toggle = document.querySelector(`a.operator-rules-toggle[data-group="${group}"][data-type="${type}"]`);
                            if (toggle) {
                                const icon = toggle.querySelector('i');
                                const isOn = icon && icon.classList.contains('fa-toggle-on');

                                if ((enable && !isOn) || (!enable && isOn)) {
                                    toggle.click();
                                    clickedCount++;
                                }
                            }
                        }
                    });
                    console.log(`[DEBUG] Режим all: кликнуто ${clickedCount} тумблеров колонок для ${enable ? 'включения' : 'отключения'}.`);
                    setTimeout(() => resolve(clickedCount), 1000);
                    return;
                }

                const rows = document.querySelectorAll("tr");

                rows.forEach(row => {
                    const usernameElement = row.querySelector("td:first-child");
                    const username = usernameElement?.textContent?.trim().toLowerCase();

                    if (username && targetUsers.includes(username)) {
                        processedOperators++;
                        columns.forEach(column => {
                            const mapping = columnMap[column];
                            if (mapping) {
                                const { group, type } = mapping;
                                const checkbox = row.querySelector(`td[data-group="${group}"][data-type="${type}"] input[type="checkbox"]`);
                                if (checkbox) {
                                    if ((enable && !checkbox.checked) || (!enable && checkbox.checked)) {
                                        checkbox.click();
                                    }
                                }
                            }
                        });
                    }
                });
                setTimeout(() => resolve(processedOperators), 300);
            });
        }

        async function processPages() {
            if (isProcessing) return;
            isProcessing = true;

            let totalPageOperators = 0;
            for (const { columns, users, action, columnsInput } of blocksData) {
                const processedCount = await processCurrentPage(users, columns, action === "включить", columnsInput);
                totalPageOperators += processedCount;
            }

            const delayPerOperator = 75;
            const totalDelay = Math.max(totalPageOperators * delayPerOperator, 5000); // Минимальная задержка 5 сек

            await new Promise(resolve => setTimeout(resolve, totalDelay));

            const remainingLinks = selectedLinks.slice(1);
            sessionStorage.setItem('selectedLinks', JSON.stringify(remainingLinks));

            if (remainingLinks.length > 0) {
                window.location.href = remainingLinks[0];
            } else {
                alert("Обработка завершена.");
                sessionStorage.clear();
            }
        }
        processPages();
    }
})();

