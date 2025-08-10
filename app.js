// 考試應用程式主要邏輯
class ExamApp {
    constructor() {
        // 考試題目數據 - 使用外部 JSON 文件
        this.questions = [];
        this.originalQuestions = []; // 保存原始題目順序

        // 應用程式狀態
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.isExamCompleted = false;
        this.examStartTime = null;
        this.examEndTime = null;
        this.isLoading = false;

        // 配置選項
        this.config = {
            shuffleQuestions: false, // 是否隨機打亂題目順序
            shuffleOptions: false,   // 是否隨機打亂選項順序
            autoSave: true,          // 是否自動保存進度
            showExplanation: true,   // 是否顯示答案解釋
            passingScore: 60         // 及格分數
        };

        this.selectedQuestionBank = 'IPAS-AI-L11-A.json'; // 預設題庫

        // 載入題目數據並初始化
        this.loadQuestions().then(() => {
            this.init();
        });
    } async loadQuestions(forceReload = false) {
        this.isLoading = true;
        this.showLoadingState(true);
        try {
            let response;
            let questions = [];
            // 根據選擇的題庫載入
            // 使用相對於目前頁面的URL路徑，確保在GitHub Pages等環境中也能正確載入
            const baseUrl = window.location.href.split('/').slice(0, -1).join('/') + '/';
            const questionBankUrl = new URL(this.selectedQuestionBank, baseUrl).href;
            console.log(`嘗試從 ${questionBankUrl} 載入題庫`);

            response = await fetch(questionBankUrl);
            if (response.ok) {
                questions = await response.json();
                console.log(`從 ${this.selectedQuestionBank} 載入 ${questions.length} 題`);
            } else {
                throw new Error('題庫載入失敗');
            }

            // 驗證和標準化題目格式
            this.questions = this.validateAndNormalizeQuestions(questions);
            this.originalQuestions = [...this.questions];
            if (!forceReload) this.loadSavedProgress();
        } catch (error) {
            console.error('載入題目失敗:', error);
            this.handleLoadError();
        } finally {
            this.isLoading = false;
            this.showLoadingState(false);
        }
    }

    validateAndNormalizeQuestions(rawQuestions) {
        return rawQuestions.map((q, index) => {
            // 確定題目類型
            let type = q.type ? q.type.toString().toLowerCase() : 'single';

            // 如果是簡答題相關的類型（以小寫比對），最後標準化為 'SAQ'
            if (["saq", "sqa", "short"].includes(type)) {
                type = 'SAQ';
            } else {
                // 如果沒有明確指定，但也沒有選項，視為簡答題
                type = (Array.isArray(q.options) && q.options.length > 0) ? 'single' : 'SAQ';
            }

            // 針對只有 explanation 屬性的題目，使用 explanation 作為題目內容
            let questionText = q.question || '';
            if (!questionText && q.explanation) {
                questionText = `${q.explanation.substring(0, 100)}${q.explanation.length > 100 ? '...' : ''}`;
            }

            const question = {
                id: q.id || (index + 1),
                question: questionText || `題目 ${index + 1}`,
                options: Array.isArray(q.options) ? q.options : [],
                answer: q.answer || '',
                explanation: q.explanation || '',
                type: type
            };

            // 單選題選項修正 (只處理單選題)
            if (question.type === 'single') {
                if (question.options.length === 0 || !Array.isArray(question.options)) {
                    // 創建基本的選項，如果題目有答案（如：A, B, C, D），使用它來標示正確選項
                    const correctOption = question.answer ? question.answer.toUpperCase() : '';
                    question.options = ['A', 'B', 'C', 'D'].map(letter => {
                        if (letter === correctOption) {
                            return `${letter}. 正確選項`;
                        }
                        return `${letter}. 選項${letter}`;
                    });
                }
                question.options = question.options.map((option, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    if (!option.startsWith(`${letter}.`)) {
                        return `${letter}. ${option.replace(/^[A-D]\.?\s*/, '')}`;
                    }
                    return option;
                });
            }

            return question;
            // 確保所有題目都被加載，無論其結構如何
        }).filter(q => q.id != null);
    }

    handleLoadError() {
        console.error('題庫載入失敗，嘗試備用內容');

        // 記錄更詳細的資訊以幫助診斷問題
        console.log('目前題庫:', this.selectedQuestionBank);
        console.log('頁面位置:', window.location.href);

        this.questions = [{
            "id": 1,
            "question": "題目載入失敗，請檢查網路連接並重新整理頁面。",
            "options": ["A. 重新整理頁面", "B. 檢查網路連接", "C. 聯繫技術支援", "D. 稍後再試"],
            "answer": "A",
            "explanation": "請檢查網路連接或重新載入頁面"
        }];

        // 顯示錯誤訊息
        this.showErrorMessage(`題目載入失敗 (${this.selectedQuestionBank})，請重新整理頁面重試。`);
    }

    showLoadingState(show) {
        const startBtn = document.getElementById('start-exam-btn');
        if (show) {
            startBtn.textContent = '載入中...';
            startBtn.disabled = true;
        } else {
            startBtn.textContent = '開始考試';
            startBtn.disabled = false;
        }
    }

