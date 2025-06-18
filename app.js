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
        
        // 載入題目數據並初始化
        this.loadQuestions().then(() => {
            this.init();
        });
    }    async loadQuestions() {
        this.isLoading = true;
        this.showLoadingState(true);
        
        try {
            // 嘗試載入完整的題目數據
            let response;
            let questions = [];
            
            // 優先載入包含解釋的版本
            try {
                response = await fetch('complete_exam_questions.json');
                if (response.ok) {
                    questions = await response.json();
                    console.log(`從 complete_exam_questions.json 載入 ${questions.length} 個題目`);
                } else {
                    throw new Error('主要題目文件載入失敗');
                }
            } catch (primaryError) {
                console.warn('主要題目文件載入失敗，嘗試備用文件:', primaryError);
                
                // 嘗試載入備用文件
                try {
                    response = await fetch('full_exam_questions_corrected.json');
                    if (response.ok) {
                        questions = await response.json();
                        console.log(`從備用文件載入 ${questions.length} 個題目`);
                    } else {
                        throw new Error('備用題目文件載入失敗');
                    }                } catch (backupError) {
                    console.warn('備用文件載入失敗:', backupError);
                    throw new Error('所有題目文件載入失敗');
                }
            }
            
            // 驗證和標準化題目格式
            this.questions = this.validateAndNormalizeQuestions(questions);
            this.originalQuestions = [...this.questions];
            
            // 嘗試恢復之前的進度
            this.loadSavedProgress();
            
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
            // 確保每個題目都有必要的字段
            const question = {
                id: q.id || (index + 1),
                question: q.question || '題目載入錯誤',
                options: Array.isArray(q.options) ? q.options : [],
                answer: q.answer || 'A',
                explanation: q.explanation || ''
            };
            
            // 如果選項格式不正確，嘗試修復
            if (question.options.length === 0) {
                question.options = ['A. 選項載入錯誤', 'B. 選項載入錯誤', 'C. 選項載入錯誤', 'D. 選項載入錯誤'];
            }
            
            // 確保選項格式一致（以字母開頭）
            question.options = question.options.map((option, idx) => {
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                if (!option.startsWith(`${letter}.`)) {
                    return `${letter}. ${option.replace(/^[A-D]\.?\s*/, '')}`;
                }
                return option;
            });
            
            return question;
        }).filter(q => q.question && q.options.length > 0);
    }
    
    handleLoadError() {
        this.questions = [{
            "id": 1,
            "question": "題目載入失敗，請檢查網路連接並重新整理頁面。",
            "options": ["A. 重新整理頁面", "B. 檢查網路連接", "C. 聯繫技術支援", "D. 稍後再試"],
            "answer": "A",
            "explanation": "請檢查網路連接或重新載入頁面"
        }];
        
        // 顯示錯誤訊息
        this.showErrorMessage('題目載入失敗，請重新整理頁面重試。');
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
        this.bindEvents();
        this.setupConfigPanel();
        this.showPage('home');
        this.updateExamInfo();
    }
    
    setupConfigPanel() {
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
                        <input type="checkbox" id="show-explanation" ${this.config.showExplanation ? 'checked' : ''}>
                        <span>顯示答案解釋</span>
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
        
        document.getElementById('show-explanation').addEventListener('change', (e) => {
            this.config.showExplanation = e.target.checked;
            this.saveConfig();
        });
        
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
            this.showExamHistory();
        });
        
        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('exam-page').classList.contains('active')) {
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.previousQuestion();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextQuestion();
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                        e.preventDefault();
                        this.selectOptionByNumber(parseInt(e.key) - 1);
                        break;
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
        this.startTimer();
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    startTimer() {
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
        
        // 更新題目編號和內容
        document.getElementById('question-number').textContent = this.currentQuestionIndex + 1;
        document.getElementById('question-text').textContent = question.question;
        
        // 更新總題數
        document.getElementById('total-questions').textContent = this.questions.length;
        document.getElementById('current-question').textContent = this.currentQuestionIndex + 1;
        
        // 清除舊選項
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        
        // 生成新選項
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
        
        // 添加視覺反饋
        optionElement.style.transform = 'scale(1.02)';
        setTimeout(() => {
            optionElement.style.transform = '';
        }, 200);
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
    }
    
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
            this.updateProgress();
            this.updateNavigation();
        }
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
            this.updateProgress();
            this.updateNavigation();
        }
    }
      submitExam() {
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
        
        // 統計正確答案和錯誤分析
        const wrongAnswers = [];
        this.questions.forEach(question => {
            const userAnswer = this.userAnswers[question.id];
            if (userAnswer === question.answer) {
                correctCount++;
            } else {
                wrongAnswers.push({
                    question: question,
                    userAnswer: userAnswer || '未作答',
                    correctAnswer: question.answer
                });
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
    
    generateReview() {
        const reviewContainer = document.getElementById('review-container');
        reviewContainer.innerHTML = '';
        
        this.questions.forEach((question, index) => {
            const reviewItem = this.createReviewItem(question, index + 1);
            reviewContainer.appendChild(reviewItem);
        });
    }      createReviewItem(question, questionNumber) {
        const userAnswer = this.userAnswers[question.id];
        const correctAnswer = question.answer;
        const isCorrect = userAnswer === correctAnswer;
        
        const reviewDiv = document.createElement('div');
        reviewDiv.className = 'review-item card';
        
        // 構建選項HTML，標記正確答案和用戶選擇
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
                    <div class="review-question">${question.question}</div>
                    <div class="review-answers">
                        ${optionsHtml}
                    </div>
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
        
        // 移除計時器元素
        const timerElement = document.querySelector('.exam-timer');
        if (timerElement) {
            timerElement.remove();
        }
        
        // 移除分析區塊
        const analysisSection = document.querySelector('.analysis-section');
        if (analysisSection) {
            analysisSection.remove();
        }
        
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
                document.getElementById('shuffle-questions').checked = this.config.shuffleQuestions;
                document.getElementById('show-explanation').checked = this.config.showExplanation;
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
        const optionElement = document.querySelector(`input[value="${optionValue}"]`);
        
        if (optionElement) {
            optionElement.checked = true;
            optionElement.closest('.option').classList.add('selected');
            this.selectOption(question.id, optionValue, optionElement.closest('.option'));
        }
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
            const newRecord = {
                date: new Date().toISOString(),
                score: this.lastExamResult.score,
                correctCount: this.lastExamResult.correctCount,
                totalCount: this.lastExamResult.totalCount,
                duration: this.lastExamResult.duration,
                isPassed: this.lastExamResult.isPassed
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
            const records = JSON.parse(localStorage.getItem('examRecords') || '[]');
            if (records.length === 0) {
                alert('暫無考試記錄');
                return;
            }
            
            const historyHtml = records.map((record, index) => {
                const date = new Date(record.date).toLocaleString('zh-TW');
                const durationText = `${Math.floor(record.duration / 60000)}分${Math.floor((record.duration % 60000) / 1000)}秒`;
                return `
                    <div class="history-item ${record.isPassed ? 'passed' : 'failed'}">
                        <span class="history-date">${date}</span>
                        <span class="history-score">${record.score}分</span>
                        <span class="history-duration">${durationText}</span>
                        <span class="history-status">${record.isPassed ? '通過' : '未通過'}</span>
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
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>考試歷史記錄</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="history-list">
                        ${content}
                    </div>
                </div>
            </div>
        `;
        
        // 綁定關閉事件
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                document.body.removeChild(modal);
            }
        });
        
        return modal;
    }
}

// 應用程式啟動
let examApp; // 全域變數供HTML中使用

document.addEventListener('DOMContentLoaded', () => {
    examApp = new ExamApp();
});
