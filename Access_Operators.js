// ==UserScript==
// @name         Автоматизация настроек доступа по АНГОЛЕ И АЛЖИРУ
// @namespace    http://tampermonkey.net/
// @version      1.3.0
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

    console.log("Скрипт загружен с дополнениями.");

    if (location.href.includes("settings.html")) {
        const dialog = document.createElement('div');
        dialog.innerHTML = `
            <div style="position: fixed; top: 50%; right: 0; transform: translateY(-50%); background: white; border: 1px solid black; padding: 15px; z-index: 9999; width: 208px;">
                <label style="display: flex; align-items: center;">
                    <input type="checkbox" id="columnRangeToggle" style="margin-right: 10px;">
                    Включить 15 колонок
                </label>
                <br>
                <label>Выберите таблицы:<br>
                    <button id="toggleButton" style="width: 100%; margin-bottom: 5px;">Развернуть/Свернуть список</button>
                    <div id="namesList" style="display: none; position: fixed; top: 25%; left: 10%; width: 200px; max-height: 300px; overflow-y: scroll; border: 1px solid #ccc; padding: 5px; background: white; z-index: 1001; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);"></div>
                </label>
                <br>
                <div id="fieldsContainer" style="max-height: 350px; overflow-y: scroll; overflow-x: hidden; padding: 0; margin: 0;">
                <div class="fieldBlock mainBlock" style="margin-bottom: 5px; padding: 0;">
                    <label style="margin-bottom: 3px;">Введите колонки (через пробел):<br>
                    <input type="text" class="columnsInput" style="width: 200px; font-size: 14px; margin-bottom: 3px; padding: 2px;">
                </label>
                <br>
                    <label style="margin-bottom: 3px;">Введите операторов (по строке на каждого):<br>
                    <textarea rows="3" class="usersInput" style="width: 200px; font-size: 14px; margin-top: 3px; margin-bottom: 5px; padding: 2px; overflow-x: hidden;"></textarea>
                </label>
                </div>
                </div>
                <button id="addFieldButton" style="width: 100%;margin-bottom: 10px;">Добавить дополнительные поля</button>
                <br>
                <label>Шаблоны:<br>
                    <select id="templateSelect" style="width: 100%; margin-bottom: 5px;">
                        <option value="">Выберите шаблон</option>
                        <option value="template1">Шаблон ночников</option>
                        <option value="template2">Стажёры DZ</option>
                    </select>
                </label>
                <br>
                <label>Выберите действие:<br>
                    <select id="actionSelect" style="width: 100%;">
                        <option value="включить">Включить</option>
                        <option value="отключить">Отключить</option>
                    </select>
                </label>
                <br>
                <button id="confirmButton">Подтвердить</button>
                <button id="closeButton" style="margin-left: 10px;">Закрыть</button>
            </div>
        `;
        document.body.appendChild(dialog);

        const rows = document.querySelectorAll("tr");
        const namesMap = new Map();
        const namesList = document.getElementById('namesList');
        const toggleButton = document.getElementById('toggleButton');

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
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.marginBottom = '5px';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = configLink;
                checkbox.id = `checkbox-${name}`;
                checkbox.style.marginRight = '10px';
                checkbox.checked = hasNonZeroValue;

                const label = document.createElement('label');
                label.htmlFor = `checkbox-${name}`;
                label.textContent = name;
                label.style.flexGrow = '1';

                container.appendChild(checkbox);
                container.appendChild(label);
                namesList.appendChild(container);
            }
        });

        toggleButton.addEventListener('click', () => {
            namesList.style.display = namesList.style.display === 'none' ? 'block' : 'none';
        });

        const fieldsContainer = document.getElementById('fieldsContainer');
        document.getElementById('addFieldButton').addEventListener('click', () => {
            const fieldBlock = document.createElement('div');
            fieldBlock.className = 'fieldBlock additionalBlock';
            fieldBlock.style.marginBottom = '10px';
            fieldBlock.innerHTML = `
                <label style="margin-bottom: 3px;">Введите колонки (через пробел):<br>
                    <input type="text" class="columnsInput" style="width: 180px; font-size: 14px; margin-bottom: 3px; padding: 2px;">
                </label>
                <br>
                    <label style="margin-bottom: 3px;">Введите операторов (по строке на каждого):<br>
                    <textarea rows="3" class="usersInput" style="width: 180px; font-size: 14px; margin-top: 3px; margin-bottom: 5px; padding: 2px; overflow-x: hidden;"></textarea>
                </label>
            `;
            fieldsContainer.appendChild(fieldBlock);
        });

        const templateSelect = document.getElementById('templateSelect');
        templateSelect.addEventListener('change', (event) => {
            const selectedTemplate = event.target.value;

            if (selectedTemplate === "template1") {
                fieldsContainer.innerHTML = '';
                const templates = [
                    "1 2 3 9",
                    "3 4 9",
                    "4 9",
                    "5 6 7 9",
                    "7 8 9"
                ];

                templates.forEach(template => {
                    const fieldBlock = document.createElement('div');
                    fieldBlock.className = 'fieldBlock additionalBlock';
                    fieldBlock.style.marginBottom = '10px';
                    fieldBlock.innerHTML = `
                        <label style="margin-bottom: 3px;">Введите колонки (через пробел):<br>
                            <input type="text" class="columnsInput" style="width: 180px; font-size: 14px; margin-bottom: 3px; padding: 2px;" value="${template}">
                        </label>
                        <br>
                            <label style="margin-bottom: 3px;">Введите операторов (по строке на каждого):<br>
                            <textarea rows="3" class="usersInput" style="width: 180px; font-size: 14px; margin-top: 3px; margin-bottom: 5px; padding: 2px; overflow-x: hidden;"></textarea>
                        </label>
                    `;
                    fieldsContainer.appendChild(fieldBlock);
                });
            }
            else if (selectedTemplate === "template2") {
                fieldsContainer.innerHTML = '';

                const columns = "7 8 9";

                const targetProjects = [
                    "rino",
                    "cardiofort-dz",
                    "arthrofix-dz",
                    "valeocard-dz"
                ];

                const fieldBlock = document.createElement('div');
                fieldBlock.className = 'fieldBlock additionalBlock';
                fieldBlock.style.marginBottom = '10px';
                fieldBlock.innerHTML = `
        <label style="margin-bottom: 3px;">Введите колонки (через пробел):<br>
            <input type="text" class="columnsInput" style="width: 180px; font-size: 14px; margin-bottom: 3px; padding: 2px;" value="${columns}">
        </label>
        <br>
        <label style="margin-bottom: 3px;">Введите операторов (по строке на каждого):<br>
            <textarea rows="3" class="usersInput" style="width: 180px; font-size: 14px; margin-top: 3px; margin-bottom: 5px; padding: 2px; overflow-x: hidden;"></textarea>
        </label>
    `;
                fieldsContainer.appendChild(fieldBlock);

                // Снимаем галочки с всех проектов
                const checkboxes = document.querySelectorAll('#namesList input[type="checkbox"]');
                checkboxes.forEach(checkbox => checkbox.checked = false);

                // Выбираем только проекты для стажёров
                checkboxes.forEach(checkbox => {
                    const projectName = checkbox.nextElementSibling.textContent.trim().toLowerCase();
                    if (targetProjects.includes(projectName)) {
                        checkbox.checked = true;
                    }
                });
            }

        });
        document.getElementById('closeButton').addEventListener('click', () => {
            dialog.remove();
        });

        document.getElementById('confirmButton').addEventListener('click', () => {
            const selectedLinks = Array.from(document.querySelectorAll('#namesList input[type="checkbox"]:checked')).map(cb => cb.value);
            const action = document.getElementById('actionSelect').value;
            const use15Columns = document.getElementById('columnRangeToggle').checked;

            if (!selectedLinks.length) {
                alert("Выберите хотя бы одну таблицу.");
                return;
            }

            sessionStorage.setItem('action', action);
            sessionStorage.setItem('use15Columns', use15Columns);

            const fieldBlocks = document.querySelectorAll('.fieldBlock');
            const blocksData = Array.from(fieldBlocks).map(block => {
                const columnsInput = block.querySelector('.columnsInput').value.trim();
                const usersInput = block.querySelector('.usersInput').value.trim();

                return {
                    columns: columnsInput.split(' ').map(Number).filter(Boolean),
                    users: usersInput.split('\n').map(user => user.trim().toLowerCase())
                };
            });

            if (blocksData.some(data => !data.columns.length || !data.users.length)) {
                alert("Заполните все поля.");
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
    const action = sessionStorage.getItem('action');
    const use15Columns = JSON.parse(sessionStorage.getItem('use15Columns'));
    const columnMap = use15Columns ? columnMap15 : columnMap9;
    const enable = action === "включить";


    let isProcessing = false;

    if (!selectedLinks.length || !blocksData.length) {
        console.log("Нет данных для обработки.");
        return;
    }

    async function processCurrentPage(targetUsers, columns, enable) {
    let processedOperators = 0;

    return new Promise(resolve => {
        const rows = document.querySelectorAll("tr");
        rows.forEach(row => {
            const usernameElement = row.querySelector("td:first-child");
            const username = usernameElement?.textContent?.trim().toLowerCase();

            if (username && targetUsers.includes(username)) {
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

                for (const { columns, users } of blocksData) {
                    console.log(`Обрабатываем колонки: ${columns} для пользователей: ${users}`);
                    const processed = await processCurrentPage(users, columns, enable);
                    pageOperators += processed;
                }

                totalOperatorsToProcess += pageOperators;

                console.log(`Обработано операторов на странице: ${pageOperators}`);
                console.log(`Общее количество операторов для обработки: ${totalOperatorsToProcess}`);

                // Рассчитываем задержку на основе обработанных операторов
                const delayPerOperator = 57; // Задержка в миллисекундах на одного оператора
                const totalDelay = Math.max(pageOperators * delayPerOperator, 2000); // Минимальная задержка - 2 секунды

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
