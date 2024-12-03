'use strict';
/**
 * @typedef {Object} Answer
 * @property {number} qId
 * @property {string} userAnswer
 * @property {boolean} isCorrect
 */
function setActivePage(el) {
    const main = document.getElementById("main");
    const newActivePage = el;
    if (!main || !newActivePage) {
        return;
    }

    const mainInnerPage = main.querySelector(".page.active");
    if (mainInnerPage) {
        mainInnerPage.classList.remove("active");
        document.body.appendChild(mainInnerPage);
    }
    newActivePage.classList.add("active");
    main.appendChild(newActivePage);
}

/**
 * @typedef {Object} Question
 * @property {string} question
 * @property {string} answer
 * @property {number} id
 * @property {string[]} options
 */

/** @param {*[]} array */
function shuffle(array) {
    let numbers = array.length;

    while (numbers) {
        let newIndex = Math.floor(Math.random() * numbers--);
        let temp = array[numbers];
        array[numbers] = array[newIndex];
        array[newIndex] = temp;
    }
}

const ProgressBar = (function () {
    /**
     * @param {HTMLElement} progressContainer 
     * @param {number} leftRange 
     * @param {number} rightRange 
     */
    function ProgressBar(progressContainer, rightRange = 0) {
        this.container = progressContainer;
        if (!this.container) {
            throw new Error("Container is required");
        }

        this.container.insertAdjacentHTML("afterbegin", this.getHTML());

        this.left = this.container.querySelector(".range-left");
        this.right = this.container.querySelector(".range-right");

        this.setRange(0, rightRange);
        this.setCurrent(0);
    }

    ProgressBar.prototype.setRange = function (l, r) {
        this.range = (l < r) ? [l, r] : [r, l];
        this.left.textContent = this.range[0];
        this.right.textContent = this.range[1];
        this.setCurrent(this.barNum);
    }

    /** @param {number} i */
    ProgressBar.prototype.setCurrent = function (i) {
        if (i > this.range[1]) i = this.range[1];
        if (i < this.range[0]) i = this.range[0];
        this.barNum = i;

        let [l, r] = this.range;
        let p = (((this.barNum - l) / (r - l)) * 100).toFixed(2);

        if (p < 0) p = 0;
        if (p > 100) p = 100;

        this._updateCss(this.barNum, p);
    }

    /**
     * @param {number} qLabel 
     * @param {number} fillProcent 
     */
    ProgressBar.prototype._updateCss = function (qLabel, fillProcent) {
        let label = (qLabel == this.range[0] || qLabel == this.range[1]) ? '' : qLabel;
        this.container.style.setProperty("--current-question-number", `'${label}'`);
        this.container.style.setProperty('--progress-width', fillProcent + "%");
    }

    ProgressBar.prototype.next = function () {
        this.setCurrent(this.barNum + 1);
    }
    ProgressBar.prototype.prev = function () {
        this.setCurrent(this.barNum - 1);
    }

    ProgressBar.prototype.getHTML = function () {
        return `
        <div class="progress-container">
            <div class="progress_range">
                <span class="range-left">0</span>
                <span class="range-right">10</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        </div>`
    }

    return ProgressBar;
})();



