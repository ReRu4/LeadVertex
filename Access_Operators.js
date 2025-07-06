// ==UserScript==
// @name         Автоматизация настроек доступа по АНГОЛЕ И АЛЖИРУ
// @namespace    http://tampermonkey.net/
// @version      1.4.6
// @description  Автоматический выбор названий и настройка доступа с добавлением полей
// @author       ReRu (@Ruslan_Intertrade)
// @match        *://leadvertex.ru/admin/callmodeNew/settings.html?category=2
// @match        *://leadvertex.ru/admin/callmodeNew/settings.html?category=5
// @match        *://leadvertex.ru/admin/callmodeNew/settings.html?category=6
// @match        *://leadvertex.ru/admin/callmodeNew/settings.html?category=7
// @match        *://leadvertex.ru/admin/callmodeNew/settings.html?category=8
// @match        *://leadvertex.ru/admin/callmodeNew/settings.html?category=9
// @match        *://leadvertex.ru/admin/callmodeNew/rules.html*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/ReRu4/LeadVertex/main/Access_Operators.js
// @downloadURL  https://raw.githubusercontent.com/ReRu4/LeadVertex/main/Access_Operators.js
// ==/UserScript==
(function () {
    'use strict';

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

    console.log("Скрипт загружен с улучшенным интерфейсом.");

    // Добавляем стили в head
    const addGlobalStyle = (css) => {
        const head = document.getElementsByTagName('head')[0];
        if (!head) return;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    };

    // Добавляем глобальные стили
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
        .list-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            padding: 0 5px;
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
        .flex-row {
            display: flex;
            gap: 10px;
            align-items: center;
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
    `);

    if (location.href.includes("settings.html")) {
        // Создаем панель настроек доступа
        const panel = document.createElement('div');
        panel.className = 'access-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3 class="panel-title">Настройка доступа</h3>
                <button id="closeButton" class="access-button danger-button" style="padding: 5px 8px; font-size: 12px;">✕</button>
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
                        </div>
                        <div class="control-group">
                            <label class="control-label">Операторы:</label>
                            <textarea rows="3" class="usersInput access-textarea" placeholder="По одному оператору на строку"></textarea>
                            <span class="hint-text">Введите "all" для выбора всех операторов</span>
                        </div>
                        <div class="control-group">
                            <label class="control-label">Действие:</label>
                            <select class="actionSelect access-select">
                                <option value="включить">Включить доступ</option>
                                <option value="отключить">Отключить доступ</option>
                            </select>
                        </div>
                    </div>
                </div>
                <button id="addFieldButton" class="access-button secondary-button">+ Добавить поле настроек</button>
            </div>

            <div class="divider"></div>

            <div class="button-container">
                <button id="confirmButton" class="access-button success-button" style="flex-grow: 1;">Применить</button>
            </div>
        `;
        document.body.appendChild(panel);

        // Получаем все строки таблицы с проектами
        const rows = document.querySelectorAll("tr");
        const namesMap = new Map();
        const namesList = document.getElementById('namesList');
        const toggleButton = document.getElementById('toggleButton');
        const selectAllButton = document.getElementById('selectAllButton');
        const unselectAllButton = document.getElementById('unselectAllButton');

        // Заполняем список проектов
        rows.forEach(row => {
            const nameElement = row.querySelector('td:nth-child(2) a');
            const configLinkElement = row.querySelector('td:nth-child(1) a');
            const cells = Array.from(row.querySelectorAll('td:nth-child(n+3)'));
            const values = cells.map(cell => parseFloat(cell.textContent.trim()) || 0);
            const hasNonZeroValue = values.some(value => value > 0);

            if (nameElement && configLinkElement) {
                const name = nameElement.textContent.trim();
                const configLink = configLinkElement.href;
                namesMap.set(name, configLink);

                const container = document.createElement('div');
                container.className = 'project-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'access-checkbox';
                checkbox.value = configLink;
                checkbox.id = `checkbox-${name.replace(/\s+/g, '-')}`;
                checkbox.checked = hasNonZeroValue;

                const label = document.createElement('label');
                label.className = 'project-name';
                label.htmlFor = `checkbox-${name.replace(/\s+/g, '-')}`;
                label.textContent = name;
                label.title = name; // Добавляем подсказку при наведении

                container.appendChild(checkbox);
                container.appendChild(label);
                namesList.appendChild(container);
            }
        });

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
                </div>
                <div class="control-group">
                    <label class="control-label">Операторы:</label>
                    <textarea rows="3" class="usersInput access-textarea" placeholder="По одному оператору на строку"></textarea>
                    <span class="hint-text">Введите "all" для выбора всех операторов</span>
                </div>
                <div class="control-group">
                    <label class="control-label">Действие:</label>
                    <select class="actionSelect access-select">
                        <option value="включить">Включить доступ</option>
                        <option value="отключить">Отключить доступ</option>
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

        // Обработчик выбора шаблона
        const templateSelect = document.getElementById('templateSelect');
        templateSelect.addEventListener('change', (event) => {
            const selectedTemplate = event.target.value;

            // Очищаем текущие блоки настроек
            const fieldsContainer = document.getElementById('fieldsContainer');
            fieldsContainer.innerHTML = '';
            fieldCounter = 0;

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
                        </div>
                        <div class="control-group">
                            <label class="control-label">Операторы:</label>
                            <textarea rows="3" class="usersInput access-textarea" placeholder="По одному оператору на строку"></textarea>
                            <span class="hint-text">Введите "all" для выбора всех операторов</span>
                        </div>
                        <div class="control-group">
                            <label class="control-label">Действие:</label>
                            <select class="actionSelect access-select">
                                <option value="включить">Включить доступ</option>
                                <option value="отключить">Отключить доступ</option>
                            </select>
                        </div>
                    `;
                    fieldsContainer.appendChild(fieldBlock);

                    // Добавляем обработчик удаления только для дополнительных блоков
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
                    </div>
                    <div class="control-group">
                        <label class="control-label">Операторы:</label>
                        <textarea rows="3" class="usersInput access-textarea" placeholder="По одному оператору на строку"></textarea>
                        <span class="hint-text">Введите "all" для выбора всех операторов</span>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Действие:</label>
                        <select class="actionSelect access-select">
                            <option value="включить">Включить доступ</option>
                            <option value="отключить">Отключить доступ</option>
                        </select>
                    </div>
                `;
                fieldsContainer.appendChild(fieldBlock);

                // Снимаем галочки с всех проектов
                const checkboxes = document.querySelectorAll('#namesList input[type="checkbox"]');
                checkboxes.forEach(checkbox => checkbox.checked = false);

                // Выбираем только проекты для стажёров
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
        });

        // Обработчик подтверждения настроек
        document.getElementById('confirmButton').addEventListener('click', () => {
            const selectedLinks = Array.from(document.querySelectorAll('#namesList input[type="checkbox"]:checked')).map(cb => cb.value);
            const use15Columns = document.getElementById('columnRangeToggle').checked;

            if (!selectedLinks.length) {
                alert("Выберите хотя бы одну таблицу.");
                return;
            }

            sessionStorage.setItem('use15Columns', use15Columns);

            const fieldBlocks = document.querySelectorAll('.field-block');
            const blocksData = Array.from(fieldBlocks).map(block => {
                const columnsInput = block.querySelector('.columnsInput').value.trim();
                const usersInput = block.querySelector('.usersInput').value.trim();
                const action = block.querySelector('.actionSelect').value;

                return {
                    columns: columnsInput.split(' ').map(Number).filter(Boolean),
                    users: usersInput.split('\n').map(user => user.trim().toLowerCase()).filter(Boolean),
                    action: action
                };
            });

            // Проверка заполнения полей
            if (blocksData.some(data => !data.columns.length || !data.users.length)) {
                alert("Заполните все поля колонок и операторов.");
                return;
            }

            sessionStorage.setItem('selectedLinks', JSON.stringify(selectedLinks));
            sessionStorage.setItem('blocksData', JSON.stringify(blocksData));

            alert("Начинается обработка...");
            window.location.href = selectedLinks[0];
        });
    }

    if (location.href.includes("rules.html")) {
        const selectedLinks = JSON.parse(sessionStorage.getItem('selectedLinks') || "[]");
        const blocksData = JSON.parse(sessionStorage.getItem('blocksData') || "[]");
        const use15Columns = JSON.parse(sessionStorage.getItem('use15Columns'));
        const columnMap = use15Columns ? columnMap15 : columnMap9;

        let isProcessing = false;

        if (!selectedLinks.length || !blocksData.length) {
            console.log("Нет данных для обработки.");
            return;
        }

        async function processCurrentPage(targetUsers, columns, enable) {
            let processedOperators = 0;

            return new Promise(resolve => {
                const rows = document.querySelectorAll("tr");

                // Проверяем, есть ли ключевое слово "all" среди целевых пользователей
                const applyToAll = targetUsers.includes("all");

                rows.forEach(row => {
                    const usernameElement = row.querySelector("td:first-child");
                    const username = usernameElement?.textContent?.trim().toLowerCase();

                    // Обрабатываем строку, если это оператор и либо он в списке целевых, либо применяем ко всем
                    if (username && (applyToAll || targetUsers.includes(username))) {
                        processedOperators++;
                        columns.forEach(column => {
                            const { group, type } = columnMap[column];
                            const checkbox = row.querySelector(`td[data-group="${group}"][data-type="${type}"] input[type="checkbox"]`);
                            if (checkbox) {
                                if (enable && !checkbox.checked) {
                                    checkbox.click();
                                } else if (!enable && checkbox.checked) {
                                    checkbox.click();
                                }
                            }
                        });
                    }
                });

                setTimeout(() => resolve(processedOperators), 700);
            });
        }

        async function processPages() {
            if (isProcessing) {
                console.log("Обработка уже выполняется. Повторный запуск заблокирован.");
                return;
            }

            isProcessing = true;

            let totalOperatorsToProcess = 0;

            for (let i = 0; i < selectedLinks.length; i++) {
                const link = selectedLinks[i];
                console.log(`Обрабатываем проект: ${link}`);

                let pageOperators = 0;

                for (const { columns, users, action } of blocksData) {
                    const enable = action === "включить";
                    console.log(`Обрабатываем колонки: ${columns} для пользователей: ${users} с действием: ${action}`);
                    const processed = await processCurrentPage(users, columns, enable);
                    pageOperators += processed;
                }

                totalOperatorsToProcess += pageOperators;

                console.log(`Обработано операторов на странице: ${pageOperators}`);
                console.log(`Общее количество операторов для обработки: ${totalOperatorsToProcess}`);

                // Рассчитываем задержку на основе обработанных операторов
                const delayPerOperator = 70; // Задержка в миллисекундах на одного оператора
                const totalDelay = Math.max(pageOperators * delayPerOperator, 5000); // Минимальная задержка - 5 секунд

                console.log(`Задержка перед переходом к следующей странице: ${totalDelay} мс`);
                await new Promise(resolve => setTimeout(resolve, totalDelay));

                if (i < selectedLinks.length - 1) {
                    console.log(`Переход к следующему проекту: ${selectedLinks[i + 1]}`);
                    sessionStorage.setItem('selectedLinks', JSON.stringify(selectedLinks.slice(i + 1)));
                    window.location.href = selectedLinks[i + 1];
                    return;
                }
            }

            alert("Обработка завершена.");
            sessionStorage.clear();
            isProcessing = false;
        }

        processPages();
    }
})();
