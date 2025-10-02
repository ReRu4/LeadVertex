// ==UserScript==
// @name         Автоматизация настроек доступа 🔍
// @namespace    http://tampermonkey.net/
// @version      2.4.0
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

    // логирование с временной меткой
    const debug = (message, data) => {
        const timestamp = new Date().toLocaleTimeString();
        if (data) {
            console.log(`[DEBUG ${timestamp}]`, message, data);
        } else {
            console.log(`[DEBUG ${timestamp}]`, message);
        }
    };

    debug('Инициализация скрипта');

    // Функция для загрузки и парсинга данных проектов с GitHub
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

    // Функция для парсинга табличных данных проектов
    function parseProjectData(data) {
        const lines = data.split('\n');
        const categories = new Map();

        for (const line of lines) {
            const parts = line.split('\t').map(part => part.trim());

            if (parts.length >= 2) {
                const category = parts[0];
                const project = parts[1];

                // Пропускаем строки с "--" и пустые проекты
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

    // Глобальная переменная для хранения категорий проектов
    let projectCategories = new Map();


    // стили в head
    const addGlobalStyle = (css) => {
        const head = document.getElementsByTagName('head')[0];
        if (!head) return;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    };

    //  глобальные стили
    addGlobalStyle(`
        :root {
            --primary-color: #4a6da7;
            --primary-dark: #3a5a8c;
            --secondary-color: #f8f9fa;
            --text-color: #343a40;
            --border-color: #dee2e6;
            --hover-color: #e9ecef;
            --success-color: #28a745;
            --warning-color: #ffc107;
            --danger-color: #dc3545;
        }
        .access-panel {
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            padding: 20px;
            z-index: 9999;
            width: 280px;
            max-height: 85vh;
            overflow-y: auto;
            font-family: Arial, sans-serif;
            color: var(--text-color);
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: right 0.4s ease-in-out;
        }
        .access-panel.shifted {
            right: 320px;
        }

        .operator-search-panel {
            position: fixed;
            top: 50%;
            transform: translateY(-50%);
            right: 20px;
            width: 600px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            padding: 20px;
            z-index: 9998;
            max-height: 85vh;
            overflow-y: auto;
            font-family: Arial, sans-serif;
            color: var(--text-color);
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: right 0.4s ease-in-out, opacity 0.4s ease-in-out;
            opacity: 0;
            pointer-events: none;
            border: 1px solid var(--border-color);
        }

        .operator-search-panel.visible {
            right: 320px;
            opacity: 1;
            pointer-events: auto;
        }

        .search-results-container {
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 10px;
            margin-top: 10px;
            max-height: 45vh;
            overflow-y: auto;
            background-color: #f8f9fa;
        }

        .operator-group {
            margin-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 10px;
        }
        .operator-group:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        .operator-group-header {
            font-weight: bold;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px;
            border-radius: 4px;
        }
        .operator-group-header:hover {
            background-color: var(--hover-color);
        }

        .operator-group-content {
            padding-left: 20px;
            margin-top: 5px;
            display: none; /* Initially hidden */
        }
        .operator-group-content.visible {
            display: block;
        }

        .operator-group-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 2px 0;
        }

        .users-input-wrapper {
            display: flex;
            align-items: stretch;
            gap: 5px;
        }
        .users-input-wrapper .access-textarea {
            flex-grow: 1;
            margin: 0;
        }
        .find-operators-btn {
            flex-shrink: 0;
        }
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 10px;
        }
        .panel-title {
            font-size: 18px;
            font-weight: bold;
            color: var(--primary-color);
            margin: 0;
        }
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 5px;
        }
        .control-label {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
        }
        .hint-text {
            font-size: 12px;
            color: #6c757d;
            margin-top: -2px;
        }
        .access-button {
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s, transform 0.1s;
        }
        .access-button:hover {
            background-color: var(--primary-dark);
        }
        .access-button:active {
            transform: scale(0.98);
        }
        .secondary-button {
            background-color: var(--secondary-color);
            color: var(--text-color);
            border: 1px solid var(--border-color);
        }
        .secondary-button:hover {
            background-color: var(--hover-color);
        }
        .danger-button {
            background-color: var(--danger-color);
            color: white;
        }
        .danger-button:hover {
            background-color: #bd2130;
        }
        .success-button {
            background-color: var(--success-color);
        }
        .success-button:hover {
            background-color: #218838;
        }
        .access-input, .access-textarea {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
            white-space: normal;
        }
        .access-input:focus, .access-select:focus, .access-textarea:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 2px rgba(74, 109, 167, 0.2);
        }
        .access-checkbox {
            margin-right: 8px;
        }
        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 5px;
        }
        .access-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .field-block {
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            background-color: #f8f9fa;
        }
        .field-block-title {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .field-actions {
            display: flex;
            gap: 5px;
        }
        .remove-field {
            color: var(--danger-color);
            cursor: pointer;
            font-size: 18px;
            background: none;
            border: none;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        .remove-field:hover {
            background-color: rgba(220, 53, 69, 0.1);
        }
        .projects-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 10px;
            background-color: white;
            margin-top: 5px;
        }
        .project-item {
            display: flex;
            align-items: center;
            padding: 5px 0;
            border-bottom: 1px solid var(--border-color);
        }
        .project-item:last-child {
            border-bottom: none;
        }
        .project-name {
            margin-left: 8px;
            flex-grow: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .list-actions {
            display: flex;
            gap: 5px;
        }
        .list-action {
            font-size: 12px;
            padding: 2px 5px;
            cursor: pointer;
            color: var(--primary-color);
            background: none;
            border: none;
        }
        .list-action:hover {
            text-decoration: underline;
        }
        .button-container {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .divider {
            height: 1px;
            background-color: var(--border-color);
            margin: 10px 0;
        }
        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .access-select {
            width: 100%;
            height: 40px;
            padding: 8px 10px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
            text-overflow: ellipsis;
            appearance: menulist;
            -webkit-appearance: menulist;
            -moz-appearance: menulist;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .progress-container {
            margin-top: 15px;
            display: none;
        }
        .progress-bar {
            height: 10px;
            background-color: #e9ecef;
            border-radius: 5px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background-color: var(--primary-color);
            width: 0%;
            transition: width 0.3s ease;
        }
        .progress-text {
            margin-top: 5px;
            text-align: center;
            font-size: 12px;
        }
    `);

    if (location.href.includes("settings.html")) {
        debug('Обнаружена страница настроек, инициализация интерфейса');
        // панель настроек доступа
        const panel = document.createElement('div');
        panel.className = 'access-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 class="panel-title">Настройка доступа</h3>
                    <button id="showSearchPanelBtn" class="access-button secondary-button" title="Найти операторов" style="padding: 5px 8px; font-size: 12px;">🔍</button>
                </div>
                <button id="closeButton" class="access-button danger-button" style="padding: 5px 8px; font-size: 12px;">✕</button>
            </div>

            <div class="control-group">
                <div class="checkbox-container" style="justify-content: space-between;">
                    <label for="legacyModeToggle" style="white-space: nowrap; cursor: pointer;">
                        <input type="checkbox" id="legacyModeToggle" class="access-checkbox">
                        Старый режим
                    </label>
                </div>
            </div>

            <div class="control-group">
                <div class="checkbox-container">
                    <input type="checkbox" id="columnRangeToggle" class="access-checkbox">
                    <label for="columnRangeToggle" style="white-space: nowrap;">Использовать 15 колонок</label>
                </div>
            </div>

            <div class="control-group">
                <label class="control-label">Выберите таблицы:</label>
                <div class="access-toggle">
                    <button id="toggleButton" class="access-button secondary-button">Показать проекты</button>
                    <div class="list-actions">
                        <button id="selectAllButton" class="list-action">Выбрать все</button>
                        <button id="unselectAllButton" class="list-action">Снять все</button>
                    </div>
                </div>
                <div id="namesList" class="projects-list" style="display: none;"></div>
            </div>

            <div class="control-group">
                <label class="control-label">Использовать шаблон:</label>
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


        const confirmButton = document.getElementById('confirmButton');

        const settings = GM_getValue(swap);
        if (!settings || !settings.encryptedKey || !settings.secret) {
            confirmButton.disabled = true;
            confirmButton.textContent = 'Параметры не заданы';
        }

        // Обработчик закрытия панели
        document.getElementById('closeButton').addEventListener('click', () => {
            panel.remove();
            searchPanel.remove();
            if (observer) observer.disconnect();
        });

        // проекты
        const rows = document.querySelectorAll("tr");
        const namesMap = new Map();
        const namesList = document.getElementById('namesList');
        const toggleButton = document.getElementById('toggleButton');
        const selectAllButton = document.getElementById('selectAllButton');
        const unselectAllButton = document.getElementById('unselectAllButton');

        debug('Получено строк таблицы:', rows.length);

        // список проектов
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

                debug(`Проект ${projectCount}: ${name}, поддомен: ${subdomain}, ссылка: ${configLink}`);
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

        debug(`Всего добавлено проектов: ${projectCount}`);

        // Загрузка категорий проектов с GitHub
        loadProjectCategories().then(categories => {
            projectCategories = categories;
            if (categories.size > 0) {
                debug(`Загружено категорий проектов: ${categories.size}`);
                populateTemplateSelect();
            } else {
                debug('Не удалось загрузить категории проектов с GitHub');
            }
        });

        // Функция для заполнения селекта шаблонов категориями
        function populateTemplateSelect() {
            const templateSelect = document.getElementById('templateSelect');

            // Удаляем все существующие категории
            const existingCategories = templateSelect.querySelectorAll('option[value^="category_"]');
            existingCategories.forEach(option => option.remove());

            // Добавляем категории как новые опции
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
            toggleButton.textContent = isVisible ? 'Показать проекты' : 'Скрыть проекты';
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
            document.getElementById('fieldsContainer').appendChild(fieldBlock);

            // Обработчик удаления поля
            fieldBlock.querySelector('.remove-field').addEventListener('click', () => {
                fieldBlock.remove();
                reorderFieldBlocks();
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

        // --- НОВАЯ ЛОГИКА ДЛЯ ПОИСКА ДОСТУПОВ ОПЕРАТОРОВ ---

        // Общая функция для получения правил доступа проекта
        async function fetchProjectRules(project) {
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
                        } else {
                            console.error(`Ошибка загрузки правил для ${project.name}:`, response.statusText);
                            resolve({ project, access: new Map(), error: response.statusText });
                        }
                    },
                    onerror: (err) => {
                        console.error(`Сетевая ошибка при загрузке правил для ${project.name}:`, err);
                        resolve({ project, access: new Map(), error: err });
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
                    const subdomain = checkbox.value;

                    if (categoryProjects.some(project =>
                        projectName.includes(project.toLowerCase()) ||
                        subdomain.includes(project.toLowerCase())
                    )) {
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
                `;
                fieldsContainer.appendChild(fieldBlock);
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
                `;
                fieldsContainer.appendChild(fieldBlock);

                // Снимаем галочки со всех проектов
                const checkboxes = document.querySelectorAll('#namesList input[type="checkbox"]');
                checkboxes.forEach(checkbox => checkbox.checked = false);

                checkboxes.forEach(checkbox => {
                    const projectName = checkbox.nextElementSibling.textContent.trim().toLowerCase();
                    if (targetProjects.some(target => projectName.includes(target))) {
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

            const allPromises = projects.map(fetchProjectRules);
            const results = await Promise.all(allPromises);

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

            // заданы колонки для фильтрации
            if (columns.length > 0) {
                const filteredOperators = [];
                mergedOperatorAccess.forEach(({ name, columns: accessibleColumns }) => {
                    if (columns.every(c => accessibleColumns.has(c))) {
                        filteredOperators.push(name);
                    }
                });
                return { type: 'flat', data: filteredOperators.sort() };
            }

            // не заданы - группируем
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

             // сортировка операторов внутри каждой группы
            groupedOperators.forEach(operators => operators.sort());

            return { type: 'grouped', data: groupedOperators };
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
                const results = await findOperatorsWithAccess(selectedProjects, columns);
                renderSearchResults(results);
            } catch (error) {
                console.error('Ошибка при поиске операторов:', error);
                columnSearchResultsContainer.innerHTML = '<p style="color: var(--danger-color);">Произошла ошибка. Подробности в консоли.</p>';
            } finally {
                runOperatorSearchBtn.disabled = false;
                runOperatorSearchBtn.textContent = 'Найти';
            }
        });

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
                        const groupId = `group-${groupKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
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
                const content = document.getElementById(header.dataset.target);
                if (content) content.classList.toggle('visible');
            }

            if (event.target.classList.contains('group-select-all-checkbox')) {
                const group = event.target.closest('.operator-group');
                const isChecked = event.target.checked;
                group.querySelectorAll('.search-result-checkbox').forEach(cb => cb.checked = isChecked);
            }
        });

        applySearchContainer.addEventListener('click', event => {
            const target = event.target;

            if (target.id === 'apply-to-all-settings-checkbox') {
                const isChecked = target.checked;
                applySearchContainer.querySelectorAll('.apply-setting-checkbox').forEach(cb => cb.checked = isChecked);
                return;
            }

            if (target.id === 'applySelectedOperatorsBtn') {
                const selectedOperators = Array.from(document.getElementById('columnSearchResultsContainer').querySelectorAll('.search-result-checkbox:checked'))
                    .map(cb => cb.value);

                const selectedSettingsIndexes = Array.from(applySearchContainer.querySelectorAll('.apply-setting-checkbox:checked'))
                    .map(cb => cb.dataset.targetIndex);

                if (selectedSettingsIndexes.length === 0) {
                    alert('Выберите хотя бы одну настройку для применения.');
                    return;
                }

                const allTextareas = document.querySelectorAll('.usersInput.access-textarea');
                selectedSettingsIndexes.forEach(index => {
                    if (allTextareas[index]) {
                        allTextareas[index].value = selectedOperators.join('\n');
                    }
                });

                toggleSearchPanel(false);
            }
        });

        document.getElementById('operatorAccessResultsContainer').addEventListener('click', event => {
            const icon = event.target.closest('.info-icon');
            if (icon) {
                const targetId = icon.dataset.targetId;
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
                const results = await findAccessForOperators(selectedProjects, operatorNames);
                renderOperatorAccessResults(results);
            } catch (error) {
                console.error('Ошибка при поиске доступов операторов:', error);
                operatorAccessResultsContainer.innerHTML = '<p style="color: var(--danger-color);">Произошла ошибка. Подробности в консоли.</p>';
            } finally {
                button.disabled = false;
                button.textContent = 'Найти';
            }
        });


        async function getActiveOperators(subdomain, water) {
            return new Promise((resolve, reject) => {
                const url = `https://${subdomain}.leadvertex.ru/api/admin/getActiveOperators.html?token=${water}`;
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    onload: (response) => {
                        if (response.status === 200) {
                            try {
                                const data = JSON.parse(response.responseText);
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
                     return {
                        columns: block.querySelector('.columnsInput').value.trim().split(' ').map(Number).filter(Boolean),
                        users: block.querySelector('.usersInput').value.trim().split('\n').map(user => user.trim().toLowerCase()).filter(Boolean),
                        action: actionValue === "1" ? "включить" : "отключить" // Конвертация для старого режима
                    };
                });

                if (blocksData.some(data => !data.columns.length || !data.users.length)) {
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

                for (const project of selectedProjects) {
                    try {
                        const { subdomain } = project;
                        operatorsByDomain[subdomain] = await getActiveOperators(subdomain, top);
                    } catch (error) {
                        console.error(`Ошибка получения операторов для ${project.subdomain}:`, error);
                        operatorsByDomain[subdomain] = null; // Помечаем, что проект недоступен
                    }
                }

                for (const project of selectedProjects) {
                    const { subdomain, name } = project;
                    const operators = operatorsByDomain[subdomain];
                    if (!operators) continue; // Пропускаем проекты, где не удалось получить операторов

                    for (const blockData of blocksData) {
                        const { columns, users, action } = blockData;

                        let operatorIds = [];
                        if (users.includes("all")) {
                            operatorIds = Object.keys(operators);
                        } else {
                            for (const [id, login] of Object.entries(operators)) {
                                if (users.some(user => user.toLowerCase() === login.toLowerCase())) {
                                    operatorIds.push(id);
                                }
                            }
                        }

                        for (const operatorId of operatorIds) {
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

                //воркеры
                const runWorker = async () => {
                    while (tasks.length > 0) {
                        const task = tasks.shift();
                        if (task) {
                            await task();
                            completedOperations++;
                            updateProgress(completedOperations, totalOperations);
                        }
                    }
                };

                //Запуск пула воркеров
                const workers = [];
                for (let i = 0; i < CONCURRENT_LIMIT; i++) {
                    workers.push(runWorker());
                }

                await Promise.all(workers);

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

        async function processCurrentPage(targetUsers, columns, enable) {
            let processedOperators = 0;
            return new Promise(resolve => {
                const rows = document.querySelectorAll("tr");
                const applyToAll = targetUsers.includes("all");

                rows.forEach(row => {
                    const usernameElement = row.querySelector("td:first-child");
                    const username = usernameElement?.textContent?.trim().toLowerCase();

                    if (username && (applyToAll || targetUsers.includes(username))) {
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
                setTimeout(() => resolve(processedOperators), 300); // Задержка для применения кликов
            });
        }

        async function processPages() {
            if (isProcessing) return;
            isProcessing = true;

            let totalPageOperators = 0;
            for (const { columns, users, action } of blocksData) {
                const processedCount = await processCurrentPage(users, columns, action === "включить");
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