const QuizGame = (function () {
    /** @param {Question[]} quiz */
    function QuizGame(quiz) {
        this.quizContainer = document.querySelector("#quizQuestion");
        this.resultContainer = document.querySelector("#resultPageContainer");

        this.quizPage = document.querySelector("#quizPage");
        this.resultPage = document.querySelector("#resultPage");
        if (!this.quizContainer || !this.resultContainer || !this.quizPage || !this.resultPage) {
            throw new Error("nulish element");
        }
        setActivePage(this.quizPage);
        this.quiz = quiz;
        this.pb = new ProgressBar(document.getElementById("quizProgress"), this.quiz.length);

        this._initQuiz();

        this.delayms = 1000;
        this.resultHeader = {
            againBtnHTML: '<button type="button" class="result_btn-again btn">Пройти еще раз</button>',
            "perfect": {
                title: "Поздравляем!",
                description: "Вы правильно ответили на все вопросы.<br>Вы действительно отлично разбираетесь в IT.",
                again: false
            },
            "good": {
                title: "Хороший результат!",
                description: "Вы ответили правильно на $ вопросов.<br>Так держать!",
                again: true
            },
            "weak": {
                title: "Можно лучше!",
                description: "Вы ответили правильно на $ вопросов.",
                again: true
            },
            "bad": {
                title: "Упс :(",
                description: "Вы неправильно ответили на все вопросы.<br>Нужно подучить теорию.",
                again: true
            }
        }
    }

    QuizGame.prototype._initQuiz = function () {
        /** @type {Answer[]} */
        this.answers = [];
        this.currentQuestionIdx = 0;

        this.updatePB();
        QuizGame.shuffleQuiz(this.quiz);
        this._initQuestion(this.currentQuestionIdx);
    }

    QuizGame.prototype.updatePB = function () {
        this.pb.setCurrent(this.currentQuestionIdx);
    }

    QuizGame.prototype._initQuestion = function (i) {
        if (i < 0 || i > this.quiz.length)
            throw new Error("Wrong array index");

        this.currentQuestionIdx = i;
        this.updatePB();

        if (i === this.quiz.length) {
            this.initResults();
            return;
        }

        let qq = this.quiz[i];
        this.quizContainer.innerHTML = this.getHTML(qq);
        let options = this.quizContainer.querySelectorAll("input[type='radio']");

        options.forEach((op) => {
            op.addEventListener("change", (e) => {
                let radio = e.target;

                options.forEach((item) => {
                    if (item.id !== radio.id) {
                        item.disabled = true;
                    }
                });

                setTimeout(() => {
                    this.answers.push({
                        qId: qq.id,
                        answer: radio.value,
                        isCorrect: radio.value === qq.answer
                    });

                    this._initQuestion(this.currentQuestionIdx + 1);
                }, this.delayms);
            })
        });
    }

    QuizGame.prototype.initResults = function () {
        setActivePage(this.resultPage);

        const correctCount = this.answers.reduce((acc, val) => acc + val.isCorrect, 0);
        const detailsHTML = this.answers.reduce((acc, val) => {
            const question = this.quiz.find((q) => q.id === val.qId);
            return acc + `<div class="detail_container detail-${val.isCorrect ? 'accepted' : 'wrong'}">
                    <h5>${question.question}</h5>
                    <p>${question.answer}</p>
                </div>`
        }, "");

        let header;
        switch (true) {
            case correctCount === this.quiz.length:
                header = this.resultHeader["perfect"];
                break;
            case correctCount === 0:
                header = this.resultHeader["bad"];
                break;
            case correctCount >= Math.floor(this.quiz.length / 2):
                header = this.resultHeader["good"];
                break;
            default:
                header = this.resultHeader["weak"];
                break;
        }

        const resultHTML = `<div class="result_header header">
                <h1 class="header_title">${header.title}</h1>
                <p class="header_description">${header.description.replace("$", correctCount)}</p>
            </div>
            <div class="result_detail detail">${detailsHTML}</div>
            ${header.again ? this.resultHeader["againBtnHTML"] : ''}
            `

        this.resultContainer.innerHTML = resultHTML;
        const btn = this.resultContainer.querySelector(".result_btn-again");
        if (!btn)
            return;
        btn.addEventListener("click", this.restart.bind(this));
    }

    QuizGame.prototype.restart = function () {
        setActivePage(this.quizPage);
        this._initQuiz();
    }

    QuizGame.prototype.getHTML = function (question) {
        let optionsHTML = question.options.reduce((acc, val, i) => {
            let radioId = "radio-" + question.id + i;
            return acc + `<li class="options-item">
                    <input type="radio" name="radio" id="${radioId}" value=${JSON.stringify(val)}>
                    <label for="${radioId}">${val}</label>
                </li>`
        }, "");

        return `<h4 class="question_title">${question.question}</h4>
            <ul class="question_options options">${optionsHTML}</ul>`;
    }

    /** @param {Question[]} quiz */
    QuizGame.shuffleQuiz = function (quiz) {
        shuffle(quiz);
        quiz.forEach((question) => shuffle(question.options));
    }

    return QuizGame;
})();

quiz.length = Math.floor(Math.random() * quiz.length);
let qq = new QuizGame(quiz);
// setActivePage("#resultPage");