    showErrorMessage(message) {
        // 創建錯誤訊息元素
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: var(--color-error);
            color: white;
            padding: 12px 16px;
            border-radius: var(--radius-md);
            margin: 16px 0;
            text-align: center;
        `;
        errorDiv.textContent = message;

        const examInfo = document.querySelector('.exam-info');
        examInfo.parentNode.insertBefore(errorDiv, examInfo);
    }
    init() {
        // 載入用戶配置和設定事件綁定
        this.loadConfig();
        this.bindEvents();
        this.setupConfigPanel();
        this.setupQuestionBankSelect(); // 初始化題庫選擇事件
        this.showPage('home');
        this.updateExamInfo();

        // 輸出初始化完成的訊息
        console.log('考試系統初始化完成');
        console.log('當前題庫:', this.selectedQuestionBank);
        console.log('題目數量:', this.questions.length);
    }

    setupQuestionBankSelect() {
        const select = document.getElementById('question-bank-select');
        if (select) {
            // 確保選擇器值與當前選擇的題庫匹配
            if (this.selectedQuestionBank) {
                // 尋找包含相同檔名的選項
                const options = Array.from(select.options);
                const matchingOption = options.find(opt =>
                    opt.value === this.selectedQuestionBank ||
                    opt.value.includes(this.selectedQuestionBank.split('/').pop())
                );

                if (matchingOption) {
                    select.value = matchingOption.value;
                } else {
                    select.value = select.options[0].value;
                    this.selectedQuestionBank = select.value;
                }
            }

            select.onchange = (e) => {
                const previousQuestionBank = this.selectedQuestionBank;
                this.selectedQuestionBank = e.target.value;
                console.log(`切換題庫：從 ${previousQuestionBank} 到 ${this.selectedQuestionBank}`);

                this.clearSavedProgress();
                this.loadQuestions(true).then(() => {
                    this.currentQuestionIndex = 0;
                    this.userAnswers = {};
                    this.isExamCompleted = false;
                    this.examStartTime = null;
                    this.examEndTime = null;
                    this.showPage('home');
                    this.updateExamInfo(); // 更新考試資訊
                });
            };
        } else {
            console.error('找不到題庫選擇元素 (question-bank-select)');
        }
    }

    setupConfigPanel() {
        // 先移除舊的 config-panel（避免重複）
        const oldPanel = document.querySelector('.config-panel');
        if (oldPanel) oldPanel.remove();

        // 創建配置面板
        const configPanel = document.createElement('div');
        configPanel.className = 'config-panel card';
        configPanel.innerHTML = `
            <div class="card__body">
                <h4>考試設定</h4>
                <div class="config-options">
                    <label class="config-option">
                        <input type="checkbox" id="shuffle-questions" ${this.config.shuffleQuestions ? 'checked' : ''}>
                        <span>隨機題目順序</span>
                    </label>
                    <label class="config-option">
                        <input type="checkbox" id="shuffle-options" ${this.config.shuffleOptions ? 'checked' : ''}>
                        <span>隨機選項順序</span>
                    </label>
                    <label class="config-option">
                        <input type="checkbox" id="show-explanation" ${this.config.showExplanation ? 'checked' : ''}>
                        <span>顯示答案解釋</span>
                    </label>
                    <label class="config-option" for="passing-score">
                        <span style="min-width: 88px; display:inline-block;">及格分數</span>
                        <input type="number" id="passing-score" min="0" max="100" value="${this.config.passingScore}" class="form-control" style="max-width:100px;">
                    </label>
                </div>
            </div>
        `;

        const examInfo = document.querySelector('.exam-info');
        examInfo.parentNode.insertBefore(configPanel, examInfo);

        // 綁定配置事件
        document.getElementById('shuffle-questions').addEventListener('change', (e) => {
            this.config.shuffleQuestions = e.target.checked;
            this.saveConfig();
        });

        const shuffleOptionsEl = document.getElementById('shuffle-options');
        if (shuffleOptionsEl) {
            shuffleOptionsEl.addEventListener('change', (e) => {
                this.config.shuffleOptions = e.target.checked;
                this.saveConfig();
            });
        }

        document.getElementById('show-explanation').addEventListener('change', (e) => {
            this.config.showExplanation = e.target.checked;
            this.saveConfig();
        });

        const passingEl = document.getElementById('passing-score');
        if (passingEl) {
            passingEl.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                const safe = isNaN(val) ? 60 : Math.min(100, Math.max(0, val));
                this.config.passingScore = safe;
                e.target.value = safe;
                this.saveConfig();
            });
        }

        // 載入保存的配置
        this.loadConfig();
    }

    updateExamInfo() {
        const totalQuestions = this.questions.length;
        document.getElementById('total-questions').textContent = totalQuestions;

        // 更新考試說明中的題目數量
        const examDetails = document.querySelector('.exam-details');
        if (examDetails) {
            const firstLi = examDetails.querySelector('li');
            if (firstLi) {
                firstLi.innerHTML = `<strong>題目數量：</strong>${totalQuestions} 題`;
            }
        }
    }
    bindEvents() {
        // 開始考試按鈕
        document.getElementById('start-exam-btn').addEventListener('click', () => {
            this.startExam();
        });

        // 導航按鈕
        document.getElementById('prev-btn').addEventListener('click', () => {
            this.previousQuestion();
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextQuestion();
        });

        // 提交考試按鈕
        document.getElementById('submit-btn').addEventListener('click', () => {
            this.submitExam();
        });
        // 重新考試按鈕
        document.getElementById('restart-exam-btn').addEventListener('click', () => {
            this.restartExam();
        });

        // 歷史記錄按鈕
        document.getElementById('history-btn').addEventListener('click', () => {
            // 在顯示歷史記錄前，先清除所有已存在的 modal
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            });
            this.showExamHistory();
        });

        // 匯出結果按鈕（結果頁）
        const exportJsonBtn = document.getElementById('export-json-btn');
        const exportCsvBtn = document.getElementById('export-csv-btn');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => this.exportResults('json'));
        }
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportResults('csv'));
        }

        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            // 如果在文字輸入區域中，不要觸發快捷鍵
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
                return;
            }

            if (document.getElementById('exam-page').classList.contains('active')) {
                const currentQuestion = this.questions[this.currentQuestionIndex];
                // 單選題才使用數字鍵快捷鍵
                const isMultipleChoice = currentQuestion && currentQuestion.type === 'single';

                switch (e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.previousQuestion();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextQuestion();
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (this.currentQuestionIndex === this.questions.length - 1) {
                            this.submitExam();
                        } else {
                            this.nextQuestion();
                        }
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                        if (isMultipleChoice) {
                            e.preventDefault();
                            this.selectOptionByNumber(parseInt(e.key) - 1);
                        }
                        break;
                }
            } else if (document.getElementById('result-page').classList.contains('active')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.restartExam();
                }
            }
        });

        // 定期自動保存
        if (this.config.autoSave) {
            setInterval(() => {
                if (!this.isExamCompleted && Object.keys(this.userAnswers).length > 0) {
                    this.saveProgress();
                }
            }, 30000); // 每30秒自動保存
        }

        // 頁面關閉前警告
        window.addEventListener('beforeunload', (e) => {
            if (!this.isExamCompleted && Object.keys(this.userAnswers).length > 0) {
                e.preventDefault();
                e.returnValue = '您的考試進度可能會丟失，確定要離開嗎？';
                return e.returnValue;
            }
        });
    }

    showPage(pageId) {
        // 隱藏所有頁面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // 顯示指定頁面
        document.getElementById(`${pageId}-page`).classList.add('active');
    }
    startExam() {
        // 準備題目
        this.questions = [...this.originalQuestions];

        // 如果啟用隨機順序，打亂題目
        if (this.config.shuffleQuestions) {
            this.shuffleArray(this.questions);
        }

        // 如果啟用隨機選項，為每題單選題打亂選項並重新標註 A-D，同步更新正確答案字母
        if (this.config.shuffleOptions) {
            this.questions.forEach(q => {
                if (q && q.type === 'single' && Array.isArray(q.options) && q.options.length > 0) {
                    this.shuffleQuestionOptions(q);
                }
            });
        }

        // 重置狀態
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.isExamCompleted = false;
        this.examStartTime = new Date();

        // 清除之前保存的進度
        this.clearSavedProgress();

        this.showPage('exam');
        this.displayQuestion();
        this.updateProgress();
        this.updateNavigation();
        this.updateAnswerStatus();
        this.renderQuestionGrid();
        this.startTimer();
    }

    // 單題目：打亂選項並重新標註 A-D，同步調整正確答案字母
    shuffleQuestionOptions(question) {
        try {
            const currentAnswer = (question.answer || '').toString().trim().toUpperCase();
            // 將選項標準化為 { text, isCorrect }
            const optionObjs = (question.options || []).map(opt => {
                const text = (opt || '').toString();
                const letter = text.trim().charAt(0).toUpperCase();
                const cleanText = text.replace(/^[A-D]\.?\s*/, '').trim();
                return {
                    text: cleanText,
                    isCorrect: letter === currentAnswer
                };
            });

            if (optionObjs.length === 0) return; // 無選項不處理

            // 打亂
            this.shuffleArray(optionObjs);

            // 重新標註與回填正確答案
            question.options = optionObjs.map((o, idx) => {
                const newLetter = String.fromCharCode(65 + idx); // A, B, C, ...
                if (o.isCorrect) {
                    question.answer = newLetter;
                }
                return `${newLetter}. ${o.text}`;
            });
        } catch (e) {
            console.warn('隨機選項順序時發生問題，已跳過該題：', e);
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    startTimer() {
        // 先移除所有舊的 exam-timer，避免重複
        document.querySelectorAll('.exam-timer').forEach(el => el.remove());
        const timerElement = this.createTimerElement();
        document.querySelector('.exam-header .progress-info').appendChild(timerElement);

        this.timerInterval = setInterval(() => {
            const elapsed = new Date() - this.examStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);

            const timerDisplay = document.getElementById('exam-timer');
            if (timerDisplay) {
                timerDisplay.textContent = `考試時間：${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    createTimerElement() {
        const timerDiv = document.createElement('div');
        timerDiv.className = 'exam-timer';
        timerDiv.innerHTML = '<div id="exam-timer">考試時間：00:00</div>';
        return timerDiv;
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    displayQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        if (!question) return;

        console.log(`顯示題目 #${this.currentQuestionIndex + 1}, 類型:`, question.type);

        // 更新題目編號和內容
        document.getElementById('question-number').textContent = this.currentQuestionIndex + 1;
        document.getElementById('question-text').textContent = question.question;

        // 更新總題數
        document.getElementById('total-questions').textContent = this.questions.length;
        document.getElementById('current-question').textContent = this.currentQuestionIndex + 1;

        // 更新題目類型標籤
        const questionCard = document.querySelector('.question-card');
        if (questionCard) {
            // 移除現有類型標籤
            questionCard.classList.remove('question-single', 'question-saq');
            // 添加當前題型標籤
            questionCard.classList.add(question.type === 'SAQ' ? 'question-saq' : 'question-single');

            // 找到或創建題型標籤
            let typeLabel = document.querySelector('.question-type-label');
            if (!typeLabel) {
                typeLabel = document.createElement('div');
                typeLabel.className = 'question-type-label';
                const questionNumber = document.querySelector('.question-number');
                if (questionNumber && questionNumber.parentNode) {
                    questionNumber.parentNode.insertBefore(typeLabel, questionNumber.nextSibling);
                }
            }
            typeLabel.textContent = question.type === 'SAQ' ? '簡答題' : '單選題';
            typeLabel.className = `question-type-label ${question.type === 'SAQ' ? 'saq' : 'single'}`;
        }

        // 清除舊選項
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';

        // 根據題目類型顯示不同的作答介面
        if (question.type === 'SAQ') {
            // 簡答題顯示文字輸入框
            const inputDiv = document.createElement('div');
            inputDiv.className = 'SAQ-answer-container';
            inputDiv.innerHTML = `
                <label for="SAQ-answer-input" class="form-label">請輸入您的答案：</label>
                <textarea id="SAQ-answer-input" class="form-control" rows="4" style="width:100%; margin-top:10px;">${this.userAnswers[question.id] || ''}</textarea>
            `;
            optionsContainer.appendChild(inputDiv);
            // 綁定輸入事件
            const input = inputDiv.querySelector('textarea');
            const debounced = this._debounce((val) => {
                this.userAnswers[question.id] = val;
                if (this.config.autoSave) this.saveProgress();
                this.updateAnswerStatus();
            }, 400);
            input.addEventListener('input', (e) => debounced(e.target.value));

            // 確保文本區域自動獲得焦點
            setTimeout(() => {
                input.focus();
            }, 100);
        } else if (question.type === 'single') {
            question.options.forEach((optionText, index) => {
                const optionElement = this.createOptionElement(optionText, index, question.id);
                optionsContainer.appendChild(optionElement);
            });
            // 如果用戶已經選擇過答案，恢復選擇狀態
            if (this.userAnswers[question.id]) {
                const selectedOption = optionsContainer.querySelector(`input[value="${this.userAnswers[question.id]}"]`);
                if (selectedOption) {
                    selectedOption.checked = true;
                    selectedOption.closest('.option').classList.add('selected');
                }
            }
        }
    }

    createOptionElement(optionText, index, questionId) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';

        const optionValue = optionText.charAt(0); // A, B, C, D

        optionDiv.innerHTML = `
            <input type="radio" 
                   class="option-radio" 
                   name="question-${questionId}" 
                   value="${optionValue}" 
                   id="option-${questionId}-${index}">
            <label for="option-${questionId}-${index}" class="option-text">
                ${optionText}
            </label>
        `;

        // 添加點擊事件
        optionDiv.addEventListener('click', () => {
            const radioInput = optionDiv.querySelector('input[type="radio"]');
            radioInput.checked = true;
            this.selectOption(questionId, optionValue, optionDiv);
        });

        return optionDiv;
    }
    selectOption(questionId, optionValue, optionElement) {
        // 移除同組其他選項的選中狀態
        document.querySelectorAll(`input[name="question-${questionId}"]`).forEach(input => {
            input.closest('.option').classList.remove('selected');
        });

        // 添加當前選項的選中狀態
        optionElement.classList.add('selected');

        // 保存用戶選擇
        this.userAnswers[questionId] = optionValue;

        // 自動保存進度
        if (this.config.autoSave) {
            this.saveProgress();
        }

        // 更新導航狀態
        this.updateNavigation();
        this.updateAnswerStatus();

        // 添加視覺反饋
        optionElement.style.transform = 'scale(1.02)';
        setTimeout(() => {
            optionElement.style.transform = '';
        }, 200);
    }

    // 更新「已答 / 未答」統計
    updateAnswerStatus() {
        try {
            const total = this.questions.length;
            const answered = this.questions.reduce((acc, q) => {
                const v = this.userAnswers[q.id];
                if (q.type === 'SAQ') {
                    return acc + (v && v.toString().trim() !== '' ? 1 : 0);
                }
                return acc + (v ? 1 : 0);
            }, 0);
            const unanswered = Math.max(0, total - answered);

            const answeredEl = document.getElementById('answered-count');
            const unansweredEl = document.getElementById('unanswered-count');
            if (answeredEl) answeredEl.textContent = answered;
            if (unansweredEl) unansweredEl.textContent = unanswered;
        } catch (e) {
            // 忽略 UI 缺失
        }
    }

    updateProgress() {
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        progressFill.style.width = `${progressPercentage}%`;
    }

    updateNavigation() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        // 更新上一題按鈕
        prevBtn.disabled = this.currentQuestionIndex === 0;

        // 更新下一題/提交按鈕
        if (this.currentQuestionIndex === this.questions.length - 1) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }

