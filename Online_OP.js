// ==UserScript==
// @name         Онлайн ОП для всех категорий
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Быстрый парсинг уникальных пользователей с "Online" статусом на LeadVertex
// @author       ReRu (@Ruslan_Intertrade)
// @match        https://leadvertex.ru/admin.html?category=*
// @grant        GM_xmlhttpRequest
// @connect      leadvertex.ru
// @updateURL    https://raw.githubusercontent.com/ReRu4/LeadVertex/main/Online_OP.js
// @downloadURL  https://raw.githubusercontent.com/ReRu4/LeadVertex/main/Online_OP.js
// ==/UserScript==

(function () {
    'use strict';

    const MAX_CONCURRENT_REQUESTS = 20; // Максимальное количество параллельных запросов
    const onlineOperators = new Set(); // Для хранения уникальных логинов операторов

    // Функция для загрузки страницы через GM_xmlhttpRequest
    function fetchPage(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: (response) => resolve(response.responseText),
                onerror: (error) => reject(error),
            });
        });
    }

    // Получение списка проектов
    async function fetchProjects() {
        const currentUrl = window.location.href;
        const categoryMatch = currentUrl.match(/category=(\d+)/);
        const category = categoryMatch ? categoryMatch[1] : null;

        if (!category) {
            console.error('Категория не найдена в URL');
            return [];
        }

        const html = await fetchPage(`https://leadvertex.ru/admin.html?category=${category}`);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        return Array.from(
            doc.querySelectorAll(`tr[data-grid="offers-grid-${category}"] a[title="Панель управления проектом"]`)
        ).map((link) => link.href.replace('/admin.html', '/admin/operator/list.html'));
    }

    // Парсинг операторов на одной странице
    async function parseOperatorsFromPage(projectUrl, page) {
        const url = `${projectUrl}?Operator2offer_page=${page}`;
        const html = await fetchPage(url);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const operators = [];
        const rows = doc.querySelectorAll('tr');

        rows.forEach((row) => {
            const onlineIndicator = row.querySelector('.lv-is-online[title="Online"]'); // Проверка на статус Online
            if (onlineIndicator) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) {
                    const userNameCell = cells[3];
                    const userName = userNameCell ? userNameCell.textContent.trim().split(" ")[0] : 'Unknown User';

                    if (!onlineOperators.has(userName)) {
                        onlineOperators.add(userName);
                        operators.push(userName);
                    }
                }
            }
        });

        return operators;
    }

    // Парсинг всех страниц одного проекта
    async function fetchOperatorsFromProject(projectUrl) {
        let page = 1;
        const projectOperators = [];

        while (true) {
            const operators = await parseOperatorsFromPage(projectUrl, page);
            if (operators.length === 0) break;

            projectOperators.push(...operators);
            page++;
        }

        return projectOperators;
    }

    // Ограничение количества параллельных запросов
    async function parallelLimit(tasks, limit) {
        const results = [];
        const executing = new Set();

        for (const task of tasks) {
            const promise = task().then((result) => {
                executing.delete(promise);
                return result;
            });
            results.push(promise);
            executing.add(promise);

            if (executing.size >= limit) {
                await Promise.race(executing);
            }
        }

        return Promise.all(results);
    }

    // Отображение результатов
    function displayPopup(results) {
        const existingPopup = document.getElementById('online-users-popup');
        if (existingPopup) existingPopup.remove();

        const popup = document.createElement('div');
        popup.id = 'online-users-popup';
        popup.style.position = 'fixed';
        popup.style.top = '10px';
        popup.style.right = '10px';
        popup.style.width = '400px';
        popup.style.maxHeight = '400px';
        popup.style.overflowY = 'auto';
        popup.style.backgroundColor = 'white';
        popup.style.border = '1px solid #ccc';
        popup.style.borderRadius = '8px';
        popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        popup.style.padding = '16px';
        popup.style.zIndex = '10000';

        const title = document.createElement('h3');
        title.textContent = 'Онлайн ОП';
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '16px';
        title.style.color = '#333';
        popup.appendChild(title);

        const userList = document.createElement('div');
        results.forEach((userName) => {
            const userDiv = document.createElement('div');
            userDiv.style.marginBottom = '10px';

            const userNameDiv = document.createElement('div');
            userNameDiv.textContent = `${userName}`;
            userNameDiv.style.fontWeight = 'bold';

            userDiv.appendChild(userNameDiv);
            userList.appendChild(userDiv);
        });

        popup.appendChild(userList);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Закрыть';
        closeButton.style.marginTop = '10px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.backgroundColor = '#007BFF';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => popup.remove());
        popup.appendChild(closeButton);

        document.body.appendChild(popup);
    }

    // Анимация загрузки
    function showLoadingAnimation() {
        const loadingPopup = document.createElement('div');
        loadingPopup.id = 'loading-popup';
        loadingPopup.style.position = 'fixed';
        loadingPopup.style.top = '50%';
        loadingPopup.style.left = '50%';
        loadingPopup.style.transform = 'translate(-50%, -50%)';
        loadingPopup.style.padding = '20px';
        loadingPopup.style.backgroundColor = 'white';
        loadingPopup.style.border = '1px solid #ccc';
        loadingPopup.style.borderRadius = '8px';
        loadingPopup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        loadingPopup.style.textAlign = 'center';
        loadingPopup.style.zIndex = '10000';

        let dots = 0;
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Выполняется';
        loadingPopup.appendChild(loadingText);

        const interval = setInterval(() => {
            dots = (dots + 1) % 4;
            loadingText.textContent = 'Выполняется' + '.'.repeat(dots);
        }, 500);

        document.body.appendChild(loadingPopup);

        return () => {
            clearInterval(interval);
            loadingPopup.remove();
        };
    }

    // Главная функция
    async function parseAllOperators() {
        const hideLoading = showLoadingAnimation();

        try {
            const projectUrls = await fetchProjects();

            const allOperators = await parallelLimit(
                projectUrls.map((url) => () => fetchOperatorsFromProject(url)),
                MAX_CONCURRENT_REQUESTS
            );

            displayPopup(allOperators.flat());
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
        } finally {
            hideLoading();
        }
    }

    // Создание кнопки для запуска
    function createRunButton() {
        const button = document.createElement('button');
        button.textContent = 'Запустить парсинг';
        button.style.position = 'fixed';
        button.style.bottom = '10px';
        button.style.right = '10px';
        button.style.padding = '10px 20px';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.backgroundColor = '#28a745';
        button.style.color = 'white';
        button.style.cursor = 'pointer';
        button.style.zIndex = '10000';
        button.addEventListener('click', parseAllOperators);

        document.body.appendChild(button);
    }

    // Добавление кнопки на страницу
    createRunButton();
})();
