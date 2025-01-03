// ==UserScript==
// @name         Отчёт с таблицей и текстом
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Save table as an image to clipboard and generate formatted reports
// @author       ReRu (@Ruslan_Intertrade)
// @match        https://leadvertex.ru/admin/callmodeNew/settings.html*
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @updateURL    https://raw.githubusercontent.com/ReRu4/LeadVertex/main/Report_script.js
// @downloadURL  https://raw.githubusercontent.com/ReRu4/LeadVertex/main/Report_script.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const screenshotButton = document.createElement('button');
    screenshotButton.textContent = 'Сохранить таблицу в буфер';
    screenshotButton.style.position = 'fixed';
    screenshotButton.style.top = '10px';
    screenshotButton.style.right = '10px';
    screenshotButton.style.zIndex = '9999';
    screenshotButton.style.padding = '10px';
    screenshotButton.style.backgroundColor = '#007bff';
    screenshotButton.style.color = '#fff';
    screenshotButton.style.border = 'none';
    screenshotButton.style.borderRadius = '5px';
    screenshotButton.style.cursor = 'pointer';

    document.body.appendChild(screenshotButton);

    screenshotButton.addEventListener('click', async () => {
        try {
            const table = document.querySelector('.table.callmode-settings');
            if (!table) {
                alert('Таблица не найдена!');
                return;
            }

            const canvas = await html2canvas(table);
            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        alert('Таблица сохранена в буфер обмена как изображение!');
                    } catch (error) {
                        console.error('Ошибка записи в буфер обмена:', error);
                        alert('Не удалось сохранить в буфер обмена. Проверьте разрешения.');
                    }
                }
            });
        } catch (error) {
            console.error('Ошибка при сохранении таблицы:', error);
            alert('Произошла ошибка! Проверьте консоль для деталей.');
        }
    });

    const copyReportButton = document.createElement('button');
    copyReportButton.textContent = 'Копировать отчёт';
    copyReportButton.style.position = 'fixed';
    copyReportButton.style.top = '50px';
    copyReportButton.style.right = '10px';
    copyReportButton.style.zIndex = '9999';
    copyReportButton.style.padding = '10px';
    copyReportButton.style.backgroundColor = '#28a745';
    copyReportButton.style.color = '#fff';
    copyReportButton.style.border = 'none';
    copyReportButton.style.borderRadius = '5px';
    copyReportButton.style.cursor = 'pointer';

    document.body.appendChild(copyReportButton);

    copyReportButton.addEventListener('click', () => {
        const reportContainer = document.querySelector('div[style*="white-space: pre-line"]');
        if (!reportContainer) {
            alert('Отчёт не найден!');
            return;
        }

        const reportText = reportContainer.textContent;
        navigator.clipboard.writeText(reportText).then(() => {
            alert('Отчёт скопирован в буфер обмена!');
        }).catch(error => {
            console.error('Ошибка копирования в буфер обмена:', error);
            alert('Не удалось скопировать отчёт. Проверьте разрешения.');
        });
    });

    const tfootRowSelector = 'tfoot tr';

    const categoryHeaders = {
        6: '#заказы_в_работе_Алжир',
        5: '#заказы_в_работе_Ангола',
    };

    function extractDataFromTfoot() {
        const row = document.querySelector(tfootRowSelector);
        if (!row) {
            console.error('Row not found in <tfoot>!');
            return null;
        }

        const cells = row.querySelectorAll('td');
        const data = Array.from(cells).map(cell => cell.textContent.trim());
        return data;
    }

    function processTfootData(data) {
        return {
            processing: [data[2], data[3], data[4]].map(Number),
            '1_day': [data[11], data[12], data[13]].map(Number),
            '2_5_days': [data[14], data[15], data[16]].map(Number),
        };
    }

    function getHeader() {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        return categoryHeaders[category] || '#заказы_в_работе_Неизвестно';
    }

    function displayFormattedReport(reportData, header) {
        const container = document.createElement('div');
        container.style.border = '1px solid black';
        container.style.margin = '10px';
        container.style.padding = '10px';
        container.style.backgroundColor = '#f9f9f9';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.whiteSpace = 'pre-line';

        container.textContent = `
${header}

обработка -  ${reportData.processing.join(' ')}
1 день -   ${reportData['1_day'].join('  ')}
2-5 день - ${reportData['2_5_days'].join('  ')}
        `.trim();

        document.body.prepend(container);
    }

    window.addEventListener('load', () => {
        const extractedData = extractDataFromTfoot();
        if (!extractedData) return;

        const reportData = processTfootData(extractedData);
        const header = getHeader();
        displayFormattedReport(reportData, header);
    });
})();