        // 同步更新題號網格高亮
        this.updateQuestionGridHighlight();
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
            this.updateProgress();
            this.updateNavigation();
            this.updateQuestionGridHighlight();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
            this.updateProgress();
            this.updateNavigation();
            this.updateQuestionGridHighlight();
        }
    }

    // 題號按鈕網格：渲染
    renderQuestionGrid() {
        const grid = document.getElementById('question-grid');
        if (!grid) return;
        grid.innerHTML = '';

        this.questions.forEach((q, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'question-grid__btn';
            btn.textContent = (idx + 1).toString();
            btn.setAttribute('aria-label', `第 ${idx + 1} 題`);
            btn.addEventListener('click', () => {
                this.currentQuestionIndex = idx;
                this.displayQuestion();
                this.updateProgress();
                this.updateNavigation();
                this.updateAnswerStatus();
                this.updateQuestionGridHighlight();
            });
            grid.appendChild(btn);
        });

        this.updateQuestionGridHighlight();
    }

    // 題號按鈕網格：更新高亮與已答/未答標示
    updateQuestionGridHighlight() {
        const grid = document.getElementById('question-grid');
        if (!grid) return;
        const buttons = Array.from(grid.querySelectorAll('.question-grid__btn'));
        buttons.forEach((btn, idx) => {
            btn.classList.remove('question-grid__btn--current', 'question-grid__btn--answered', 'question-grid__btn--unanswered');
            if (idx === this.currentQuestionIndex) {
                btn.classList.add('question-grid__btn--current');
            }
            const q = this.questions[idx];
            const v = this.userAnswers[q.id];
            const answered = q.type === 'SAQ' ? (v && v.toString().trim() !== '') : !!v;
            btn.classList.add(answered ? 'question-grid__btn--answered' : 'question-grid__btn--unanswered');
        });
    }
    submitExam() {
        // 防呆鎖，避免重複觸發
        if (this._isSubmitting) return;
        this._isSubmitting = true;
        setTimeout(() => { this._isSubmitting = false; }, 1000);
        // 檢查是否所有題目都已回答
        const unansweredQuestions = this.questions.filter(q => !this.userAnswers[q.id]);

        if (unansweredQuestions.length > 0) {
            const confirmSubmit = confirm(`您還有 ${unansweredQuestions.length} 題未回答，確定要提交考試嗎？未回答的題目將視為錯誤。`);
            if (!confirmSubmit) return;
        }

        this.examEndTime = new Date();
        this.isExamCompleted = true;
        this.stopTimer();

        // 清除自動保存的進度
        this.clearSavedProgress();

        this.calculateResults();
        this.showPage('result');

        // 保存考試記錄
        this.saveExamRecord();
    }
    calculateResults() {
        let correctCount = 0;
        const totalCount = this.questions.length;
        const examDuration = this.examEndTime - this.examStartTime;
        const wrongAnswers = [];
        this.questions.forEach(question => {
            const userAnswer = this.userAnswers[question.id];
            if (question.type === 'single') {
                if (userAnswer === question.answer) {
                    correctCount++;
                } else {
                    wrongAnswers.push({ question, userAnswer: userAnswer || '未作答', correctAnswer: question.answer });
                }
            } else if (question.type === 'SAQ') {
                // 簡答題自動比對（進行更靈活的比對，考慮空格和大小寫）
                const userAns = userAnswer ? userAnswer.trim().toLowerCase() : '';
                const correctAns = typeof question.answer === 'string' ? question.answer.trim().toLowerCase() : '';

                if (userAns && correctAns && userAns === correctAns) {
                    correctCount++;
                } else {
                    wrongAnswers.push({ question, userAnswer: userAnswer || '未作答', correctAnswer: question.answer });
                }
            }
        });
        const score = Math.round((correctCount / totalCount) * 100);
        const accuracy = Math.round((correctCount / totalCount) * 100);
        const isPassed = score >= this.config.passingScore;

        // 格式化考試時長
        const durationMinutes = Math.floor(examDuration / 60000);
        const durationSeconds = Math.floor((examDuration % 60000) / 1000);
        const durationText = `${durationMinutes}分${durationSeconds}秒`;

        // 更新結果顯示
        document.getElementById('final-score').textContent = score;
        document.getElementById('correct-count').textContent = correctCount;
        document.getElementById('total-count').textContent = totalCount;
        document.getElementById('accuracy-rate').textContent = `${accuracy}%`;

        // 添加考試時長顯示
        const scoreDetails = document.querySelector('.score-details');
        let durationElement = document.getElementById('exam-duration');
        if (!durationElement) {
            durationElement = document.createElement('div');
            durationElement.id = 'exam-duration';
            durationElement.className = 'score-item';
            scoreDetails.appendChild(durationElement);
        }
        durationElement.innerHTML = `<span>考試時長：</span><span>${durationText}</span>`;

        const statusElement = document.getElementById('exam-status');
        statusElement.textContent = isPassed ? '通過' : '未通過';
        statusElement.className = `status ${isPassed ? 'status--success' : 'status--error'}`;

        // 生成詳細的答題回顧
        this.generateReview();

        // 生成統計分析
        this.generateAnalysis(wrongAnswers, examDuration);

        // 保存結果數據供後續分析
        this.lastExamResult = {
            score,
            correctCount,
            totalCount,
            isPassed,
            duration: examDuration,
            wrongAnswers
        };
    }

    // 匯出結果（JSON/CSV）
    exportResults(format = 'json') {
        if (!this.isExamCompleted) {
            alert('請先完成考試再匯出結果');
            return;
        }

        const bankInfo = this._getSelectedBankInfo();
        const startedAt = this.examStartTime ? new Date(this.examStartTime) : null;
        const endedAt = this.examEndTime ? new Date(this.examEndTime) : null;

        const durationSec = this.lastExamResult?.duration ? Math.round(this.lastExamResult.duration / 1000) : 0;
        const meta = {
            bankFile: bankInfo.value,
            bankLabel: bankInfo.label,
            score: this.lastExamResult.score,
            accuracy: Math.round((this.lastExamResult.correctCount / this.lastExamResult.totalCount) * 100),
            correctCount: this.lastExamResult.correctCount,
            totalCount: this.lastExamResult.totalCount,
            passingScore: this.config.passingScore,
            isPassed: this.lastExamResult.isPassed,
            durationSeconds: durationSec,
            startedAt: startedAt ? startedAt.toISOString() : '',
            endedAt: endedAt ? endedAt.toISOString() : '',
            exportedAt: new Date().toISOString()
        };

        // 每題結果
        const perQuestion = this.questions.map((q, idx) => {
            const userAnswer = this.userAnswers[q.id];
            const correct = q.type === 'single'
                ? userAnswer === q.answer
                : (userAnswer && q.answer && userAnswer.toString().trim().toLowerCase() === q.answer.toString().trim().toLowerCase());
            return {
                no: idx + 1,
                id: q.id,
                type: q.type,
                question: q.question,
                userAnswer: userAnswer ?? '',
                correctAnswer: q.answer ?? '',
                isCorrect: !!correct
            };
        });

        const fileBase = `exam_result_${this._slugify(bankInfo.label || bankInfo.value)}_${this._formatDateForFile(new Date())}`;

        if (format === 'json') {
            const data = { meta, questions: perQuestion };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
            this._downloadBlob(blob, `${fileBase}.json`);
        } else {
            // CSV
            const headers = ['no','id','type','question','userAnswer','correctAnswer','isCorrect','score','accuracy','passingScore','bankLabel','exportedAt'];
            const rows = perQuestion.map(r => [
                r.no,
                r.id,
                r.type,
                this._csvEscape(r.question),
                this._csvEscape(r.userAnswer ?? ''),
                this._csvEscape(r.correctAnswer ?? ''),
                r.isCorrect,
                meta.score,
                meta.accuracy,
                meta.passingScore,
                this._csvEscape(meta.bankLabel),
                meta.exportedAt
            ]);
            const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
            // 加入 UTF-8 BOM，避免 Excel 開啟時出現亂碼
            const BOM = '\ufeff';
            const blob = new Blob([BOM, csv], { type: 'text/csv;charset=utf-8' });
            this._downloadBlob(blob, `${fileBase}.csv`);
        }
    }

    _csvEscape(val) {
        const s = (val ?? '').toString();
        if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    _downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    _formatDateForFile(d) {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    }

    _slugify(s) {
        return (s || '').toString().trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]+/g, '');
    }

    generateReview() {
        const reviewContainer = document.getElementById('review-container');
        reviewContainer.innerHTML = '';

        this.questions.forEach((question, index) => {
            const reviewItem = this.createReviewItem(question, index + 1);
            reviewContainer.appendChild(reviewItem);
        });
    } createReviewItem(question, questionNumber) {
        const userAnswer = this.userAnswers[question.id];
        const correctAnswer = question.answer;

        // 判斷答案是否正確，單選題和簡答題使用不同的判斷邏輯
        let isCorrect = false;
        if (question.type === 'single') {
            isCorrect = (userAnswer === correctAnswer);
        } else if (question.type === 'SAQ') {
            const userAns = userAnswer ? userAnswer.trim().toLowerCase() : '';
            const correctAns = typeof correctAnswer === 'string' ? correctAnswer.trim().toLowerCase() : '';
            isCorrect = (userAns && correctAns && userAns === correctAns);
        }

        const reviewDiv = document.createElement('div');
        reviewDiv.className = 'review-item card';

        let displayQuestion = question.question;

        let contentHtml = '';
        if (question.type === 'single') {
            // 選項HTML，標記正確答案和用戶選擇
            const optionsHtml = question.options.map(option => {
                const optionValue = option.charAt(0);
                let className = 'review-answer neutral';
                let indicator = '';

                if (optionValue === correctAnswer) {
                    className = 'review-answer correct';
                    indicator = ' ✓';
                }

                if (optionValue === userAnswer && optionValue !== correctAnswer) {
                    className = 'review-answer incorrect';
                    indicator = ' ✗';
                }

                if (optionValue === userAnswer && optionValue === correctAnswer) {
                    indicator = ' ✓';
                }

                return `<div class="${className}">${option}${indicator}</div>`;
            }).join('');
            contentHtml = `<div class="review-answers">${optionsHtml}</div>`;
        } else if (question.type === 'SAQ') {
            contentHtml = `
                <div class="review-SAQ-answer">
                    <div class="SAQ-answer-item">
                        <strong>您的答案：</strong> 
                        <div class="SAQ-answer-content ${isCorrect ? 'correct' : 'incorrect'}">${userAnswer ? userAnswer : '<span style="color:var(--color-error)">未作答</span>'}</div>
                    </div>
                    <div class="SAQ-answer-item">
                        <strong>標準答案：</strong> 
                        <div class="SAQ-answer-content standard">${correctAnswer || '（無標準答案）'}</div>
                    </div>
                </div>
            `;
        }
        const explanationHtml = question.explanation && this.config.showExplanation ? `
            <div class="review-explanation">
                <strong>解釋：</strong>${question.explanation}
            </div>
        ` : '';
        reviewDiv.innerHTML = `
            <div class="card__body">
                <div class="review-header">
                    <span class="review-question-number">第 ${questionNumber} 題</span>
                    <span class="status ${isCorrect ? 'status--success' : 'status--error'}">
                        ${isCorrect ? '正確' : (userAnswer ? '錯誤' : '未作答')}
                    </span>
                </div>
                <div class="review-content">
                    <div class="review-question">${displayQuestion}</div>
                    ${contentHtml}
                    ${explanationHtml}
                </div>
            </div>
        `;

        return reviewDiv;
    }
    restartExam() {
        // 清除計時器
        this.stopTimer();

        // 重置所有狀態
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.isExamCompleted = false;
        this.examStartTime = null;
        this.examEndTime = null;

        // 清除自動保存的進度
        this.clearSavedProgress();

        // 移除所有計時器元素
        document.querySelectorAll('.exam-timer').forEach(el => el.remove());

        // 移除分析區塊
        const analysisSection = document.querySelector('.analysis-section');
        if (analysisSection) {
            analysisSection.remove();
        }

        // 移除所有 success/error message
        document.querySelectorAll('.success-message, .error-message').forEach(el => el.remove());
        // 移除所有 modal-overlay（歷史紀錄彈窗）
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        this.showPage('home');
    }

    // 本地存儲相關方法
    saveProgress() {
        if (!this.config.autoSave) return;

        const progressData = {
            currentQuestionIndex: this.currentQuestionIndex,
            userAnswers: this.userAnswers,
            examStartTime: this.examStartTime,
            questions: this.questions,
            timestamp: new Date().toISOString()
        };

        try {
            localStorage.setItem('examProgress', JSON.stringify(progressData));
        } catch (error) {
            console.warn('保存進度失敗:', error);
        }
    }

    loadSavedProgress() {
        try {
            const savedData = localStorage.getItem('examProgress');
            if (savedData) {
                const progressData = JSON.parse(savedData);

                // 檢查是否是最近的進度（24小時內）
                const savedTime = new Date(progressData.timestamp);
                const now = new Date();
                const hoursDiff = (now - savedTime) / (1000 * 60 * 60);

                if (hoursDiff < 24 && progressData.userAnswers && Object.keys(progressData.userAnswers).length > 0) {
                    const continueExam = confirm('發現未完成的考試進度，是否繼續之前的考試？');
                    if (continueExam) {
                        this.currentQuestionIndex = progressData.currentQuestionIndex || 0;
                        this.userAnswers = progressData.userAnswers || {};
                        this.examStartTime = new Date(progressData.examStartTime);

                        // 顯示恢復進度的提示
                        this.showSuccessMessage('已恢復之前的考試進度');
                    }
                }
            }
        } catch (error) {
            console.warn('載入保存的進度失敗:', error);
        }
    }

    clearSavedProgress() {
        try {
            localStorage.removeItem('examProgress');
        } catch (error) {
            console.warn('清除保存的進度失敗:', error);
        }
    }

    saveConfig() {
        try {
            localStorage.setItem('examConfig', JSON.stringify(this.config));
        } catch (error) {
            console.warn('保存配置失敗:', error);
        }
    }

    loadConfig() {
        try {
            const savedConfig = localStorage.getItem('examConfig');
            if (savedConfig) {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };

                // 更新UI
                const sqEl = document.getElementById('shuffle-questions');
                if (sqEl) sqEl.checked = this.config.shuffleQuestions;
                const soEl = document.getElementById('shuffle-options');
                if (soEl) soEl.checked = this.config.shuffleOptions;
                const seEl = document.getElementById('show-explanation');
                if (seEl) seEl.checked = this.config.showExplanation;
                const psEl = document.getElementById('passing-score');
                if (psEl) psEl.value = this.config.passingScore;
            }
        } catch (error) {
            console.warn('載入配置失敗:', error);
        }
    }

    // 快捷鍵選擇選項
    selectOptionByNumber(optionIndex) {
        const question = this.questions[this.currentQuestionIndex];
        if (!question || optionIndex >= question.options.length) return;

        const optionValue = String.fromCharCode(65 + optionIndex); // A, B, C, D
    const container = document.getElementById('options-container');
    const optionElement = container ? container.querySelector(`input[value="${optionValue}"]`) : null;

        if (optionElement) {
            optionElement.checked = true;
            optionElement.closest('.option').classList.add('selected');
            this.selectOption(question.id, optionValue, optionElement.closest('.option'));
        }
    }

    // 簡易 debounce 實作
    _debounce(fn, delay = 400) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // 成功訊息顯示
    showSuccessMessage(message) {
        const existingMsg = document.querySelector('.success-message');
        if (existingMsg) {
            existingMsg.remove();
        }

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            background: var(--color-success);
            color: white;
            padding: 12px 16px;
            border-radius: var(--radius-md);
            margin: 16px 0;
            text-align: center;
            animation: fadeIn 0.3s ease-in;
        `;
        successDiv.textContent = message;

        const examInfo = document.querySelector('.exam-info');
        examInfo.parentNode.insertBefore(successDiv, examInfo);

        // 3秒後自動移除
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }

    // 生成統計分析
    generateAnalysis(wrongAnswers, examDuration) {
        // 先移除所有舊的分析區塊，避免重複
        document.querySelectorAll('.analysis-section').forEach(el => el.remove());
        const analysisContainer = this.createAnalysisSection();
        const reviewSection = document.querySelector('.review-section');
        reviewSection.parentNode.insertBefore(analysisContainer, reviewSection);

        // 錯誤分析
        if (wrongAnswers.length > 0) {
            const errorAnalysis = document.createElement('div');
            errorAnalysis.className = 'error-analysis';
            errorAnalysis.innerHTML = `
                <h4>錯誤題目分析</h4>
                <p>共答錯 ${wrongAnswers.length} 題，建議重點複習以下領域：</p>
                <ul class="error-list">
                    ${wrongAnswers.slice(0, 5).map(item => `
                        <li>題目 ${item.question.id}: ${item.question.question.substring(0, 50)}...</li>
                    `).join('')}
                    ${wrongAnswers.length > 5 ? '<li>...以及其他錯誤題目</li>' : ''}
                </ul>
            `;
            analysisContainer.appendChild(errorAnalysis);
        }

        // 時間分析
        const avgTimePerQuestion = examDuration / this.questions.length / 1000;
        const timeAnalysis = document.createElement('div');
        timeAnalysis.className = 'time-analysis';
        timeAnalysis.innerHTML = `
            <h4>時間使用分析</h4>
            <p>平均每題用時：${avgTimePerQuestion.toFixed(1)} 秒</p>
            <p class="time-tip">
                ${avgTimePerQuestion < 30 ? '作答速度較快，建議更仔細思考' :
                avgTimePerQuestion > 120 ? '作答速度較慢，可以提高效率' :
                    '作答速度適中'}
            </p>
        `;
        analysisContainer.appendChild(timeAnalysis);
    }

    createAnalysisSection() {
        const analysisDiv = document.createElement('div');
        analysisDiv.className = 'analysis-section';
        analysisDiv.innerHTML = `
            <div class="section-header">
                <h3>成績分析</h3>
                <p>針對您的答題情況提供個性化建議</p>
            </div>
        `;
        return analysisDiv;
    }

    // 保存考試記錄
    saveExamRecord() {
        try {
            const records = JSON.parse(localStorage.getItem('examRecords') || '[]');
            const bankInfo = this._getSelectedBankInfo();
            const newRecord = {
                date: new Date().toISOString(),
                score: this.lastExamResult.score,
                correctCount: this.lastExamResult.correctCount,
                totalCount: this.lastExamResult.totalCount,
                duration: this.lastExamResult.duration,
                isPassed: this.lastExamResult.isPassed,
                bankFile: bankInfo.value,
                bankLabel: bankInfo.label
            };

            records.unshift(newRecord); // 最新記錄在前

            // 只保留最近10次記錄
            if (records.length > 10) {
                records.splice(10);
            }

            localStorage.setItem('examRecords', JSON.stringify(records));
        } catch (error) {
            console.warn('保存考試記錄失敗:', error);
        }
    }

    // 顯示歷史記錄
    showExamHistory() {
        try {
            // 移除所有已存在的 modal
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            });

            const records = JSON.parse(localStorage.getItem('examRecords') || '[]');
            if (records.length === 0) {
                alert('暫無考試記錄');
                return;
            }

            const historyHtml = records.map((record) => {
                const date = new Date(record.date).toLocaleString('zh-TW');
                const durationText = `${Math.floor(record.duration / 60000)}分${Math.floor((record.duration % 60000) / 1000)}秒`;
                return `
                    <div class="history-item ${record.isPassed ? 'passed' : 'failed'}">
                        <span class="history-date">${date}</span>
                        <span class="history-score">${record.score}分</span>
                        <span class="history-duration">${durationText}</span>
                        <span class="history-status">${record.isPassed ? '通過' : '未通過'}</span>
                        <div class="history-bank" style="grid-column: 1 / -1; color: var(--color-text-secondary); font-size: 12px;">題庫：${record.bankLabel || record.bankFile || '未知'}</div>
                    </div>
                `;
            }).join('');

            const historyModal = this.createHistoryModal(historyHtml);
            document.body.appendChild(historyModal);
        } catch (error) {
            console.warn('載入考試記錄失敗:', error);
        }
    }

    createHistoryModal(content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.setAttribute('id', 'history-modal');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'history-modal-title');

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="history-modal-title">考試歷史記錄</h3>
                    <button class="modal-close" aria-label="關閉">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="history-list">
                        ${content || '<div class="no-records">無歷史記錄</div>'}
                    </div>
                </div>
            </div>
        `;

        // 綁定關閉事件
        modal.querySelector('.modal-close').addEventListener('click', () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        });

        // 點擊背景關閉
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }
        });

        // 按 ESC 鍵關閉 modal
        const escKeyHandler = (e) => {
            if (e.key === 'Escape' && document.body.contains(modal)) {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', escKeyHandler);
            }
        };
        document.addEventListener('keydown', escKeyHandler);

        return modal;
    }

    // 輔助：取得題庫顯示文字與檔名
    _getSelectedBankInfo() {
        try {
            const sel = document.getElementById('question-bank-select');
            if (sel) {
                const opt = sel.selectedOptions && sel.selectedOptions[0];
                return { value: sel.value || this.selectedQuestionBank, label: (opt && opt.textContent) || sel.value };
            }
        } catch {}
        return { value: this.selectedQuestionBank, label: this.selectedQuestionBank };
    }
}

// 應用程式啟動
let examApp; // 全域變數供HTML中使用

document.addEventListener('DOMContentLoaded', () => {
    examApp = new ExamApp();
});
