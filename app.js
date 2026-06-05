const IS_PRODUCTION = window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    !window.location.hostname.includes('192.168');
const logger = {
    log: (...args) => !IS_PRODUCTION && console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    info: (...args) => !IS_PRODUCTION && console.info(...args)
};
const ALLOWED_BANKS = new Set([
    'ERP Planner_Reference Question Types_202509_V06.json',
    '118002A15.json',
    '118003A14.json',
    'IPAS-AI-L11-A.json',
    'IPAS-AI-L11-B.json',
    'IPAS-AI-L12-A.json',
    'IPAS-AI-L12-B.json',
    'IPAS-AI-L12-C.json',
    'IPAS-AI-L12-D.json',
    'IPAS-AI-L11-130994.json',
    'Project_Management.json',
    'Basic_Financial_Planning.json',
    'PFERP_Reference119_20240201.json'
]);
class ExamApp {
    constructor() {
        this.questions = [];
        this.originalQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.isExamCompleted = false;
        this.examStartTime = null;
        this.examEndTime = null;
        this.isLoading = false;
        this.config = {
            shuffleQuestions: false,
            shuffleOptions: false,
            autoSave: true,
            showExplanation: true,
            passingScore: 60,
            drawQuestionCount: 0,
            customDrawCount: 20
        };
        this.selectedQuestionBank = 'ERP Planner_Reference Question Types_202509_V06.json';
        this.storageTtlMs = 7 * 24 * 60 * 60 * 1000;
        this.loadQuestions().then(() => {
            this.init();
        });
    }
    async loadQuestions(forceReload = false) {
        this.isLoading = true;
        this.showLoadingState(true);
        try {
            let response;
            let questions = [];
            if (!ALLOWED_BANKS.has(this.selectedQuestionBank)) {
                throw new Error(`非法的題庫來源：${this.selectedQuestionBank}`);
            }
            const baseUrl = window.location.href.split('/').slice(0, -1).join('/') + '/json/';
            const questionBankUrl = new URL(this.selectedQuestionBank, baseUrl).href;
            logger.log(`嘗試從 ${questionBankUrl} 載入題庫`);
            response = await fetch(questionBankUrl);
            if (response.ok) {
                questions = await response.json();
                logger.log(`從 ${this.selectedQuestionBank} 載入 ${questions.length} 題`);
                const validationResult = this.validateQuestionSchema(questions);
                if (!validationResult.isValid) {
                    logger.warn('題庫格式驗證警告:', validationResult.errors);
                }
            } else {
                throw new Error('題庫載入失敗');
            }
            this.questions = this.validateAndNormalizeQuestions(questions);
            this.originalQuestions = [...this.questions];
            if (!forceReload) this.loadSavedProgress();
        } catch (error) {
            logger.error('載入題目失敗:', error);
            this.handleLoadError();
        } finally {
            this.isLoading = false;
            this.showLoadingState(false);
        }
    }
    validateQuestionSchema(questions) {
        const errors = [];
        if (!Array.isArray(questions)) {
            errors.push('題庫必須是陣列格式');
            return { isValid: false, errors };
        }
        questions.forEach((q, index) => {
            if (!q.id && q.id !== 0) {
                errors.push(`題目 ${index + 1}: 缺少 id 欄位`);
            }
            if (!q.question && !q.explanation) {
                errors.push(`題目 ${index + 1}: 缺少 question 或 explanation 欄位`);
            }
            if (q.type) {
                const validTypes = ['single', 'saq', 'SAQ', 'short'];
                const typeStr = q.type.toString().toLowerCase();
                if (!validTypes.includes(typeStr) && !validTypes.includes(q.type)) {
                    errors.push(`題目 ${index + 1}: 不支援的題型 "${q.type}"`);
                }
            }
            const isSingleChoice = !q.type || q.type.toString().toLowerCase() === 'single';
            if (isSingleChoice) {
                if (!Array.isArray(q.options) || q.options.length === 0) {
                    errors.push(`題目 ${index + 1}: 單選題缺少選項`);
                }
                if (!q.answer) {
                    errors.push(`題目 ${index + 1}: 缺少正確答案`);
                }
            }
            if (q.options && !Array.isArray(q.options)) {
                errors.push(`題目 ${index + 1}: options 必須是陣列`);
            }
        });
        return {
            isValid: errors.length === 0,
            errors,
            totalQuestions: questions.length,
            validQuestions: questions.length - errors.length
        };
    }
    validateAndNormalizeQuestions(rawQuestions) {
        return rawQuestions.map((q, index) => {
            let type = q.type ? q.type.toString().toLowerCase() : 'single';
            if (["saq", "sqa", "short"].includes(type)) {
                type = 'SAQ';
            } else {
                type = (Array.isArray(q.options) && q.options.length > 0) ? 'single' : 'SAQ';
            }
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
            if (question.type === 'single') {
                if (question.options.length === 0 || !Array.isArray(question.options)) {
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
        }).filter(q => q.id != null);
    }
    handleLoadError() {
        logger.error('題庫載入失敗，嘗試備用內容');
        logger.log('目前題庫:', this.selectedQuestionBank);
        logger.log('頁面位置:', window.location.href);
        this.questions = [{
            "id": 1,
            "question": "題目載入失敗，請檢查網路連接並重新整理頁面。",
            "options": ["A. 重新整理頁面", "B. 檢查網路連接", "C. 聯繫技術支援", "D. 稍後再試"],
            "answer": "A",
            "explanation": "請檢查網路連接或重新載入頁面"
        }];
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
        this.loadConfig();
        this.bindEvents();
        this.setupConfigPanel();
        this.setupQuestionBankSelect();
        this.showPage('home');
        this.updateExamInfo();
        logger.log('考試系統初始化完成');
        logger.log('當前題庫:', this.selectedQuestionBank);
        logger.log('題目數量:', this.questions.length);
    }
    setupQuestionBankSelect() {
        const select = document.getElementById('question-bank-select');
        if (select) {
            if (this.selectedQuestionBank) {
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
                const newQuestionBank = e.target.value;
                if (!ALLOWED_BANKS.has(newQuestionBank)) {
                    logger.error(`嘗試切換至非法題庫：${newQuestionBank}`);
                    e.target.value = previousQuestionBank;
                    return;
                }
                const hasProgress = !this.isExamCompleted && Object.keys(this.userAnswers).length > 0;
                if (hasProgress) {
                    const confirmSwitch = confirm(
                        '您有未完成的考試進度，切換題庫將會清除目前的進度。\n\n確定要切換題庫嗎？'
                    );
                    if (!confirmSwitch) {
                        e.target.value = previousQuestionBank;
                        return;
                    }
                }
                this.selectedQuestionBank = newQuestionBank;
                logger.log(`切換題庫：從 ${previousQuestionBank} 到 ${this.selectedQuestionBank}`);
                this.clearSavedProgress();
                this.loadQuestions(true).then(() => {
                    this.currentQuestionIndex = 0;
                    this.userAnswers = {};
                    this.isExamCompleted = false;
                    this.examStartTime = null;
                    this.examEndTime = null;
                    this.showPage('home');
                    this.updateExamInfo();
                });
            };
        } else {
            logger.error('找不到題庫選擇元素 (question-bank-select)');
        }
    }
    setupConfigPanel() {
        const oldPanel = document.querySelector('.config-panel');
        if (oldPanel) oldPanel.remove();
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
        // 抽題數量設定
        const drawGroup = document.createElement('div');
        drawGroup.className = 'config-option-group';
        drawGroup.style.display = 'flex';
        drawGroup.style.alignItems = 'center';
        drawGroup.style.gap = '8px';
        drawGroup.style.marginTop = '8px';
        drawGroup.style.width = '100%';
        const drawLabel = document.createElement('span');
        drawLabel.style.minWidth = '88px';
        drawLabel.style.display = 'inline-block';
        drawLabel.textContent = '抽題數量：';
        drawGroup.appendChild(drawLabel);
        const drawSelect = document.createElement('select');
        drawSelect.id = 'draw-question-select';
        drawSelect.className = 'form-control';
        drawSelect.style.maxWidth = '120px';
        drawSelect.style.padding = '4px 8px';
        const drawOptions = [
            { value: '0', label: '全部題目' },
            { value: '10', label: '10 題' },
            { value: '20', label: '20 題' },
            { value: '30', label: '30 題' },
            { value: '50', label: '50 題' },
            { value: '100', label: '100 題' },
            { value: 'custom', label: '自訂數量' }
        ];
        drawOptions.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.label;
            drawSelect.appendChild(o);
        });
        const currentDrawCount = this.config.drawQuestionCount;
        const knownValues = ['0', '10', '20', '30', '50', '100'];
        if (knownValues.includes(String(currentDrawCount))) {
            drawSelect.value = String(currentDrawCount);
        } else {
            drawSelect.value = 'custom';
        }
        drawGroup.appendChild(drawSelect);
        const drawCustomInput = document.createElement('input');
        drawCustomInput.type = 'number';
        drawCustomInput.id = 'draw-custom-input';
        drawCustomInput.min = '1';
        drawCustomInput.value = String(this.config.customDrawCount || 20);
        drawCustomInput.className = 'form-control';
        drawCustomInput.style.maxWidth = '80px';
        drawCustomInput.style.padding = '4px 8px';
        drawCustomInput.style.display = drawSelect.value === 'custom' ? 'block' : 'none';
        drawGroup.appendChild(drawCustomInput);
        options.appendChild(drawGroup);
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
        drawSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'custom') {
                drawCustomInput.style.display = 'block';
                const inputVal = parseInt(drawCustomInput.value, 10) || 20;
                this.config.drawQuestionCount = inputVal;
            } else {
                drawCustomInput.style.display = 'none';
                this.config.drawQuestionCount = parseInt(val, 10);
            }
            this.saveConfig();
            this.updateExamInfo();
        });
        drawCustomInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            this.config.customDrawCount = val;
            if (drawSelect.value === 'custom') {
                this.config.drawQuestionCount = val;
                this.saveConfig();
                this.updateExamInfo();
            }
        });
        clearBtn.addEventListener('click', () => this.clearAllLocalData());
        this.loadConfig();
    }
    updateExamInfo() {
        const totalQuestions = this.originalQuestions.length || this.questions.length;
        const drawCount = parseInt(this.config.drawQuestionCount, 10) || 0;
        let displayCount = totalQuestions;
        let suffixText = '';
        if (drawCount > 0 && drawCount < totalQuestions) {
            displayCount = drawCount;
            suffixText = ` (從 ${totalQuestions} 題中隨機抽取)`;
        }
        document.getElementById('total-questions').textContent = displayCount;
        const examDetails = document.querySelector('.exam-details');
        if (examDetails) {
            const firstLi = examDetails.querySelector('li');
            if (firstLi) {
                while (firstLi.firstChild) firstLi.removeChild(firstLi.firstChild);
                const strong = document.createElement('strong');
                strong.textContent = '題目數量：';
                firstLi.appendChild(strong);
                firstLi.appendChild(document.createTextNode(`${displayCount} 題${suffixText}`));
            }
        }
    }
    bindEvents() {
        document.getElementById('start-exam-btn').addEventListener('click', () => {
            this.startExam();
        });
        document.getElementById('prev-btn').addEventListener('click', () => {
            this.previousQuestion();
        });
        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextQuestion();
        });
        document.getElementById('submit-btn').addEventListener('click', () => {
            this.submitExam();
        });
        document.getElementById('restart-exam-btn').addEventListener('click', () => {
            this.restartExam();
        });
        document.getElementById('history-btn').addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            });
            this.showExamHistory();
        });
        const exportJsonBtn = document.getElementById('export-json-btn');
        const exportCsvBtn = document.getElementById('export-csv-btn');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => this.exportResults('json'));
        }
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportResults('csv'));
        }
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
                return;
            }
            if (document.getElementById('exam-page').classList.contains('active')) {
                const currentQuestion = this.questions[this.currentQuestionIndex];
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
        if (this.config.autoSave) {
            setInterval(() => {
                if (!this.isExamCompleted && Object.keys(this.userAnswers).length > 0) {
                    this.saveProgress();
                }
            }, 30000);
        }
        window.addEventListener('beforeunload', (e) => {
            if (!this.isExamCompleted && Object.keys(this.userAnswers).length > 0) {
                e.preventDefault();
                e.returnValue = '您的考試進度可能會丟失，確定要離開嗎？';
                return e.returnValue;
            }
        });
    }
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageId}-page`).classList.add('active');
    }
    startExam() {
        this.questions = [...this.originalQuestions];
        const drawCount = parseInt(this.config.drawQuestionCount, 10) || 0;
        if (drawCount > 0 && drawCount < this.questions.length) {
            const tempQuestions = [...this.questions];
            this.shuffleArray(tempQuestions);
            const selectedQuestions = tempQuestions.slice(0, drawCount);
            if (!this.config.shuffleQuestions) {
                selectedQuestions.sort((a, b) => {
                    return this.originalQuestions.indexOf(a) - this.originalQuestions.indexOf(b);
                });
            }
            this.questions = selectedQuestions;
        }
        if (this.config.shuffleQuestions) {
            this.shuffleArray(this.questions);
        }
        if (this.config.shuffleOptions) {
            this.questions.forEach(q => {
                if (q && q.type === 'single' && Array.isArray(q.options) && q.options.length > 0) {
                    this.shuffleQuestionOptions(q);
                }
            });
        }
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.isExamCompleted = false;
        this.examStartTime = new Date();
        this.clearSavedProgress();
        this.showPage('exam');
        this.displayQuestion();
        this.updateProgress();
        this.updateNavigation();
        this.updateAnswerStatus();
        this.renderQuestionGrid();
        this.startTimer();
    }
    shuffleQuestionOptions(question) {
        try {
            const currentAnswer = (question.answer || '').toString().trim().toUpperCase();
            const optionObjs = (question.options || []).map(opt => {
                const text = (opt || '').toString();
                const letter = text.trim().charAt(0).toUpperCase();
                const cleanText = text.replace(/^[A-D]\.?\s*/, '').trim();
                return {
                    text: cleanText,
                    isCorrect: letter === currentAnswer
                };
            });
            if (optionObjs.length === 0) return;
            this.shuffleArray(optionObjs);
            question.options = optionObjs.map((o, idx) => {
                const newLetter = String.fromCharCode(65 + idx);
                if (o.isCorrect) {
                    question.answer = newLetter;
                }
                return `${newLetter}. ${o.text}`;
            });
        } catch (e) {
            logger.warn('隨機選項順序時發生問題，已跳過該題：', e);
        }
    }
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    startTimer() {
        document.querySelectorAll('.exam-timer').forEach(el => el.remove());
        const timerElement = this.createTimerElement();
        const progressInfo = this._querySelector('.exam-header .progress-info');
        if (progressInfo) {
            progressInfo.appendChild(timerElement);
        }
        this.timerInterval = setInterval(() => {
            const elapsed = new Date() - this.examStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timerDisplay = this._getElement('exam-timer', false);
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
        logger.log(`顯示題目 #${this.currentQuestionIndex + 1}, 類型:`, question.type);
        const questionNumber = this._getElement('question-number');
        if (questionNumber) questionNumber.textContent = this.currentQuestionIndex + 1;
        const questionText = this._getElement('question-text');
        if (questionText) questionText.textContent = question.question;
        const totalQuestions = this._getElement('total-questions');
        if (totalQuestions) totalQuestions.textContent = this.questions.length;
        const currentQuestion = this._getElement('current-question');
        if (currentQuestion) currentQuestion.textContent = this.currentQuestionIndex + 1;
        const questionCard = this._querySelector('.question-card');
        if (questionCard) {
            questionCard.classList.remove('question-single', 'question-saq');
            questionCard.classList.add(question.type === 'SAQ' ? 'question-saq' : 'question-single');
            let typeLabel = this._querySelector('.question-type-label', false);
            if (!typeLabel) {
                typeLabel = document.createElement('div');
                typeLabel.className = 'question-type-label';
                const questionNumberEl = this._querySelector('.question-number');
                if (questionNumberEl && questionNumberEl.parentNode) {
                    questionNumberEl.parentNode.insertBefore(typeLabel, questionNumberEl.nextSibling);
                }
            }
            typeLabel.textContent = question.type === 'SAQ' ? '簡答題' : '單選題';
            typeLabel.className = `question-type-label ${question.type === 'SAQ' ? 'saq' : 'single'}`;
        }
        const optionsContainer = this._getElement('options-container');
        if (!optionsContainer) return;
        while (optionsContainer.firstChild) optionsContainer.removeChild(optionsContainer.firstChild);
        if (question.type === 'SAQ') {
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
            textarea.classList.add('w-100', 'mt-10px');
            textarea.value = this.userAnswers[question.id] || '';
            inputDiv.appendChild(label);
            inputDiv.appendChild(textarea);
            optionsContainer.appendChild(inputDiv);
            const input = textarea;
            const debounced = this._debounce((val) => {
                this.userAnswers[question.id] = val;
                if (this.config.autoSave) this.saveProgress();
                this.updateAnswerStatus();
            }, 400);
            input.addEventListener('input', (e) => debounced(e.target.value));
            setTimeout(() => {
                input.focus();
            }, 100);
        } else if (question.type === 'single') {
            question.options.forEach((optionText, index) => {
                const optionElement = this.createOptionElement(optionText, index, question.id);
                optionsContainer.appendChild(optionElement);
            });
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
        optionDiv.setAttribute('role', 'radio');
        optionDiv.setAttribute('aria-checked', 'false');
        const optionValue = optionText.charAt(0);
        const input = document.createElement('input');
        input.type = 'radio';
        input.className = 'option-radio';
        input.name = `question-${questionId}`;
        input.value = optionValue;
        input.id = `option-${questionId}-${index}`;
        input.setAttribute('aria-label', optionText);
        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.className = 'option-text';
        label.textContent = optionText;
        optionDiv.appendChild(input);
        optionDiv.appendChild(label);
        optionDiv.addEventListener('click', () => {
            input.checked = true;
            this.selectOption(questionId, optionValue, optionDiv);
        });
        return optionDiv;
    }
    selectOption(questionId, optionValue, optionElement) {
        document.querySelectorAll(`input[name="question-${questionId}"]`).forEach(input => {
            const parentDiv = input.closest('.option');
            if (parentDiv) {
                parentDiv.classList.remove('selected');
                parentDiv.setAttribute('aria-checked', 'false');
            }
        });
        optionElement.classList.add('selected');
        optionElement.setAttribute('aria-checked', 'true');
        this.userAnswers[questionId] = optionValue;
        if (this.config.autoSave) {
            this.saveProgress();
        }
        this.updateNavigation();
        this.updateAnswerStatus();
        optionElement.classList.add('transform-bump');
        setTimeout(() => {
            optionElement.classList.remove('transform-bump');
        }, 200);
    }
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
        }
    }
    updateProgress() {
        const progressFill = this._getElement('progress-fill', false);
        if (progressFill) {
            const progressPercentage = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
            progressFill.style.setProperty('width', `${progressPercentage}%`);
            progressFill.setAttribute('aria-valuenow', Math.round(progressPercentage));
        }
        this._announceToScreenReader(`第 ${this.currentQuestionIndex + 1} 題，共 ${this.questions.length} 題`);
    }
    _announceToScreenReader(message) {
        let announcer = this._getElement('sr-announcer', false);
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'sr-announcer';
            announcer.className = 'sr-only';
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            document.body.appendChild(announcer);
        }
        announcer.textContent = message;
    }
    updateNavigation() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');
        prevBtn.disabled = this.currentQuestionIndex === 0;
        if (this.currentQuestionIndex === this.questions.length - 1) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }
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
        if (this._isSubmitting) return;
        this._isSubmitting = true;
        setTimeout(() => { this._isSubmitting = false; }, 1000);
        const unansweredQuestions = this.questions.filter(q => !this.userAnswers[q.id]);
        if (unansweredQuestions.length > 0) {
            const confirmSubmit = confirm(`您還有 ${unansweredQuestions.length} 題未回答，確定要提交考試嗎？未回答的題目將視為錯誤。`);
            if (!confirmSubmit) return;
        }
        this.examEndTime = new Date();
        this.isExamCompleted = true;
        this.stopTimer();
        this.clearSavedProgress();
        this.calculateResults();
        this.showPage('result');
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
        const durationMinutes = Math.floor(examDuration / 60000);
        const durationSeconds = Math.floor((examDuration % 60000) / 1000);
        const durationText = `${durationMinutes}分${durationSeconds}秒`;
        document.getElementById('final-score').textContent = score;
        document.getElementById('correct-count').textContent = correctCount;
        document.getElementById('total-count').textContent = totalCount;
        document.getElementById('accuracy-rate').textContent = `${accuracy}%`;
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
        this.generateReview();
        this.generateAnalysis(wrongAnswers, examDuration);
        this.lastExamResult = {
            score,
            correctCount,
            totalCount,
            isPassed,
            duration: examDuration,
            wrongAnswers
        };
    }
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
        const perQuestion = this.questions.map((q, idx) => {
            const userAnswer = this.userAnswers[q.id];
            const correct = q.type === 'single'
                ? userAnswer === q.answer
                : (userAnswer && q.answer && userAnswer.toString().trim().toLowerCase() === q.answer.toString().trim().toLowerCase());
            const typeLabel = q.type === 'SAQ' ? '簡答題' : '單選題';
            const optionsText = Array.isArray(q.options) ? q.options.join('\n') : '';
            return {
                no: idx + 1,
                id: q.id,
                type: q.type,
                typeLabel,
                question: q.question,
                options: optionsText,
                userAnswer: userAnswer ?? '',
                correctAnswer: q.answer ?? '',
                explanation: q.explanation ?? '',
                isCorrect: !!correct
            };
        });
        const fileBase = `exam_result_${this._slugify(bankInfo.label || bankInfo.value)}_${this._formatDateForFile(new Date())}`;
        if (format === 'json') {
            const data = perQuestion.map(r => ({
                '編號': r.no,
                'ID': r.id,
                '類型': r.typeLabel,
                '題目': r.question,
                '選項': r.options ?? '',
                '作答': r.userAnswer ?? '',
                '解答': r.correctAnswer ?? '',
                '是否正確': r.isCorrect ? '是' : '否',
                '解釋': r.explanation ?? '',
                '題庫標籤': meta.bankLabel,
                '匯出時間': meta.exportedAt
            }));
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
            this._downloadBlob(blob, `${fileBase}.json`);
        } else {
            const headers = ['編號', 'ID', '類型', '題目', '選項', '作答', '解答', '是否正確', '解釋', '題庫標籤', '匯出時間'];
            const rows = perQuestion.map(r => [
                r.no,
                r.id,
                this._csvEscape(this._csvSanitize(r.typeLabel)),
                this._csvEscape(this._csvSanitize(r.question)),
                this._csvEscape(this._csvSanitize(r.options ?? '')),
                this._csvEscape(this._csvSanitize(r.userAnswer ?? '')),
                this._csvEscape(this._csvSanitize(r.correctAnswer ?? '')),
                this._csvEscape(this._csvSanitize(r.isCorrect ? '是' : '否')),
                this._csvEscape(this._csvSanitize(r.explanation ?? '')),
                this._csvEscape(this._csvSanitize(meta.bankLabel)),
                meta.exportedAt
            ]);
            const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
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
        a.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: false }));
        setTimeout(() => {
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
        this.stopTimer();
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.isExamCompleted = false;
        this.examStartTime = null;
        this.examEndTime = null;
        this.clearSavedProgress();
        document.querySelectorAll('.exam-timer').forEach(el => el.remove());
        const analysisSection = document.querySelector('.analysis-section');
        if (analysisSection) {
            analysisSection.remove();
        }
        document.querySelectorAll('.success-message, .error-message').forEach(el => el.remove());
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
        this.showPage('home');
    }
    saveProgress() {
        if (!this.config.autoSave) return;
        const progressData = {
            currentQuestionIndex: this.currentQuestionIndex,
            userAnswers: this.userAnswers,
            examStartTime: this.examStartTime,
            questions: this.questions,
            questionBank: this.selectedQuestionBank,
            timestamp: new Date().toISOString()
        };
        try {
            this._lsSetWithTtl('examProgress', progressData, this.storageTtlMs);
        } catch (error) {
            logger.warn('保存進度失敗:', error);
        }
    }
    _validateProgressSchema(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
        if (typeof data.currentQuestionIndex !== 'number' ||
            !Number.isInteger(data.currentQuestionIndex) ||
            data.currentQuestionIndex < 0) return false;
        if (typeof data.userAnswers !== 'object' ||
            data.userAnswers === null ||
            Array.isArray(data.userAnswers)) return false;
        for (const val of Object.values(data.userAnswers)) {
            if (typeof val !== 'string') return false;
            if (val.length > 2000) return false;
        }
        if (data.questionBank !== undefined) {
            if (typeof data.questionBank !== 'string') return false;
            if (!ALLOWED_BANKS.has(data.questionBank)) return false;
        }
        if (data.questions !== undefined) {
            if (!Array.isArray(data.questions) || data.questions.length > 5000) return false;
        }
        return true;
    }
    loadSavedProgress() {
        try {
            const savedData = this._lsGetWithTtl('examProgress');
            if (savedData) {
                if (!this._validateProgressSchema(savedData)) {
                    logger.warn('examProgress 資料結構異常，已忽略並清除');
                    this.clearSavedProgress();
                    return false;
                }
                const progressData = savedData;
                if (progressData.questionBank && progressData.questionBank !== this.selectedQuestionBank) {
                    logger.log(`保存的進度來自不同題庫 (${progressData.questionBank})，已忽略`);
                    return false;
                }
                if (progressData.userAnswers && Object.keys(progressData.userAnswers).length > 0) {
                    const continueExam = confirm('發現未完成的考試進度，是否繼續之前的考試？');
                    if (continueExam) {
                        this.currentQuestionIndex = progressData.currentQuestionIndex || 0;
                        this.userAnswers = progressData.userAnswers || {};
                        this.examStartTime = new Date(progressData.examStartTime);
                        if (progressData.questions && Array.isArray(progressData.questions) && progressData.questions.length > 0) {
                            this.questions = progressData.questions;
                        }
                        this.showPage('exam');
                        this.displayQuestion();
                        this.updateProgress();
                        this.updateNavigation();
                        this.updateAnswerStatus();
                        this.renderQuestionGrid();
                        this.startTimer();
                        this.showSuccessMessage('已恢復之前的考試進度');
                        return true;
                    } else {
                        this.clearSavedProgress();
                        return false;
                    }
                }
            }
            return false;
        } catch (error) {
            logger.warn('載入保存的進度失敗:', error);
            return false;
        }
    }
    clearSavedProgress() {
        try {
            localStorage.removeItem('examProgress');
        } catch (error) {
            logger.warn('清除保存的進度失敗:', error);
        }
    }
    saveConfig() {
        try {
            this._lsSetWithTtl('examConfig', this.config, this.storageTtlMs);
        } catch (error) {
            logger.warn('保存配置失敗:', error);
        }
    }
    _sanitizeConfig(raw) {
        const d = this.config;
        return {
            shuffleQuestions: typeof raw.shuffleQuestions === 'boolean' ? raw.shuffleQuestions : d.shuffleQuestions,
            shuffleOptions: typeof raw.shuffleOptions === 'boolean' ? raw.shuffleOptions : d.shuffleOptions,
            autoSave: typeof raw.autoSave === 'boolean' ? raw.autoSave : d.autoSave,
            showExplanation: typeof raw.showExplanation === 'boolean' ? raw.showExplanation : d.showExplanation,
            passingScore: Number.isInteger(raw.passingScore)
                ? Math.min(100, Math.max(0, raw.passingScore))
                : d.passingScore,
            drawQuestionCount: Number.isInteger(raw.drawQuestionCount) && raw.drawQuestionCount >= 0
                ? raw.drawQuestionCount
                : d.drawQuestionCount,
            customDrawCount: Number.isInteger(raw.customDrawCount) && raw.customDrawCount >= 1
                ? raw.customDrawCount
                : d.customDrawCount
        };
    }
    loadConfig() {
        try {
            const savedConfig = this._lsGetWithTtl('examConfig');
            if (savedConfig) {
                this.config = this._sanitizeConfig(savedConfig);
                const sqEl = document.getElementById('shuffle-questions');
                if (sqEl) sqEl.checked = this.config.shuffleQuestions;
                const soEl = document.getElementById('shuffle-options');
                if (soEl) soEl.checked = this.config.shuffleOptions;
                const seEl = document.getElementById('show-explanation');
                if (seEl) seEl.checked = this.config.showExplanation;
                const psEl = document.getElementById('passing-score');
                if (psEl) psEl.value = this.config.passingScore;
                const dsEl = document.getElementById('draw-question-select');
                const dciEl = document.getElementById('draw-custom-input');
                if (dsEl) {
                    const val = this.config.drawQuestionCount;
                    if (['0', '10', '20', '30', '50', '100'].includes(String(val))) {
                        dsEl.value = String(val);
                        if (dciEl) dciEl.style.display = 'none';
                    } else {
                        dsEl.value = 'custom';
                        if (dciEl) {
                            dciEl.value = String(val);
                            dciEl.style.display = 'block';
                        }
                    }
                }
                if (dciEl && this.config.customDrawCount) {
                    dciEl.value = String(this.config.customDrawCount);
                }
            }
        } catch (error) {
            logger.warn('載入配置失敗:', error);
        }
    }
    selectOptionByNumber(optionIndex) {
        const question = this.questions[this.currentQuestionIndex];
        if (!question || optionIndex >= question.options.length) return;
        const optionValue = String.fromCharCode(65 + optionIndex);
        const container = document.getElementById('options-container');
        const optionElement = container ? container.querySelector(`input[value="${optionValue}"]`) : null;
        if (optionElement) {
            optionElement.checked = true;
            optionElement.closest('.option').classList.add('selected');
            this.selectOption(question.id, optionValue, optionElement.closest('.option'));
        }
    }
    _debounce(fn, delay = 400) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    }
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
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }
    generateAnalysis(wrongAnswers, examDuration) {
        document.querySelectorAll('.analysis-section').forEach(el => el.remove());
        const analysisContainer = this.createAnalysisSection();
        const reviewSection = document.querySelector('.review-section');
        reviewSection.parentNode.insertBefore(analysisContainer, reviewSection);
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
    _validateRecordsSchema(records) {
        if (!Array.isArray(records)) return false;
        if (records.length > 100) return false;
        for (const r of records) {
            if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
            if (typeof r.score !== 'number' || r.score < 0 || r.score > 100) return false;
            if (typeof r.correctCount !== 'number' || !Number.isInteger(r.correctCount) || r.correctCount < 0) return false;
            if (typeof r.totalCount !== 'number' || !Number.isInteger(r.totalCount) || r.totalCount < 0) return false;
            if (typeof r.isPassed !== 'boolean') return false;
            if (typeof r.date !== 'string') return false;
        }
        return true;
    }
    saveExamRecord() {
        try {
            const rawRecords = this._lsGetWithTtl('examRecords');
            const records = (rawRecords !== null && this._validateRecordsSchema(rawRecords))
                ? rawRecords
                : [];
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
            records.unshift(newRecord);
            if (records.length > 10) {
                records.splice(10);
            }
            this._lsSetWithTtl('examRecords', records, this.storageTtlMs);
        } catch (error) {
            logger.warn('保存考試記錄失敗:', error);
        }
    }
    showExamHistory() {
        try {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            });
            const rawRecords = this._lsGetWithTtl('examRecords');
            const records = (rawRecords !== null && this._validateRecordsSchema(rawRecords))
                ? rawRecords
                : [];
            if (records.length === 0) {
                alert('暫無考試記錄');
                return;
            }
            const historyModal = this.createHistoryModal();
            document.body.appendChild(historyModal);
            const list = historyModal.querySelector('.history-list');
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
        closeBtn.addEventListener('click', () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }
        });
        const escKeyHandler = (e) => {
            if (e.key === 'Escape' && document.body.contains(modal)) {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', escKeyHandler);
            }
        };
        document.addEventListener('keydown', escKeyHandler);
        return modal;
    }
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
    _lsSetWithTtl(key, value, ttlMs) {
        try {
            const now = Date.now();
            const record = { value, _ts: now, _ttl: ttlMs };
            localStorage.setItem(key, JSON.stringify(record));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('LocalStorage 容量已滿，嘗試清理舊資料...');
                try {
                    const records = JSON.parse(localStorage.getItem('examRecords') || '[]');
                    if (records.length > 5) {
                        localStorage.setItem('examRecords', JSON.stringify(records.slice(0, 5)));
                        localStorage.setItem(key, JSON.stringify({ value, _ts: now, _ttl: ttlMs }));
                        console.log('已清理部分歷史記錄並成功儲存');
                    } else {
                        throw error;
                    }
                } catch (retryError) {
                    console.error('LocalStorage 空間不足且清理失敗:', retryError);
                    this.showErrorMessage('儲存空間不足，請清除瀏覽器快取或歷史記錄');
                }
            } else {
                console.error('LocalStorage 儲存失敗:', error);
                throw error;
            }
        }
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
    _getSelectedBankInfo() {
        try {
            const sel = document.getElementById('question-bank-select');
            if (sel) {
                const opt = sel.selectedOptions && sel.selectedOptions[0];
                return { value: sel.value || this.selectedQuestionBank, label: (opt && opt.textContent) || sel.value };
            }
        } catch { }
        return { value: this.selectedQuestionBank, label: this.selectedQuestionBank };
    }
    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    _getElement(id, warnIfMissing = true) {
        const element = document.getElementById(id);
        if (!element && warnIfMissing) {
            console.warn(`找不到元素: #${id}`);
        }
        return element;
    }
    _querySelector(selector, warnIfMissing = true) {
        const element = document.querySelector(selector);
        if (!element && warnIfMissing) {
            console.warn(`找不到元素: ${selector}`);
        }
        return element;
    }
}
let examApp;
document.addEventListener('DOMContentLoaded', () => {
    examApp = new ExamApp();
});