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

    // 本機資料保存期限（預設 7 天）
    this.storageTtlMs = 7 * 24 * 60 * 60 * 1000;

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
        const body = document.createElement('div');
        body.className = 'card__body';
        const title = document.createElement('h4');
        title.textContent = '考試設定';
        body.appendChild(title);

        const options = document.createElement('div');
        options.className = 'config-options';

        const makeCheckbox = (id, labelText, checked) => {
            const wrapper = document.createElement('label');
            wrapper.className = 'config-option';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = id;
            input.checked = !!checked;
            const span = document.createElement('span');
            span.textContent = labelText;
            wrapper.appendChild(input);
            wrapper.appendChild(span);
            return { wrapper, input };
        };

        const makeNumberInput = (id, labelText, value) => {
            const wrapper = document.createElement('label');
            wrapper.className = 'config-option';
            wrapper.setAttribute('for', id);
            const span = document.createElement('span');
            span.style.minWidth = '88px';
            span.style.display = 'inline-block';
            span.textContent = labelText;
            const input = document.createElement('input');
            input.type = 'number';
            input.id = id;
            input.min = '0';
            input.max = '100';
            input.value = String(value);
            input.className = 'form-control';
            input.style.maxWidth = '100px';
            wrapper.appendChild(span);
            wrapper.appendChild(input);
            return { wrapper, input };
        };

        const { wrapper: shuffleQWrap, input: shuffleQ } = makeCheckbox('shuffle-questions', '隨機題目順序', this.config.shuffleQuestions);
        const { wrapper: shuffleOWrap, input: shuffleO } = makeCheckbox('shuffle-options', '隨機選項順序', this.config.shuffleOptions);
        const { wrapper: showExpWrap, input: showExp } = makeCheckbox('show-explanation', '顯示答案解釋', this.config.showExplanation);
        const { wrapper: passingWrap, input: passingInput } = makeNumberInput('passing-score', '及格分數', this.config.passingScore);

        options.appendChild(shuffleQWrap);
        options.appendChild(shuffleOWrap);
        options.appendChild(showExpWrap);
        options.appendChild(passingWrap);

        // 資料管理區塊：清除本機資料按鈕 + TTL 提示
        const privacySection = document.createElement('div');
    privacySection.className = 'config-privacy mt-12px';
        const privacyNote = document.createElement('p');
        privacyNote.className = 'note';
        privacyNote.textContent = '注意：本機資料（進度/設定/歷史）預設保留 7 天，逾期會自動清除。';
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'btn btn--outline btn--sm';
        clearBtn.id = 'clear-local-data-btn';
        clearBtn.textContent = '清除所有本機資料';
        privacySection.appendChild(privacyNote);
        privacySection.appendChild(clearBtn);

        body.appendChild(options);
        body.appendChild(privacySection);
        configPanel.appendChild(body);

        const examInfo = document.querySelector('.exam-info');
        examInfo.parentNode.insertBefore(configPanel, examInfo);

        // 綁定配置事件
        shuffleQ.addEventListener('change', (e) => {
            this.config.shuffleQuestions = e.target.checked;
            this.saveConfig();
        });

        shuffleO.addEventListener('change', (e) => {
            this.config.shuffleOptions = e.target.checked;
            this.saveConfig();
        });

        showExp.addEventListener('change', (e) => {
            this.config.showExplanation = e.target.checked;
            this.saveConfig();
        });

        passingInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            const safe = isNaN(val) ? 60 : Math.min(100, Math.max(0, val));
            this.config.passingScore = safe;
            e.target.value = safe;
            this.saveConfig();
        });

        // 清除所有本機資料
        clearBtn.addEventListener('click', () => this.clearAllLocalData());
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
                while (firstLi.firstChild) firstLi.removeChild(firstLi.firstChild);
                const strong = document.createElement('strong');
                strong.textContent = '題目數量：';
                firstLi.appendChild(strong);
                firstLi.appendChild(document.createTextNode(`${totalQuestions} 題`));
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
    const inner = document.createElement('div');
    inner.id = 'exam-timer';
    inner.textContent = '考試時間：00:00';
    timerDiv.appendChild(inner);
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
    while (optionsContainer.firstChild) optionsContainer.removeChild(optionsContainer.firstChild);

        // 根據題目類型顯示不同的作答介面
        if (question.type === 'SAQ') {
            // 簡答題顯示文字輸入框（使用 DOM API 建立，避免 innerHTML 注入）
            const inputDiv = document.createElement('div');
            inputDiv.className = 'SAQ-answer-container';

            const label = document.createElement('label');
            label.setAttribute('for', 'SAQ-answer-input');
            label.className = 'form-label';
            label.textContent = '請輸入您的答案：';

            const textarea = document.createElement('textarea');
            textarea.id = 'SAQ-answer-input';
            textarea.className = 'form-control';
            textarea.rows = 4;
            textarea.classList.add('w-100','mt-10px');
            textarea.value = this.userAnswers[question.id] || '';

            inputDiv.appendChild(label);
            inputDiv.appendChild(textarea);
            optionsContainer.appendChild(inputDiv);

            // 綁定輸入事件
            const input = textarea;
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

        const input = document.createElement('input');
        input.type = 'radio';
        input.className = 'option-radio';
        input.name = `question-${questionId}`;
        input.value = optionValue;
        input.id = `option-${questionId}-${index}`;

        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.className = 'option-text';
        // 安全指派文字，避免題庫含 HTML 被渲染
        label.textContent = optionText;

        optionDiv.appendChild(input);
        optionDiv.appendChild(label);

        // 添加點擊事件
        optionDiv.addEventListener('click', () => {
            input.checked = true;
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
        optionElement.classList.add('transform-bump');
        setTimeout(() => {
            optionElement.classList.remove('transform-bump');
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
    progressFill.style.setProperty('width', `${progressPercentage}%`);
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
    while (grid.firstChild) grid.removeChild(grid.firstChild);

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
    while (durationElement.firstChild) durationElement.removeChild(durationElement.firstChild);
    const durLabel = document.createElement('span');
    durLabel.textContent = '考試時長：';
    const durVal = document.createElement('span');
    durVal.textContent = durationText;
    durationElement.appendChild(durLabel);
    durationElement.appendChild(durVal);

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
                this._csvEscape(this._csvSanitize(r.question)),
                this._csvEscape(this._csvSanitize(r.userAnswer ?? '')),
                this._csvEscape(this._csvSanitize(r.correctAnswer ?? '')),
                r.isCorrect,
                meta.score,
                meta.accuracy,
                meta.passingScore,
                this._csvEscape(this._csvSanitize(meta.bankLabel)),
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

    // 防 CSV 公式注入：若值以 =、+、-、@ 開頭（允許前置空白），前面加上單引號
    _csvSanitize(val) {
        const s = (val ?? '').toString();
        if (/^\s*[=+\-@]/.test(s)) {
            return "'" + s;
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
    while (reviewContainer.firstChild) reviewContainer.removeChild(reviewContainer.firstChild);

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

        // 內容區塊 DOM 建構
        let answersBlock = null;
        if (question.type === 'single') {
            answersBlock = document.createElement('div');
            answersBlock.className = 'review-answers';
            question.options.forEach(option => {
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
                const div = document.createElement('div');
                div.className = className;
                // 使用 textContent 安全設置，並附加指示符
                div.textContent = option + indicator;
                answersBlock.appendChild(div);
            });
        } else if (question.type === 'SAQ') {
            answersBlock = document.createElement('div');
            answersBlock.className = 'review-SAQ-answer';
            const itemUser = document.createElement('div');
            itemUser.className = 'SAQ-answer-item';
            const userLabel = document.createElement('strong');
            userLabel.textContent = '您的答案：';
            const userContent = document.createElement('div');
            userContent.className = 'SAQ-answer-content ' + (isCorrect ? 'correct' : 'incorrect');
            userContent.textContent = userAnswer ? userAnswer : '未作答';
            itemUser.appendChild(userLabel);
            itemUser.appendChild(userContent);

            const itemStd = document.createElement('div');
            itemStd.className = 'SAQ-answer-item';
            const stdLabel = document.createElement('strong');
            stdLabel.textContent = '標準答案：';
            const stdContent = document.createElement('div');
            stdContent.className = 'SAQ-answer-content standard';
            stdContent.textContent = correctAnswer ? String(correctAnswer) : '（無標準答案）';
            itemStd.appendChild(stdLabel);
            itemStd.appendChild(stdContent);

            answersBlock.appendChild(itemUser);
            answersBlock.appendChild(itemStd);
        }
        const body = document.createElement('div');
        body.className = 'card__body';
        const header = document.createElement('div');
        header.className = 'review-header';
        const qNum = document.createElement('span');
        qNum.className = 'review-question-number';
        qNum.textContent = `第 ${questionNumber} 題`;
        const status = document.createElement('span');
        status.className = `status ${isCorrect ? 'status--success' : 'status--error'}`;
        status.textContent = isCorrect ? '正確' : (userAnswer ? '錯誤' : '未作答');
        header.appendChild(qNum);
        header.appendChild(status);

    const content = document.createElement('div');
        content.className = 'review-content';
        const qDiv = document.createElement('div');
        qDiv.className = 'review-question';
    qDiv.textContent = displayQuestion || '';
        content.appendChild(qDiv);
        if (answersBlock) content.appendChild(answersBlock);
        if (question.explanation && this.config.showExplanation) {
            const expl = document.createElement('div');
            expl.className = 'review-explanation';
            const strong = document.createElement('strong');
            strong.textContent = '解釋：';
            const span = document.createElement('span');
            span.textContent = String(question.explanation);
            expl.appendChild(strong);
            expl.appendChild(span);
            content.appendChild(expl);
        }

        body.appendChild(header);
        body.appendChild(content);
        reviewDiv.appendChild(body);

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
            this._lsSetWithTtl('examProgress', progressData, this.storageTtlMs);
        } catch (error) {
            console.warn('保存進度失敗:', error);
        }
    }

    loadSavedProgress() {
        try {
            const savedData = this._lsGetWithTtl('examProgress');
            if (savedData) {
                const progressData = savedData;
                if (progressData.userAnswers && Object.keys(progressData.userAnswers).length > 0) {
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
            this._lsSetWithTtl('examConfig', this.config, this.storageTtlMs);
        } catch (error) {
            console.warn('保存配置失敗:', error);
        }
    }

    loadConfig() {
        try {
            const savedConfig = this._lsGetWithTtl('examConfig');
            if (savedConfig) {
                this.config = { ...this.config, ...savedConfig };

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
            const h4 = document.createElement('h4');
            h4.textContent = '錯誤題目分析';
            const p = document.createElement('p');
            p.textContent = `共答錯 ${wrongAnswers.length} 題，建議重點複習以下領域：`;
            const ul = document.createElement('ul');
            ul.className = 'error-list';
            wrongAnswers.slice(0, 5).forEach(item => {
                const li = document.createElement('li');
                li.textContent = `題目 ${item.question.id}: ${(item.question.question || '').substring(0, 50)}...`;
                ul.appendChild(li);
            });
            if (wrongAnswers.length > 5) {
                const li = document.createElement('li');
                li.textContent = '...以及其他錯誤題目';
                ul.appendChild(li);
            }
            errorAnalysis.appendChild(h4);
            errorAnalysis.appendChild(p);
            errorAnalysis.appendChild(ul);
            analysisContainer.appendChild(errorAnalysis);
        }

        // 時間分析
        const avgTimePerQuestion = examDuration / this.questions.length / 1000;
        const timeAnalysis = document.createElement('div');
        timeAnalysis.className = 'time-analysis';
        const h4t = document.createElement('h4');
        h4t.textContent = '時間使用分析';
        const pAvg = document.createElement('p');
        pAvg.textContent = `平均每題用時：${avgTimePerQuestion.toFixed(1)} 秒`;
        const pTip = document.createElement('p');
        pTip.className = 'time-tip';
        pTip.textContent = avgTimePerQuestion < 30 ? '作答速度較快，建議更仔細思考' :
            avgTimePerQuestion > 120 ? '作答速度較慢，可以提高效率' : '作答速度適中';
        timeAnalysis.appendChild(h4t);
        timeAnalysis.appendChild(pAvg);
        timeAnalysis.appendChild(pTip);
        analysisContainer.appendChild(timeAnalysis);
    }

    createAnalysisSection() {
        const analysisDiv = document.createElement('div');
        analysisDiv.className = 'analysis-section';
        const header = document.createElement('div');
        header.className = 'section-header';
        const h3 = document.createElement('h3');
        h3.textContent = '成績分析';
        const p = document.createElement('p');
        p.textContent = '針對您的答題情況提供個性化建議';
        header.appendChild(h3);
        header.appendChild(p);
        analysisDiv.appendChild(header);
        return analysisDiv;
    }

    // 保存考試記錄
    saveExamRecord() {
        try {
            const records = this._lsGetWithTtl('examRecords') || [];
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
            this._lsSetWithTtl('examRecords', records, this.storageTtlMs);
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

            const records = this._lsGetWithTtl('examRecords') || [];
            if (records.length === 0) {
                alert('暫無考試記錄');
                return;
            }

            const historyModal = this.createHistoryModal();
            document.body.appendChild(historyModal);
            const list = historyModal.querySelector('.history-list');
            // 清除預設的無紀錄占位符
            const placeholder = list.querySelector('.no-records');
            if (placeholder) placeholder.remove();
            records.forEach(record => {
                const date = new Date(record.date).toLocaleString('zh-TW');
                const durationText = `${Math.floor(record.duration / 60000)}分${Math.floor((record.duration % 60000) / 1000)}秒`;
                const item = document.createElement('div');
                item.className = 'history-item ' + (record.isPassed ? 'passed' : 'failed');
                const d = document.createElement('span'); d.className = 'history-date'; d.textContent = date;
                const s = document.createElement('span'); s.className = 'history-score'; s.textContent = `${record.score}分`;
                const dur = document.createElement('span'); dur.className = 'history-duration'; dur.textContent = durationText;
                const st = document.createElement('span'); st.className = 'history-status'; st.textContent = record.isPassed ? '通過' : '未通過';
                const bank = document.createElement('div'); bank.className = 'history-bank grid-col-full text-secondary-sm'; bank.textContent = `題庫：${record.bankLabel || record.bankFile || '未知'}`;
                item.appendChild(d);
                item.appendChild(s);
                item.appendChild(dur);
                item.appendChild(st);
                item.appendChild(bank);
                list.appendChild(item);
            });
        } catch (error) {
            console.warn('載入考試記錄失敗:', error);
        }
    }

    createHistoryModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'history-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'history-modal-title');

        const contentWrap = document.createElement('div');
        contentWrap.className = 'modal-content';

        const header = document.createElement('div');
        header.className = 'modal-header';
        const h3 = document.createElement('h3');
        h3.id = 'history-modal-title';
        h3.textContent = '考試歷史記錄';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.setAttribute('aria-label', '關閉');
        closeBtn.textContent = '×';
        header.appendChild(h3);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'modal-body';
    const list = document.createElement('div');
        list.className = 'history-list';
    const empty = document.createElement('div');
    empty.className = 'no-records';
    empty.textContent = '無歷史記錄';
    list.appendChild(empty);
        body.appendChild(list);

        contentWrap.appendChild(header);
        contentWrap.appendChild(body);
        modal.appendChild(contentWrap);

        // 綁定關閉事件
    closeBtn.addEventListener('click', () => {
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

    // 一鍵清除本機資料
    clearAllLocalData() {
        try {
            localStorage.removeItem('examProgress');
            localStorage.removeItem('examConfig');
            localStorage.removeItem('examRecords');
            this.showSuccessMessage('已清除所有本機資料');
        } catch (e) {
            console.warn('清除本機資料失敗:', e);
        }
    }

    // localStorage with TTL helpers
    _lsSetWithTtl(key, value, ttlMs) {
        const now = Date.now();
        const record = { value, _ts: now, _ttl: ttlMs };
        localStorage.setItem(key, JSON.stringify(record));
    }

    _lsGetWithTtl(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (!obj || typeof obj !== 'object') return null;
            const ts = obj._ts || 0;
            const ttl = obj._ttl || 0;
            if (ttl > 0 && Date.now() - ts > ttl) {
                localStorage.removeItem(key);
                return null;
            }
            return obj.value !== undefined ? obj.value : obj;
        } catch {
            return null;
        }
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

    // 輔助：HTML escape，防止 XSS
    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// 應用程式啟動
let examApp; // 全域變數供HTML中使用

document.addEventListener('DOMContentLoaded', () => {
    examApp = new ExamApp();
});