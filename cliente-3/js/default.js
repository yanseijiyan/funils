var trim = function (x) {
    return x.replace(/^\s+|\s+$/gm, '');
};
// cookie
var setCookie = function (name, value, expires, path, domain, secure) {

    if (!name) {
        return false;
    }
    var str = name + '=' + encodeURIComponent(value);
    if (expires) {
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + expires);
        str += '; expires=' + exdate.toGMTString();
    }
    if (path) {
        str += '; path=' + path;
    }
    if (domain) {
        str += '; domain=' + domain;
    }
    if (secure) {
        str += '; secure';
    }
    str += ';SameSite=Lax';
    document.cookie = str;
    return true;
};
var getCookie = function (name) {
    var pattern = "(?:; )?" + name + "=([^;]*);?";
    var regexp = new RegExp(pattern);
    if (regexp.test(document.cookie)) {
        return decodeURIComponent(RegExp["$1"]);
    }

    return false;
};
var deleteCookie = function (name, path, domain) {
    setCookie(name, null, -1, path, domain);
    return true;
};
// event
var addEvent = function (obj, type, fn) {
    if (!(obj instanceof HTMLElement || obj instanceof Window)) {
        console.log('obj is not HTMLElement');
        return;
    }
    if (obj.addEventListener) {
        obj.addEventListener(type, fn, false);
    } else if (obj.attachEvent) {
        obj.attachEvent(type, fn);
    } else if (obj.addEvent) {
        obj.addEvent(type, fn);
    }
};
var initEvent = function (obj, type, context) {
    var event = document.createEvent('Event');
    event.initEvent(type, true, true);
    event.context = context;
    obj.dispatchEvent(event);
};
// class
var toggleClass = function (el, v) {
    if (el instanceof Array || el instanceof NodeList) {
        for (var i = 0, l = el.length; i < l; i++) {
            toggleClass(el[i], v);
        }
        return;
    }
    hasClass(el, v) ? removeClass(el, v) : addClass(el, v);
};
var hasClass = function (el, v) {
    return el.className.split(' ').indexOf(v) > -1;
};
var addClass = function (el, v) {
    if (el instanceof Array || el instanceof NodeList) {
        for (var i = 0, l = el.length; i < l; i++) {
            addClass(el[i], v);
        }
        return;
    }
    if (hasClass(el, v)) {
        return;
    }
    var el_v = el.className.split(' ');
    el_v.push(v);
    el.className = trim(el_v.join(' '));
};
var removeClass = function (el, v) {
    if (el instanceof Array || el instanceof NodeList) {
        for (var i = 0, l = el.length; i < l; i++) {
            removeClass(el[i], v);
        }
        return;
    }
    if (hasClass(el, v) === false) {
        return;
    }
    var el_v = el.className.split(' ');
    var el_pos = el_v.indexOf(v);
    el_v.splice(el_pos, 1);
    el.className = trim(el_v.join(' '));
};
// ajax
var ajax = function () {
    var ajax = {};
    ajax.x = function () {
        if (typeof XMLHttpRequest !== 'undefined') {
            return new XMLHttpRequest();
        }
        var versions = [
            "MSXML2.XmlHttp.6.0",
            "MSXML2.XmlHttp.5.0",
            "MSXML2.XmlHttp.4.0",
            "MSXML2.XmlHttp.3.0",
            "MSXML2.XmlHttp.2.0",
            "Microsoft.XmlHttp"
        ];

        var xhr;
        for (var i = 0; i < versions.length; i++) {
            try {
                xhr = new ActiveXObject(versions[i]);
                break;
            } catch (e) {
            }
        }
        return xhr;
    };

    ajax.send = function (url, callback, method, data, async) {
        if (async === undefined) {
            async = true;
        }
        var x = ajax.x();
        x.open(method, url, async);
        x.onreadystatechange = function () {
            var responseText;
            if (x.readyState == 4) {
                try {
                    responseText = JSON.parse(x.responseText);
                } catch (e) {
                    responseText = x.responseText;
                }
                if (x.status == 200) {
                    if (typeof callback == 'function') {
                        callback(responseText);
                    } else if (typeof callback == 'object' && 'onsuccess' in callback) {
                        callback['onsuccess'](responseText);
                    }

                } else {
                    if (typeof callback == 'object' && 'onerror' in callback) {
                        callback['onerror'](responseText);
                    }
                }
            }
        };
        x.setRequestHeader('X-REQUESTED-WITH', 'XMLHttpRequest');
        x.setRequestHeader('Accept', 'application/json;charset=utf-8');
        if (method == 'POST') {
            x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        }
        x.send(data)
    };

    ajax.get = function (url, data, callback, async) {
        var query = [];
        for (var key in data) {
            query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
        }
        ajax.send(url + (query.length ? '?' + query.join('&') : ''), callback, 'GET', null, async)
    };
    ajax.post = function (url, data, callback, async) {
        var query = [];
        if (typeof data == 'object') {
            for (var key in data) {
                query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
            }
            query = query.join('&');
        } else if (typeof data == 'string') {
            query = data;
        }
        ajax.send(url, callback, 'POST', query, async)
    };
    return ajax;
}();

function strip_tags(str, allow) {
    if (typeof str !== 'string') {
        return '';
    }
    // making sure the allow arg is a string containing only tags in lowercase (<a><b><c>)
    allow = (((allow || '') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');

    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    var commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return str.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
        return allow.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
    });
}

var copyObject = function (object) {
    return JSON.parse(JSON.stringify(object))
};
var deepMerge = function (target, source) {
    if (typeof target !== 'object' || typeof source !== 'object') {
        throw new Error("target or source or both ain't objects, merging doesn't make sense");
    }
    for (var prop in source) {
        if (!source.hasOwnProperty(prop)) {
            continue;
        }
        if (prop in target) {
            if (typeof target[prop] !== 'object') {
                target[prop] = source[prop];
            } else {
                if (typeof source[prop] !== 'object') {
                    target[prop] = source[prop];
                } else {
                    if (target[prop].concat && source[prop].concat) {
                        target[prop] = target[prop].concat(source[prop]);
                    } else {
                        target[prop] = this.deepMerge(target[prop], source[prop]);
                    }
                }
            }
        } else {
            target[prop] = source[prop];
        }
    }
    return target;
};
var makeid = function (length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
};

const getBrowser = () => {
    const userAgent = navigator.userAgent;
    let browser = 'unkown';
    // Detect browser name
    browser = /ucbrowser/i.test(userAgent) ? 'UCBrowser' : browser;
    browser = /edg/i.test(userAgent) ? 'Edge' : browser;
    browser = /googlebot/i.test(userAgent) ? 'GoogleBot' : browser;
    browser = /chromium/i.test(userAgent) ? 'Chromium' : browser;
    browser =
        /firefox|fxios/i.test(userAgent) && !/seamonkey/i.test(userAgent)
            ? 'Firefox'
            : browser;
    browser =
        /; msie|trident/i.test(userAgent) && !/ucbrowser/i.test(userAgent)
            ? 'IE'
            : browser;
    browser =
        /chrome|crios/i.test(userAgent) &&
        !/opr|opera|chromium|edg|ucbrowser|googlebot/i.test(userAgent)
            ? 'Chrome'
            : browser;
    browser =
        /safari/i.test(userAgent) &&
        !/chromium|edg|ucbrowser|chrome|crios|opr|opera|fxios|firefox/i.test(
            userAgent
        )
            ? 'Safari'
            : browser;
    browser = /opr|opera/i.test(userAgent) ? 'Opera' : browser;

    // detect browser version
    switch (browser) {
        case 'UCBrowser':
            return `${browser}/${browserVersion(
                userAgent,
                /(ucbrowser)\/([\d\.]+)/i
            )}`;
        case 'Edge':
            return `${browser}/${browserVersion(
                userAgent,
                /(edge|edga|edgios|edg)\/([\d\.]+)/i
            )}`;
        case 'GoogleBot':
            return `${browser}/${browserVersion(
                userAgent,
                /(googlebot)\/([\d\.]+)/i
            )}`;
        case 'Chromium':
            return `${browser}/${browserVersion(
                userAgent,
                /(chromium)\/([\d\.]+)/i
            )}`;
        case 'Firefox':
            return `${browser}/${browserVersion(
                userAgent,
                /(firefox|fxios)\/([\d\.]+)/i
            )}`;
        case 'Chrome':
            return `${browser}/${browserVersion(
                userAgent,
                /(chrome|crios)\/([\d\.]+)/i
            )}`;
        case 'Safari':
            return `${browser}/${browserVersion(
                userAgent,
                /(safari)\/([\d\.]+)/i
            )}`;
        case 'Opera':
            return `${browser}/${browserVersion(
                userAgent,
                /(opera|opr)\/([\d\.]+)/i
            )}`;
        case 'IE':
            const version = browserVersion(userAgent, /(trident)\/([\d\.]+)/i);
            // IE version is mapped using trident version
            // IE/8.0 = Trident/4.0, IE/9.0 = Trident/5.0
            return version
                ? `${browser}/${parseFloat(version) + 4.0}`
                : `${browser}/7.0`;
        default:
            return `unknown/0.0.0.0`;
    }
};
const browserVersion = (userAgent, regex) => {
    return userAgent.match(regex) ? userAgent.match(regex)[2] : null;
};
var quiz = function (el) {
    this.el = el;
    const bar = document.getElementById('slide-header-progress-complete');
    if (bar) {
        this._progress = parseInt(bar.style.width);
    }
    this.init();
    // console.log(this);
    var self = this;
    //self.updateSpeed();
    addEvent(document.body, 'askWindowResponse', function (e) {
        self.processAsk(e);
    });
};
quiz.prototype = {
    _progress: 0,
    slidesCache: {},
    loading: false,
    loadingPrepare: false,
    initialAnswers: null,
    speed: 10,
    fadeAnimationClassname: 'hidden-quiz-body',
    fadeInDelay: 10,
    fadeInDuration: 10,
    fadeOutDuration: 10,
    progressBarSpeed: 10,
    spinnerDelay: 10,
    _events: null,
    _onceEvents: [],
    el: null,
    stylesEl: null,
    jsEl: null,
    formEl: null,
    quizBodyEl: null,
    submitButtonEl: null,
    backButtonEl: null,
    slide: null,
    funnelCode: null,
    currentSlideNumber: null,
    previousSlideNumber: null,
    nextSlideNumber: null,
    currentSlideUrl: null,
    previousSlideUrl: null,
    saveExtraAnswerSlideUrl: null,
    isLastSlide: null,
    isFirstSlide: null,
    sendSessionMeta: false,
    setSessionMetaUrl: null,
    sessionInfo: null,
    template: null,
    assets: null,
    quizSubmitBlockHidden: false,
    submitButtonForceDisable: false,
    autoPass: true,
    previewMode: false,
    processAsk: function (e) {
        var self = this;
        // interval for all form input changes
        setTimeout(function () {
            if (self.saveExtraAnswerSlideUrl === null) {
                console.log('unknown saveExtraAnswerSlideUrl');
                return;
            }

            self.initEvent('beforeProcessAsk');
            ajax.post(self.saveExtraAnswerSlideUrl, self.getAskAnswers(e), function (response) {
                self.initEvent('afterProcessAsk'); // init event before new slide applied
            });
        }, 10);
    },
    getAskAnswers: function (e) {
        //console.log(e);
        if (this.formEl === null) {
            return [];
        }
        var f = new FormData(this.formEl);
        // console.log(f);
        var inp = this.el.querySelector('input[type=hidden]');
        var n = inp.getAttribute('name');
        var result = [
            n + '=' + strip_tags(e.context.question),
            n.replace('[question]', '[answers][]') + '=' + e.context.answer,
            n.replace('[question]', '[id]') + '=' + e.context.id,
        ];

        return result.join('&');
    },
    init: function () {
        if (this._events === null) {
            this._events = [];
        }

        var self = this;
        if (this.el === null) {
            console.log('el is undefined');
            return;
        }

        // form el
        this.formEl = this.el.querySelector('form');
        if (this.formEl) {
            this.formEl.onsubmit = function () {
                return false;
            };
        }

        // process submit button click
        this.submitButtonEl = this.el.querySelector('#quiz-submit-button, #quiz-submit-button-new');
        
        if (this.submitButtonEl) {
            this.submitButtonEl.onclick = function () {
                self.setAutoPass(true);
                self.saveAnswer();
            };
        }

        // process quiz body click
        this.quizBodyEl = this.el.querySelector('#quiz-body');
        if (this.quizBodyEl) {
            //this.quizBodyEl.style.transition = 'opacity ' + this.speed + 'ms ease';

            this.quizBodyEl.onclick = function (e) {
                //console.log('quiz body clicked');
                if (self.loading === true) {
                    //console.log('quiz body prevented');
                    e.preventDefault();
                    return;
                }
                self.disableSubmitButton();
                if (self.hasMultipleQuestion() === false && self.hasTextInputs() === false && self.autoPass === true) {
                    self.saveAnswer();
                }
            };
        }

        // back button
        this.backButtonEl = this.el.querySelector('#slide-header-back-button button');
        if (this.backButtonEl) {
            this.backButtonEl.addEventListener('click', function (e) {
                e.preventDefault();
                self.loadPreviousSlide();
            }, true);
        }

        this.hideSubmitButton();
        this.disableSubmitButton();
        this.updateSessionInfo();

        window.addEventListener('Quiz.SaveAnswer',  (e) =>  {
            this.saveAnswer();
        });
    },
    disableSubmitButton: function () {
        if (this.submitButtonEl === null) {
            return;
        }

        if (this.submitButtonForceDisable) {
            this.submitButtonEl.disabled = true;
        } else {
            this.submitButtonEl.disabled = this.hasMultipleQuestion() && this.hasEmptyQuestion();
        }
    },
    setSubmitButtonForceDisabled: function (_status) {
        this.submitButtonForceDisable = _status;
    },
    setAutoPass: function (_status) {
        this.autoPass = _status;
    },
    hideSubmitButton: function () {
        if (this.submitButtonEl === null) {
            return;
        }
        this.quizSubmitBlockHidden = true;
        var a = this.getAnswers();

        if (a.length == 0 || this.hasMultipleQuestion(a) || this.hasNonRadioQuestion() || this.hasAnswers(a)) {
            this.quizSubmitBlockHidden = false;
        }
        this.quizSubmitBlockHidden ? addClass(this.submitButtonEl.parentNode, 'hidden-quiz-submit-block') : removeClass(this.submitButtonEl.parentNode, 'hidden-quiz-submit-block');

        // need to control submit button visibility on quiz body click for some question types 
        this.quizSubmitBlockHidden ? addClass(document.body, 'hidden-quiz-submit-block') : removeClass(document.body, 'hidden-quiz-submit-block');
    },
    hasNonRadioQuestion: function () {
        var a = this.getAnswers();

        for (var i = 0, l = a.length; i < l; i++) {
            if (a[i].type != 'radio') {
                return true;
            }
        }
        return false;
    },
    hasTextInputs: function (a) {
        if (typeof a == 'undefined') {
            a = this.getAnswers();
        }

        for (var i = 0, l = a.length; i < l; i++) {
            if (a[i].type == 'text' || a[i].type == 'email' || a[i].type == 'textarea' || a[i].type == 'tel' || a[i].type == 'date') {
                return true;
            }
        }
        return false;
    },
    hasMultipleQuestion: function (a) {
        if (typeof a == 'undefined') {
            a = this.getAnswers();
        }
        for (var i = 0, l = a.length; i < l; i++) {
            if (a[i].type == 'checkbox' || a[i].type == 'tel' || a[i].type == 'range') {
                return true;
            }
        }
        return false;
    },
    hasQuestions: function (a) {
        if (typeof a == 'undefined') {
            a = this.getAnswers();
        }
        return a.length > 0;
    },
    hasAnswers: function (a) {
        if (typeof a == 'undefined') {
            a = this.getAnswers();
        }
        for (var i = 0, l = a.length; i < l; i++) {
            if (a[i].answers.length > 0) {
                return true;
            }
        }
        return false;
    },
    hasEmptyQuestion: function (a) {
        if (typeof a == 'undefined') {
            a = this.getAnswers();
        }
        for (var i = 0, l = a.length; i < l; i++) {
            if (a[i].answers.length == 0) {
                return true;
            }
            return false;
        }
    },
    setParams: function (params) {
        for (var i in params) {
            this.setParam(i, params[i]);
        }
    },
    setParam: function (name, value) {
        if (name == 'cache') {
            this.updateFunnelSlidesCache(value);
            return;
        }
        if (name in this === false) {
            // console.log('Unknown parameter '+name);
            return;
        }
        var mname = 'update' + name[0].toUpperCase() + name.substring(1);
        var ename = name[0].toUpperCase() + name.substring(1);
        this.initEvent('beforeSet' + ename);
        this[name] = value;
        if (mname in this) {
            this[mname]();
        }
        this.initEvent('afterSet' + ename);
    },
    canSubmit: function () {
        var a = this.getAnswers();
        var l = a.length;

        // prop value page can be submitted
        if (this.hasQuestions(a) === false) {
            return true;
        }

        // slide without answers for question can not be submited
        if (this.hasEmptyQuestion(a)) {
            return false;
        }

        if (this.hasInvalidAnswers()) {
            return false;
        }
        // otherwise do it
        return true;
    },
    hasInvalidAnswers: function () {
        if (this.formEl === null) {
            return false;
        }

        for (let i = 0; i < this.formEl.elements.length; i++) {
            if (this.formEl.elements[i].type !== 'hidden' && !this.formEl.elements[i].validity.valid) {
                return true;
            }
        }

        return this.el.querySelectorAll('input:invalid').length > 0;
    },
    getAnswers: function () {
        if (this.formEl === null) {
            return [];
        }
        var f = new FormData(this.formEl);
        // console.log(f);
        var result = [];
        var item = null;
        // get elements
        var keys = [];
        var el_name, el_type, el_question;
        el_question = this.el.querySelector('input[type=hidden]').value;
        for (var i = 0, l = this.formEl.elements.length; i < l; i++) {
            el_name = this.formEl.elements[i].getAttribute('name');
            el_type = this.formEl.elements[i].getAttribute('type');

            if (el_type === null && this.formEl.elements[i].nodeName === 'TEXTAREA') {
                el_type = 'textarea';
            }

            if (el_name === null || el_type === 'hidden') {
                continue;
            }
            item = {'question': el_question, 'answers': [], 'type': el_type, 'name': el_name};
            if (keys.indexOf(el_question) == -1) {
                keys.push(el_question);
                result.push(item);
            }
        }
        var as;
        for (var i = 0, l = result.length; i < l; i++) {
            result[i].answers = [];
            as = f.getAll(result[i].name);
            for (var j = 0, k = as.length; j < k; j++) {
                if (as[j] === '') {
                    continue;
                }
                result[i].answers.push(as[j]);
            }
        }
        return result;
    },
    saveAnswer: function () {
        if(this.previewMode === true){
            return;
        }
        var self = this;
        //console.log(self.el);
        if (self.loading === true || self.loadingPrepare === true) {
            return;
        }
        if (self.canSubmit() === false) {
            self.formEl.classList.add('invalid')
            return;
        }

        if (self.currentSlideUrl === null) {
            console.log('unknown currentSlideUrl');
            return;
        }
        const d1 = self.getInitialAnswers(); // save previous answers

        self.loadingPrepare = true;
        document.body.classList.add('quiz-loading-process');
        // interval for all form input changes - wait for animations end
        const timeoutValue = this.hasEmptyQuestion() || this.hasMultipleQuestion() ? 0 : ButtonAnimationSpeed + 10;
        setTimeout(function () {
            const d2 = self.getPostAnswers(); // save new answers
            const answersChanged = (d1 !== null && d1 !== d2);
            if (answersChanged) {
                self.clearCache();
            }

            self.loading = true;
            self.loadingPrepare = false;
            //console.log(self.fadeAnimationClassname, self.fadeInDuration, self.fadeInDelay);
            const animation = sliderAnimationManager.setAnimationClass(self.el.parentNode, self.fadeAnimationClassname, self.fadeInDuration, self.fadeInDelay, 'add');
            sliderAnimationManager.showSpinner(self.fadeInDelay + self.fadeInDuration + self.spinnerDelay);

            self.initEvent('beforeSaveAnswers');
            const isLastSlide = self.isLastSlide;

            const nextSlideNumber = self.nextSlideNumber;
            const nextSlide = self.getSlideFromCache(nextSlideNumber);

            if (nextSlide !== null) {

                animation.then(() => {
                    sliderAnimationManager.cancelSpinner();
                    sliderAnimationManager.hideSpinner();
                    self.setParams(nextSlide);
                    self.loading = false;
                    //sliderAnimationManager.animate(self.el.parentNode, 'opacity', 0, 1, self.fadeOutDuration, 0);
                    if (isLastSlide === false) {
                        setTimeout(() => {
                            sliderAnimationManager.setAnimationClass(self.el.parentNode, self.fadeAnimationClassname, self.fadeOutDuration, 0, 'remove');
                            self.animateProgressBar();
                        }, 20);
                    }
                });
                // return;
            }

            ajax.post(self.currentSlideUrl, self.getPostAnswers(), function (response) {
                self.initEvent('afterSaveAnswers'); // init event before new slide applied
                if (nextSlide === null) {
                    animation.then(() => {
                        self.processResponse(response);

                        let stopAnimation = true;
                        if (response instanceof Object) {
                            if (response.data.action === 'redirect') {
                                stopAnimation = false;
                            }
                        } else {
                            stopAnimation = false;
                        }

                        if (stopAnimation) {
                            sliderAnimationManager.cancelSpinner();
                            sliderAnimationManager.hideSpinner();

                            document.body.classList.remove('quiz-loading-process');
                            //sliderAnimationManager.animate(self.el.parentNode, 'opacity', 0, 1, self.fadeOutDuration, 0);
                            setTimeout(() => {
                                self.animateProgressBar();
                                sliderAnimationManager.setAnimationClass(self.el.parentNode, self.fadeAnimationClassname, self.fadeOutDuration, 0, 'remove');
                            }, 10);
                        }
                    });
                } else {
                    self.updateFunnelSlidesCache(response.data.cache);
                }
            });
        }, timeoutValue);

    },
    getInitialAnswers: function () {
        return this.initialAnswers;
    },
    getPostAnswers: function () {
        var a = this.getAnswers();
        var result = [];
        var n;
        for (var i = 0, l = a.length; i < l; i++) {
            n = a[i]['name'];
            result.push(encodeURIComponent(n.replace('[answers][]', '[question]')) + '=' + encodeURIComponent(a[i]['question']));
            for (var i1 = 0, l1 = a[i]['answers'].length; i1 < l1; i1++) {
                result.push(encodeURIComponent(n) + '=' + encodeURIComponent(a[i]['answers'][i1]));
            }
        }
        return result.join('&');
    },
    processResponse: function (response) {
        if (typeof response === 'string') {
            location.reload();
            return false;
        }

        let action = response['data']['action'];
        switch (action) {
            case 'slide':
                this.setParams(response['data']);
                break;
            case 'redirect':
                setTimeout(function () {
                    const w = (window !== window.top) ? window.parent : window;
                    w.location.href = response['data']['url'];
                }, 10);

                break;
        }
        var self = this;
        // clear loading
        setTimeout(function () {
            self.loading = false;
        }, 400);
    },
    clearCache: function () {
        this.slidesCache = {};
        // console.log('Slides cache cleared');
    },
    updateFunnelSlidesCache: function (cache) {
        for (let i = 0, l = cache.length; i < l; i++) {
            this.setSlideToCache(cache[i].number + 1, cache[i].slide);
        }
    },
    setSlideToCache: function (slideNumber, slideData) {
        this.slidesCache[slideNumber] = slideData;
    },
    getSlideFromCache: function (slideNumber) {
        if (slideNumber in this.slidesCache) {
            return this.slidesCache[slideNumber];
        }
        return null;
    },
    updateSessionInfo: function () {
        if(this.previewMode === true){
            return;
        }
        // console.log(this.sendSessionMeta);
        if (this.sendSessionMeta === false) {
            return;
        }
        var self = this;
        if (this.setSessionMetaUrl === null) {
            console.log('unknown setSessionMetaUrl: unable to update session info');
            return;
        }
        this.initEvent('beforeUpdateSessionInfo');
        ajax.post(this.setSessionMetaUrl, this.getSessionInfo(), function () {
            self.sendSessionMeta = false;
            self.initEvent('afterUpdateSessionInfo');
        });
    },
    getSessionInfo: function () {
        if (this.sessionInfo === null) {
            this.sessionInfo = {
                screenHeight: window.screen.height,
                screenWidth: window.screen.width,
                screenColorDepth: window.screen.colorDepth,
                userLanguage: navigator.language || navigator.userLanguage,
                javascript_on: 1,
                operation_system: navigator.platform,
                browser_info: getBrowser()
            };
        }
        return this.sessionInfo;
    },
    loadPreviousSlide: function () {
        if(this.previewMode === true){
            return;
        }
        this.submitButtonForceDisable = false;
        if (this.previousSlideUrl === null) {
            console.log('unknown previousSlideUrl');
            return;
        }
        var self = this;
        if (self.loading === true) {
            return;
        }
        self.loading = true;
        this.initEvent('beforeLoadPreviousSlide');
        //const animation = sliderAnimationManager.animate(self.el.parentNode, 'opacity', 1, 0, self.fadeInDuration, 0);
        const animation = sliderAnimationManager.setAnimationClass(self.el.parentNode, self.fadeAnimationClassname, self.fadeInDuration, self.fadeInDelay, 'add');
        sliderAnimationManager.showSpinner(self.fadeInDuration + self.fadeInDelay + self.spinnerDelay);

        ajax.get(this.previousSlideUrl, {}, function (response) {
            self.initEvent('afterLoadPreviousSlide');
            animation.then(() => {
                sliderAnimationManager.cancelSpinner();
                self.processResponse(response);

                sliderAnimationManager.hideSpinner();
                //sliderAnimationManager.animate(self.el.parentNode, 'opacity', 0, 1, self.fadeOutDuration, 0);        
                //sliderAnimationManager.setAnimationClass(self.el.parentNode, self.fadeAnimationClassname, self.fadeOutDuration, 0, 'remove');
                setTimeout(() => {
                    self.animateProgressBar('back');
                    sliderAnimationManager.setAnimationClass(self.el.parentNode, self.fadeAnimationClassname, self.fadeOutDuration, 0, 'remove');
                }, 10);
            });
        });
    },
    updateTemplate: function () { // automated called method from setParam('template', value)
        addClass(this.el, 'loading');
        var self = this;
        setTimeout(function () {
            self.clearJs();
            var d = document.createElement('div');
            d.innerHTML = self.template;
            var new_el = d.children[0];
            if (self.el.parentNode === null) {
                return;
            }

            const bar = new_el.querySelector('#slide-header-progress-complete');
            if (bar && !bar.classList.contains('milestone-bar')) {
                bar.style.width = self._progress + '%';
            }

            self.el.parentNode.replaceChild(new_el, self.el);
            self.el = new_el;
            if (typeof self.assets == 'object' && self.assets !== null && 'css' in self.assets) {
                self.setCss(self.assets.css);
            } else {
                self.clearCss();
            }
            if (typeof self.assets == 'object' && self.assets !== null && 'js' in self.assets) {
                //console.log(self.assets.js);
                self.setJs(self.assets.js);
            } else {
                self.clearJs();
            }

            self.init();
            self.initEvent('templateUpdated');
            document.dispatchEvent(new Event('quizTemplateUpdated'));

            // save initial answers
            const all_answers = self.getAnswers();
            if (all_answers.length === 0) {
                self.initialAnswers = null;
            } else {
                const current_answers = all_answers[0];

                self.initialAnswers = (current_answers && current_answers['answers'] && current_answers['answers'].length > 0) ? self.getPostAnswers() : null;
            }
        }, 0);
    },
    updateSpeed: function () {
        this.quizBodyEl.style.transition = 'opacity ' + this.speed + 'ms ease';
    },
    updateIsLastSlide: function () {
        document.body.classList.toggle('quiz-last-slide', this.isLastSlide);
    },
    setCss: function (css) {
        if (this.stylesEl === null) {
            this.setStyleContainer();
        }

        this.stylesEl.innerHTML = css;
    },
    clearCss: function () {
        if (this.stylesEl === null) {
            this.setStyleContainer();
        }
        this.stylesEl.innerHTML = '';
    },
    setStyleContainer: function () {
        var el = document.createElement('div');
        document.body.appendChild(el);
        this.stylesEl = el;
    },
    setJs: function (js) {
        if (this.jsEl === null) {
            this.setJsContainer();
        }
        this.jsEl.innerHTML = js;
        var r = [];
        for (var i = 0, l = this.jsEl.children.length; i < l; i++) {
            r.push({src: this.jsEl.children[i].getAttribute('src'), script: this.jsEl.children[i].innerHTML});
        }
        this.jsEl.innerHTML = '';
        var el = null;
        // insert script files first
        for (var i = 0, l = r.length; i < l; i++) {
            if (r[i].src === null) {
                continue;
            }
            el = document.createElement('script');
            el.setAttribute('src', r[i]['src']);
            this.jsEl.appendChild(el);
        }
        // run inline scripts
        for (var i = 0, l = r.length; i < l; i++) {
            if (r[i].src !== null) {
                continue;
            }

            try {
                eval.call(window, r[i]['script']);
            } catch (e) {
                console.error(e);
            }
        }
    },
    clearJs: function () {
        if (this.jsEl === null) {
            this.setJsContainer();
        }
        this.jsEl.innerHTML = '';
    },
    setJsContainer: function () {
        var el = document.createElement('div');
        document.body.appendChild(el);
        this.jsEl = el;
    },
    animateProgressBar: function (mode) {
        if (typeof mode === 'undefined') {
            mode = 'forward';
        }
        const bar = document.getElementById('slide-header-progress-complete');
        if (!bar) {
            return;
        }

        if (bar.classList.contains('milestone-bar')) {
            setTimeout(function () {
                updateMilestoneProgress(mode);
            }, 50);
            return;
        }

        const targetWidth = bar.dataset.targetWidth * 1;

        if (mode === 'back') {
            if (this._progress <= targetWidth) {
                return;
            }
        } else {
            if (this._progress >= targetWidth) {
                return;
            }
        }

        setTimeout(() => {
            bar.style.width = targetWidth + '%';
            this._progress = targetWidth;
        }, 50);
    },
    addEvent: function (name, cb, once) {
        if (once) {
            if (name in this._onceEvents === false) {
                this._onceEvents[name] = [];
            }

            this._onceEvents[name].push(cb);
        } else {
            if (name in this._events === false) {
                this._events[name] = [];
            }

            this._events[name].push(cb);
        }
    },
    initEvent: function (name) {
        if (name in this._events === true) {
            for (var i = 0, l = this._events[name].length; i < l; i++) {
                this._events[name][i].call(this);
            }
        }

        if (name in this._onceEvents === true) {
            for (var i = 0, l = this._onceEvents[name].length; i < l; i++) {
                this._onceEvents[name][i].call(this);
            }

            this._onceEvents[name] = [];
        }
    },
    canShowEmailErrorModal: function () {
        var self = this;
        if (
            self.slide
            && self.slide.error
            && self.slide.type
            && ('email_input' === self.slide.type)
            && document.getElementById('email-error-modal')
        ) {
            return true;
        }

        return false;
    }
};
var initQuiz = function (target, params) {
    var el = document.querySelector(target);
    var result = new quiz(el);
    result.setParams(params);
    result.updateSessionInfo();
    // console.log('Quiz initialized', result);
    // moved
    QuizEvents.quiz = result;

    result.addEvent('afterUpdateSessionInfo', function () {
        QuizEvents.dispatch('Quiz.SessionStarted', {quiz: this});
    });

    // !!!!!!!!!!!!!!!!!!
    // $setAutoPass
    if (typeof params.setAutoPassParam !== 'undefined' && params.setAutoPassParam === true) {
        result.setAutoPass(false);
    }

    // ABTest Amplitude
    result.addEvent('templateUpdated', function () {
        let element = document.getElementById('quiz-ab-variations');
        let amplitudeData = [];
        if (element) {
            amplitudeData = JSON.parse(element.textContent);
        }

        for (let i = 0; i < amplitudeData.length; i++) {
            AmplitudeManager.identify(amplitudeData[i].code, amplitudeData[i].variation);
        }
    });

    // on page load actions
    (function () {
        if (!result.slide.isFirst) {
            window.dispatchEvent(new CustomEvent('FacebookManager.initPixel'));
        }
        QuizEvents.dispatch('Quiz.Slide', {quiz: result});

        let element = document.getElementById('quiz-ab-variations');
        let amplitudeData = [];
        if (element) {
            amplitudeData = JSON.parse(element.textContent);
        }

        for (let i = 0; i < amplitudeData.length; i++) {
            AmplitudeManager.identify(amplitudeData[i].code, amplitudeData[i].variation);
        }

        setInterval(() => {
            let el = document.querySelector('.slide-chat-wrapper');
            if (el) {
                document.scrollingElement.scrollTop = 0;
                document.body.style.height = window.visualViewport.height + 'px';
            }
        }, 10);

        // initAnimation
        if (typeof sliderAnimationManager !== 'undefined') {
            const fadeInDelay = result.fadeInDelay;
            const fadeInDuration = result.fadeInDuration;
            const fadeOutDuration = result.fadeOutDuration;
            const fadeClassname = result.fadeAnimationClassname;
            const progressBarSpeed = result.progressBarSpeed;

            // fade in
            sliderAnimationManager.setStyle('.page-wrapper>#quiz-container #quiz-body', 'opacity', '1');
            sliderAnimationManager.setStyle('.page-wrapper>#quiz-container #quiz-body', 'transition', 'opacity ' + fadeOutDuration + 'ms ease'); // fade out speed

            sliderAnimationManager.setStyle('body.quiz-last-slide .page-wrapper>#quiz-container #slide-header', 'opacity', '1');
            sliderAnimationManager.setStyle('body.quiz-last-slide .page-wrapper>#quiz-container #slide-header', 'transition', 'opacity ' + fadeOutDuration + 'ms ease'); // fade out speed

            sliderAnimationManager.setStyle('body.quiz-last-slide .page-wrapper>#quiz-container #quiz-submit-block', 'opacity', '1');
            sliderAnimationManager.setStyle('body.quiz-last-slide .page-wrapper>#quiz-container #quiz-submit-block', 'transition', 'opacity ' + fadeOutDuration + 'ms ease'); // fade out speed


            // fade out
            sliderAnimationManager.setStyle('.page-wrapper.' + fadeClassname + '>#quiz-container #quiz-body', 'opacity', '0');
            sliderAnimationManager.setStyle('.page-wrapper.' + fadeClassname + '>#quiz-container #quiz-body', 'transition', 'opacity ' + fadeInDuration + 'ms ease'); // fade in speed

            sliderAnimationManager.setStyle('body.quiz-last-slide .page-wrapper.' + fadeClassname + '>#quiz-container #slide-header', 'opacity', '0');
            sliderAnimationManager.setStyle('body.quiz-last-slide .page-wrapper.' + fadeClassname + '>#quiz-container #slide-header', 'transition', 'opacity ' + fadeInDuration + 'ms ease'); // fade in speed

            sliderAnimationManager.setStyle('body.quiz-last-slide .page-wrapper.' + fadeClassname + '>#quiz-container #quiz-submit-block', 'opacity', '0');
            sliderAnimationManager.setStyle('body.quiz-last-slide .page-wrapper.' + fadeClassname + '>#quiz-container #quiz-submit-block', 'transition', 'opacity ' + fadeInDuration + 'ms ease'); // fade in speed

            // fade in (without-wrapper layout: #quiz-container is a direct child of body)
            sliderAnimationManager.setStyle('body>#quiz-container #quiz-body', 'opacity', '1');
            sliderAnimationManager.setStyle('body>#quiz-container #quiz-body', 'transition', 'opacity ' + fadeOutDuration + 'ms ease');
            sliderAnimationManager.setStyle('body.quiz-last-slide>#quiz-container #slide-header', 'opacity', '1');
            sliderAnimationManager.setStyle('body.quiz-last-slide>#quiz-container #slide-header', 'transition', 'opacity ' + fadeOutDuration + 'ms ease');
            sliderAnimationManager.setStyle('body.quiz-last-slide>#quiz-container #quiz-submit-block', 'opacity', '1');
            sliderAnimationManager.setStyle('body.quiz-last-slide>#quiz-container #quiz-submit-block', 'transition', 'opacity ' + fadeOutDuration + 'ms ease');

            // fade out (without-wrapper layout)
            sliderAnimationManager.setStyle('body.' + fadeClassname + '>#quiz-container #quiz-body', 'opacity', '0');
            sliderAnimationManager.setStyle('body.' + fadeClassname + '>#quiz-container #quiz-body', 'transition', 'opacity ' + fadeInDuration + 'ms ease');
            sliderAnimationManager.setStyle('body.quiz-last-slide.' + fadeClassname + '>#quiz-container #slide-header', 'opacity', '0');
            sliderAnimationManager.setStyle('body.quiz-last-slide.' + fadeClassname + '>#quiz-container #slide-header', 'transition', 'opacity ' + fadeInDuration + 'ms ease');
            sliderAnimationManager.setStyle('body.quiz-last-slide.' + fadeClassname + '>#quiz-container #quiz-submit-block', 'opacity', '0');
            sliderAnimationManager.setStyle('body.quiz-last-slide.' + fadeClassname + '>#quiz-container #quiz-submit-block', 'transition', 'opacity ' + fadeInDuration + 'ms ease');

            // progress bar
            sliderAnimationManager.setStyle('#slide-header-progress-complete', 'transition', 'width ' + progressBarSpeed + 'ms ease-in-out');

        }

        // ping-pong start
        if (typeof connectionTester !== 'undefined') {
            connectionTester.start();
        }
    })();

    const getSlideId = function(slide){
        if('alias' in slide && slide.alias !== null && slide.alias !== '') {
            return slide.alias;
        }
        return slide.code;
    }

    // init Facebook Pixel
    result.addEvent('afterSetSlide', function () {
        if (!result.slide.isFirst) {
            window.dispatchEvent(new CustomEvent('FacebookManager.initPixel', {detail: {sendPageView: true}}));
        }
    });

    //scroll to top
    result.addEvent('afterSetSlide', function () {
        if(document.documentElement.scrollHeight > document.documentElement.clientHeight){
            document.documentElement.scrollTop = 0;
        }else {
            var myDiv = document.querySelector('.page-wrapper');
            if (myDiv) {
                myDiv.scrollTop = 0;
            }
        }
    });

    // track every slide (trackers event Quiz.SetSlide + amplitude)
    result.addEvent('afterSetSlide', function () {
        QuizEvents.dispatch('Quiz.SetSlide', {quiz: result});

        let url = new URL(location.href);
        let urlParts = url.pathname.split('/').filter(v => v);

        AmplitudeManager.identifyOnce('Funnel Name', urlParts[0]);
        AmplitudeManager.identifyOnce('SessionID', urlParts[1]);

        AmplitudeManager.track(getSlideId(result.slide));
        EventJournalManager.track('StepView', {
            step_question: result.slide.question,
            step_code: result.slide.code,
            step_number: result.slide.idx,
            step_type_id: result.slide.type,
            level_num: result.slide.levelNum
        });
    });

    // apply bodyStyles
    result.addEvent('afterSetSlide', function () {
        let bodyStyles = result.slide?.viewParameters?.bodyStyles;

        if (bodyStyles) {
            for (let k in bodyStyles) {
                document.body.style[k] = bodyStyles[k];
            }
        } else {
            document.body.removeAttribute('style');
        }
    });

    result.initEvent('afterSetSlide');

    // send askAnswers to amplitude
    document.body.addEventListener('askWindowResponse', function (e) {
        var a = e.context;

        AmplitudeManager.identify('P' + result.slide.idx + '_' + a.id, getSlideId(result.slide) + '_' + a.id + '$' + strip_tags(a.question).replace(' ', '_') + '$' + a.answer);
        AmplitudeManager.track(getSlideId(result.slide) + '_' + a.id);
    });

    document.body.addEventListener('askWindowRequest', function (e) {
        var a = e.context;
        EventJournalManager.track('StepView', {
            step_question: a.question,
            step_code: result.slide.code,
            step_number: result.slide.idx + '_' + a.id,
            step_type_id: result.slide.type,
            level_num: result.slide.levelNum
        });
    });

    result.addEvent('beforeSaveAnswers', function () {
        window.dispatchEvent(new CustomEvent('Quiz.beforeSaveAnswers'));
    });
    // trackers event Quiz.SaveAnswer
    result.addEvent('beforeSaveAnswers', function () {
        QuizEvents.dispatch('Quiz.SaveAnswer');
    });

    // amplitude
    result.addEvent('beforeSaveAnswers', function () {
        var a = result.getAnswers();
        if (a.length > 0) {
            a = a[0].answers.join(';');
        } else {
            a = '';
        }

        AmplitudeManager.identify('P' + result.slide.idx, getSlideId(result.slide) + '$' + strip_tags(result.slide.question).replace(' ', '_') + '$' + a);
    });

    // identify email
    result.addEvent('beforeSaveAnswers', function () {
        if (result.slide.type !== 'email_input') {
            return;
        }
        var a = result.getAnswers();
        if (a.length > 0) {
            a = a[0].answers.join(',');
        } else {
            a = '';
        }
        AmplitudeManager.identify('user_email', a);

        AmplitudeManager.setUserId(a);
        AmplitudeManager.track('Email_Submit');
        EventJournalManager.track('Email_Submit', {
            step_type_id: 'email_input'
        });
    });

    // trackers event Quiz.SaveEmail
    result.addEvent('beforeSaveAnswers', function () {
        if (result.slide.type !== 'email_input') {
            return;
        }

        QuizEvents.dispatch('Quiz.SaveEmail');
    });

    return result;
};

var AnalyticsEventTracker = {
    processLink: function (link, trackers) {
        if (this.disabled === true) {
            return false;
        }

        if (trackers !== undefined) {
            window.location = link.href
            return true;
        }

        link.disabled = true;
        Promise.allSettled(trackers).then(() => {
            window.location = link.href
        });

        return false;
    },
    track: function (trackers) {
        if (trackers !== undefined) {
            Promise.allSettled(trackers);
        }
    }
};

var AmplitudeManager = {
    enable: true,
    verbose: false,
    log: function (str) {
        if (this.verbose === false) {
            return;
        }
        console.log(str);
    },
    identify: function (name, value) {
        if (this.enable === false) {
            return Promise.resolve(null);
        }
        if (typeof amplitude == 'undefined') {
            return Promise.resolve(null);
        }
        this.log('amplitude identify ' + name + ' ' + value);
        let identifyEvent = new amplitude.Identify();
        identifyEvent.set(name, value);
        return amplitude.identify(identifyEvent).promise;
    },
    identifyOnce: function (name, value) {
        if (this.enable === false) {
            return Promise.resolve(null);
        }
        if (typeof amplitude == 'undefined') {
            return Promise.resolve(null);
        }
        this.log('amplitude identify setOnce' + name + ' ' + value);
        let identifyEvent = new amplitude.Identify();
        identifyEvent.setOnce(name, value);
        return amplitude.identify(identifyEvent).promise;
    },
    track: function (name) {
        if (this.enable === false) {
            return Promise.resolve(null);
        }
        if (typeof amplitude == 'undefined') {
            return Promise.resolve(null);
        }
        this.log('amplitude track ' + name);

        return amplitude.track(name).promise;
    },
    setUserId: function (name) {
        if (this.enable === false) {
            return;
        }
        if (typeof amplitude == 'undefined') {
            return;
        }

        name = name.toLowerCase();
        this.log('setUserId ' + name);
        amplitude.setUserId(name);
    },
    processLink: function (link, data) {
        if (this.disabled === true) {
            return false;
        }

        link.disabled = true;
        AmplitudeManager.processWithCb(data, () => {
            window.location = link.href
        });

        return false;
    },
    processWithCb: function (data, cb) {
        let amplitudeActions = [];
        if (data.track) {
            amplitudeActions.push(AmplitudeManager.track(data.track));
        }

        if (data.identify) {
            amplitudeActions.push(AmplitudeManager.identify(data.identify.name, data.identify.value));
        }

        if (data.identifyOnce) {
            amplitudeActions.push(AmplitudeManager.identify(data.identifyOnce.name, data.identifyOnce.value));
        }

        Promise.allSettled(amplitudeActions).then(() => cb());
    }
};

var EventJournalManager = {
    enabled: false,
    defaults: {},
    set: function (k, v) {
        this.defaults[k] = v;
    },
    setSource: function (v) {
        if (this.enabled === false) {
            return false;
        }

        if (typeof EventJournal === 'undefined') {
            return false;
        }

        EventJournal.setSource(v);
    },
    setRef: function (v) {
        if (this.enabled === false) {
            return false;
        }

        if (typeof EventJournal === 'undefined') {
            return false;
        }

        EventJournal.setRef(v);
    },
    track: function (name, data) {
        if (this.enabled === false) {
            return Promise.resolve();
        }

        if (typeof EventJournal === 'undefined') {
            return Promise.resolve();
        }

        return EventJournal.track(name, deepMerge(this.defaults, data));
    }
};

var ask = function (question, id, title, additionalParams) {
    var result = new askWindow();
    result.id = id;

    result.yesBtn = ('object' == typeof additionalParams && 'yesBtn' in additionalParams) ? additionalParams.yesBtn : 'Yes';
    result.noBtn = ('object' == typeof additionalParams && 'noBtn' in additionalParams) ? additionalParams.noBtn : 'No';

    result.init();
    if (title) {
        result.setTitle(title);
    } else {
        result.setTitle('To move forward, specify');
    }
    result.setQuestion(question);
    result.show();
    initEvent(document.body, 'askWindowRequest', {id: id, question: question});
    var p = new Promise(function (resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
    });
    // console.log(p);
    return p;
};

askWindow = function () {
};
askWindow.prototype = {
    el: null,
    id: null,
    titleEl: null,
    bodyEl: null,
    yesEl: null,
    yesBtn: null,
    noBtn: null,
    noEl: null,
    resolve: null,
    reject: null,
    init: function () {
        var ok_icon = '<svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
            '<g clip-path="url(#clip0_2114_6196)">\n' +
            '<path d="M13.4784 6.14424C13.7531 6.4189 13.7531 6.86412 13.4784 7.13864L8.76144 11.8558C8.48679 12.1303 8.0417 12.1303 7.76704 11.8558L5.52158 9.61015C5.24692 9.33563 5.24692 8.89041 5.52158 8.61589C5.7961 8.34123 6.24132 8.34123 6.51584 8.61589L8.26418 10.3642L12.484 6.14424C12.7587 5.86972 13.2039 5.86972 13.4784 6.14424ZM18.5 9C18.5 13.9747 14.4741 18 9.5 18C4.52525 18 0.5 13.9741 0.5 9C0.5 4.02525 4.52594 0 9.5 0C14.4747 0 18.5 4.02594 18.5 9ZM17.0938 9C17.0938 4.80254 13.6969 1.40625 9.5 1.40625C5.30254 1.40625 1.90625 4.80309 1.90625 9C1.90625 13.1975 5.30309 16.5938 9.5 16.5938C13.6975 16.5938 17.0938 13.1969 17.0938 9Z" fill="white"/>\n' +
            '</g>\n' +
            '<defs>\n' +
            '<clipPath id="clip0_2114_6196">\n' +
            '<rect width="18" height="18" fill="white" transform="translate(0.5)"/>\n' +
            '</clipPath>\n' +
            '</defs>\n' +
            '</svg>';
        var no_icon = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
            '<g clip-path="url(#clip0_2114_6201)">\n' +
            '<path d="M2.64669 15.353C3.47142 16.1777 4.43212 16.8253 5.50218 17.2779C6.61073 17.7467 7.78749 17.9845 8.99983 17.9845C10.2121 17.9845 11.3889 17.7467 12.4975 17.2779C13.5675 16.8253 14.5282 16.1776 15.353 15.353C16.1777 14.5282 16.8254 13.5675 17.2779 12.4974C17.7468 11.3889 17.9846 10.2121 17.9846 8.99983C17.9846 7.78746 17.7468 6.6107 17.2779 5.50218C16.8254 4.43212 16.1777 3.47142 15.353 2.64669C14.5282 1.82196 13.5675 1.17432 12.4975 0.721745C11.3889 0.252847 10.2121 0.0151367 8.99983 0.0151367C7.78749 0.0151367 6.61073 0.252877 5.50218 0.721745C4.43212 1.17432 3.47142 1.822 2.64669 2.64669C1.82196 3.47139 1.17432 4.43212 0.721714 5.50215C0.252877 6.6107 0.0151367 7.78746 0.0151367 8.99983C0.0151367 10.2121 0.252877 11.3889 0.721745 12.4974C1.17432 13.5675 1.82199 14.5282 2.64669 15.353ZM8.99983 1.32677C13.2375 1.32677 16.6729 4.76211 16.6729 8.99983C16.6729 13.2375 13.2375 16.6728 8.99983 16.6728C4.76211 16.6728 1.32677 13.2375 1.32677 8.99983C1.32677 4.76211 4.76211 1.32677 8.99983 1.32677Z" fill="#818181"/>\n' +
            '<path d="M9 17.9999C7.78552 17.9999 6.60677 17.7618 5.49638 17.2922C4.42448 16.8388 3.46213 16.19 2.63606 15.3639C1.80992 14.5378 1.16118 13.5754 0.707833 12.5036C0.238139 11.3931 0 10.2143 0 9C0 7.78564 0.238139 6.60683 0.707802 5.49635C1.16115 4.42451 1.80992 3.46216 2.63603 2.63603C3.46213 1.80989 4.42451 1.16115 5.49635 0.707802C6.60683 0.238139 7.78561 0 8.99997 0C10.2144 0 11.3932 0.238139 12.5036 0.707833C13.5754 1.16118 14.5378 1.80995 15.3639 2.63606C16.1901 3.46225 16.8389 4.42461 17.2922 5.49638C17.7619 6.60686 18 7.78564 18 9C18 10.2143 17.7619 11.3931 17.2922 12.5036C16.8389 13.5754 16.1901 14.5377 15.3639 15.364C14.5378 16.19 13.5755 16.8388 12.5036 17.2922C11.3932 17.7618 10.2144 17.9999 9 17.9999ZM9 0.0306169C7.78974 0.0306169 6.615 0.267929 5.50832 0.736001C4.44013 1.18781 3.48102 1.83435 2.6577 2.65767C1.83435 3.48102 1.18781 4.4401 0.736 5.50826C0.267929 6.61497 0.0306169 7.78974 0.0306169 9C0.0306169 10.2102 0.267929 11.385 0.736 12.4917C1.18781 13.5599 1.83435 14.5189 2.6577 15.3423C3.48099 16.1656 4.44007 16.8121 5.50832 17.264C6.61488 17.732 7.78965 17.9693 9 17.9693C10.2103 17.9693 11.3851 17.732 12.4917 17.2639C13.5599 16.8121 14.519 16.1656 15.3423 15.3423C16.1657 14.5189 16.8122 13.5598 17.2639 12.4917C17.732 11.385 17.9694 10.2102 17.9694 9C17.9694 7.78974 17.732 6.61497 17.2639 5.50832C16.8122 4.44019 16.1657 3.48111 15.3423 2.6577C14.5189 1.83438 13.5598 1.18785 12.4917 0.736031C11.3851 0.267929 10.2103 0.0306169 9 0.0306169ZM9 16.6883C6.94637 16.6883 5.01564 15.8886 3.5635 14.4365C2.11137 12.9843 1.31163 11.0536 1.31163 9C1.31163 6.94637 2.11134 5.01564 3.5635 3.5635C5.01564 2.11137 6.94637 1.31163 9 1.31163C11.0536 1.31163 12.9843 2.11137 14.4365 3.5635C15.8886 5.01567 16.6883 6.94637 16.6883 9C16.6883 11.0536 15.8886 12.9843 14.4365 14.4365C12.9843 15.8886 11.0536 16.6883 9 16.6883ZM9 1.34225C6.95454 1.34225 5.03153 2.13881 3.58515 3.58515C2.13881 5.03153 1.34225 6.95454 1.34225 9C1.34225 11.0455 2.13881 12.9685 3.58515 14.4148C5.0315 15.8611 6.95454 16.6577 9 16.6577C11.0455 16.6577 12.9685 15.8611 14.4148 14.4148C15.8612 12.9685 16.6577 11.0454 16.6577 9C16.6577 6.95454 15.8612 5.0315 14.4148 3.58515C12.9684 2.13878 11.0455 1.34225 9 1.34225Z" fill="#818181"/>\n' +
            '<path d="M5.66135 12.3379C5.78942 12.466 5.95723 12.53 6.12508 12.53C6.29292 12.53 6.46076 12.466 6.5888 12.3379L8.99964 9.92706L11.4105 12.3379C11.5385 12.466 11.7064 12.53 11.8742 12.53C12.0421 12.53 12.2099 12.466 12.338 12.3379C12.5941 12.0818 12.5941 11.6666 12.338 11.4105L9.92706 8.99964L12.3379 6.58877C12.594 6.33266 12.594 5.9174 12.3379 5.66132C12.0818 5.40521 11.6666 5.40521 11.4105 5.66132L8.99961 8.07219L6.58877 5.66132C6.33266 5.40521 5.9174 5.40521 5.66132 5.66132C5.40521 5.91743 5.40521 6.33266 5.66132 6.58877L8.07219 8.99964L5.66132 11.4105C5.40524 11.6666 5.40524 12.0818 5.66135 12.3379Z" fill="#818181"/>\n' +
            '<path d="M11.8744 12.5455C11.6951 12.5455 11.5266 12.4757 11.3998 12.3489L8.99979 9.94888L6.59979 12.3489C6.47303 12.4757 6.30449 12.5455 6.12522 12.5455C5.94596 12.5455 5.77742 12.4757 5.65066 12.3489C5.52391 12.2222 5.4541 12.0536 5.4541 11.8744C5.4541 11.6951 5.52391 11.5266 5.65066 11.3998L8.05069 8.99982L5.65066 6.59979C5.38901 6.3381 5.38901 5.91235 5.65066 5.65066C5.77742 5.52391 5.94593 5.4541 6.12522 5.4541C6.30449 5.4541 6.47303 5.52391 6.59979 5.65066L8.99982 8.05069L11.3998 5.65066C11.5266 5.52391 11.6951 5.4541 11.8744 5.4541C12.0536 5.4541 12.2222 5.52391 12.3489 5.65066C12.4757 5.77742 12.5455 5.94596 12.5455 6.12522C12.5455 6.30449 12.4757 6.47303 12.3489 6.59979L9.94888 8.99982L12.349 11.3998C12.4758 11.5266 12.5456 11.6951 12.5456 11.8744C12.5456 12.0536 12.4758 12.2222 12.349 12.3489C12.2221 12.4757 12.0536 12.5455 11.8744 12.5455ZM8.99979 9.90559L11.4215 12.3273C11.5424 12.4483 11.7033 12.5149 11.8744 12.5149C12.0454 12.5149 12.2063 12.4483 12.3273 12.3273C12.4483 12.2063 12.5149 12.0455 12.5149 11.8744C12.5149 11.7033 12.4483 11.5425 12.3273 11.4215L9.90556 8.99982L12.3272 6.57814C12.4482 6.45717 12.5148 6.29631 12.5148 6.12522C12.5148 5.95414 12.4482 5.79331 12.3272 5.67234C12.2063 5.55137 12.0455 5.48475 11.8744 5.48475C11.7033 5.48475 11.5424 5.55137 11.4215 5.67234L8.99979 8.09402L6.57811 5.67234C6.45714 5.55137 6.29628 5.48475 6.12519 5.48475C5.95411 5.48475 5.79328 5.55137 5.67231 5.67234C5.4226 5.92208 5.4226 6.3284 5.67231 6.57814L8.09399 8.99982L5.67231 11.4215C5.55134 11.5425 5.48472 11.7033 5.48472 11.8744C5.48472 12.0455 5.55134 12.2063 5.67231 12.3273C5.79331 12.4483 5.95414 12.5149 6.12522 12.5149C6.29631 12.5149 6.45714 12.4483 6.57814 12.3273L8.99979 9.90559Z" fill="#818181"/>\n' +
            '</g>\n' +
            '<defs>\n' +
            '<clipPath id="clip0_2114_6201">\n' +
            '<rect width="18" height="18" fill="white"/>\n' +
            '</clipPath>\n' +
            '</defs>\n' +
            '</svg> ';
        this.el = document.createElement('div');
        this.el.className = 'ask-window-container';
        this.el.innerHTML = '<div class="ask-window-background"></div><div class="ask-window"><div class="ask-window-title"></div><div class="ask-window-body"></div><div class="ask-window-footer"><button type="button" class="ask-window-yes-button">' + ok_icon + this.yesBtn + '</button><button type="button" class="ask-window-no-button">' + no_icon + this.noBtn + '</button></button></div></div></div>';
        this.titleEl = this.el.querySelector('.ask-window-title');
        this.bodyEl = this.el.querySelector('.ask-window-body');
        this.yesEl = this.el.querySelector('.ask-window-yes-button');
        this.noEl = this.el.querySelector('.ask-window-no-button');
        var self = this;
        this.yesEl.onclick = function () {
            //setTimeout(()=>{
            self.close();
            self.resolve();
            initEvent(document.body, 'askWindowResponse', {
                'answer': 'yes',
                'id': self.id,
                'question': self.bodyEl.innerHTML
            });
            //}, 400);

        };
        this.noEl.onclick = function () {
            //setTimeout(()=>{
            self.close();
            self.resolve();
            initEvent(document.body, 'askWindowResponse', {
                'answer': 'no',
                'id': self.id,
                'question': self.bodyEl.innerHTML
            });
            //}, 400);            
        };
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('askWindowRender'));
        }, 100);
    },
    setTitle: function (v) {
        this.titleEl.innerHTML = v;
    },
    setQuestion: function (v) {
        this.bodyEl.innerHTML = v;
    },
    show: function () {
        document.body.appendChild(this.el);
        document.body.style.overflow = 'hidden';
        document.body.parentNode.style.overflow = 'hidden';
    },
    close: function () {
        if (this.el.parentNode === null) {
            return;
        }
        this.el.parentNode.removeChild(this.el);
        document.body.style.overflow = '';
        document.body.parentNode.style.overflow = '';
    }
};

var initSlickSlider = function (el, params) {
    var p = {
        dots: false,
        arrows: false,
        infinite: true,
        speed: 500,
        fade: false,
        cssEase: 'linear',
        centerPadding: '30px',
        centerMode: true,
    };
    for (i in params) {
        p[i] = params[i];
    }

    let slickEl = $('#' + el + ' .slick-slider-widget-container');
    slickEl.slick(p);

    document.body.addEventListener('askWindowResponse', function () {
        slickEl.slick('slickPlay')
    });
    document.body.addEventListener('askWindowRequest', function () {
        slickEl.slick('slickPause')
    });
};

var handleEmailInput = function (input, invalidEmailText) {
    var a = input.value.split('@');
    var t = a.length > 1 ? a[0] : '';
    var d = a.length > 1 ? a[1] : '';
    var lid = input.parentNode.querySelectorAll('.domain');
    var lis = input.parentNode.querySelectorAll('.name');
    var li = input.parentNode.querySelectorAll('li');
    (t.length > 1) ? addClass(input.parentNode, 'show-dropdown') : removeClass(input.parentNode, 'show-dropdown');
    for (var i = 0, l = lis.length; i < l; i++) {
        lis[i].innerHTML = a[0] + '@';
        (d.length === 0) ? li[i].classList.remove('hidden') : (lid[i].innerHTML.indexOf(d) === 0 ? li[i].classList.remove('hidden') : li[i].classList.add('hidden'));
    }

    if (input.value.length > 0) {
        let regexp = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
        if (regexp.test(input.value) === false) {
            input.setCustomValidity(invalidEmailText);
        } else {
            input.setCustomValidity('');
        }
    } else {
        input.setCustomValidity('');
    }
}

var preloadImages = function (sources, callback) {
    let imgs = [],   // массив HTML-элементов img для предзагрузки картинок
        loaded = []; // массив HTML-элементов img с загруженной картинкой

    // цикл выполнения предзагрузки заданных картинок
    for (let i = 0; i < sources.length; i++) {

        // запуск предзагрузки очередной картинки
        let img = document.createElement("img");
        img.src = sources[i];

        // после окончания предзагрузки картинки поместить ее в массив загруженных,
        // и проверить, если это была последняя из заданных картинок, то запустить
        // функцию callback
        img.addEventListener("load", function () {
            loaded.push(this);
            if (typeof callback === 'function') {
                if (loaded.length === sources.length) {
                    callback();
                }
            }
        });

        imgs.push(img);
    }
}

var EventManager = {
    debug: false,
    listeners: {},
    dispatch: function (eventType, eventData) {
        if (this.debug) {
            console.log('EventManager: dispatch event: ' + eventType);
        }

        if ((eventType in this.listeners) === false) {
            if (this.debug) {
                console.log('EventManager: no listeners for event: ' + eventType);
            }

            return Promise.resolve();
        }

        let promises = [];
        for (let i = 0; i < this.listeners[eventType].length; i++) {
            if (typeof this.listeners[eventType][i] !== 'function') {
                if (this.debug) {
                    console.error('EventManager: Cannot run listener for [' + eventType + ']! Listener is not a function!', this.listeners[eventType][i]);
                }
                continue;
            }
            promises.push(new Promise((resolve, reject) => {
                try {
                    resolve(this.listeners[eventType][i].call(this, eventData, eventType));
                } catch (e) {
                    reject(e);
                }
            }));
        }

        return Promise.all(promises);
    },
    addListener: function (eventType, listener, once) {
        if ((eventType in this.listeners) === false) {
            this.listeners[eventType] = [];
        }

        if (once) {
            if (this.listeners[eventType].includes(listener) === false) {
                this.listeners[eventType].push(listener);
            }
        } else {
            this.listeners[eventType].push(listener);
        }

        return () => {
            let idx = this.listeners[eventType].indexOf(listener);
            if (idx !== -1) {
                this.listeners[eventType].splice(idx, 1);
            }
        }
    }
};
var QuizEvents = {
    debug: false,
    quiz: null,
    library: {},
    setListeners: function (listeners) {
        for (let i in listeners) {
            for (let j in listeners[i].listeners) {
                listeners[i].listeners[j].removeListener = this.addListener(listeners[i].type + '.' + listeners[i].event, listeners[i].listeners[j]);
            }
        }
    },
    addListener: function (eventType, listenerData) {
        let callBack;
        try {
            callBack = this.getCallback(listenerData);
        } catch (e) {
            if (this.debug) {
                console.error(e);
            }
            return () => {
            };
        }

        return EventManager.addListener(eventType, callBack);
    },
    dispatch: function (eventType, eventData, context) {
        if (this.debug) {
            console.log('QuizEvents: dispatch', eventType, eventData);
        }

        if (eventData === undefined) {
            eventData = {};
        }

        if ((eventData instanceof Object) === false) {
            console.error('QuizEvents: EventData must be an object');
        }

        if (this.quiz !== null) {
            eventData = deepMerge(eventData, {
                slide: copyObject(this.quiz.slide),
                answers: copyObject(this.quiz.getAnswers())
            });
        }

        if (context) {
            eventData.context = context;
        }

        return EventManager.dispatch(eventType, eventData);
    },
    getCallback: function (data) {
        if (!(data.type in this.library && data.event in this.library[data.type])) {
            if (this.debug) {
                console.log('QuizEvents: Callback for [' + data.type + '][' + data.event + '] not exists in library!');
            }

            return () => {
            };
        }

        let self = this;
        let context = self.library[data.type][data.event].context;
        if (!context) {
            context = this;
        }

        if (this.debug) {
            console.log('QuizEvents: Set Listener For: ' + data.type + '.' + data.event);
        }

        return function (eventData, eventType) {
            if (eventData === undefined) {
                eventData = {};
            }

            if ('parameters' in data) {
                eventData = deepMerge(eventData, data.parameters);
            }

            if (self.debug) {
                console.log('QuizEvents: Call Listener ' + data.type + '.' + data.event, eventData);
            }


            return self.library[data.type][data.event].cb.call(context, eventData, eventType);
        };
    },
    setHandlers: function (key, handlers, context) {
        if (this.debug) {
            console.log('QuizEvents: Set Handlers For: ' + key);
        }

        for (let handlerKey in handlers) {
            this.addHandler(key, handlerKey, handlers[handlerKey], context);
        }
    },
    addHandler: function (key, code, handler, context) {
        if (this.debug) {
            console.log('QuizEvents: Add Handler [' + key + '][' + code + ']');
        }
        if (!(key in this.library)) {
            this.library[key] = {};
        }

        this.library[key][code] = {
            context: context,
            cb: handler
        };
    }
};

class KeyboardManager {
    constructor() {
        this.body = document.body;
        this.originalWindowHeight = window.innerHeight;
        this.initiated = false;
        this.init();
    }

    init() {
        // if (window.visualViewport) {
        //     console.log('init.window.visualViewport = true')
        //     this.initVisualViewport();
        // } else {
        //     console.log('init.window.visualViewport = false')
        //     this.initFallback();
        // }
    }

    setKeyboardOpen(height) {
        document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
        this.body.classList.add('keyboard-open');

        setTimeout(() => {
            const keyboardVisible = window.visualViewport.height < window.innerHeight;
            const keyboardHeight = window.innerHeight - window.visualViewport.height;

            if (keyboardVisible && keyboardHeight !== height) {
                document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
            }

        }, 100);
    }

    setKeyboardClosed() {
        var self = this;
        self.body.classList.remove('keyboard-open');
        document.documentElement.style.setProperty('--keyboard-height', '0px');
    }

    initVisualViewport() {

        if (this.initiated) {
            return;
        }

        this.initiated = true;

        window.visualViewport.addEventListener('resize', () => {
            const keyboardVisible = window.visualViewport.height < window.innerHeight;
            const keyboardHeight = window.innerHeight - window.visualViewport.height;
            this.switchKeyboard(keyboardVisible, keyboardHeight);
        });

        window.visualViewport.addEventListener('scroll', () => {
            if (this.body.classList.contains('keyboard-open')) {
                const keyboardHeight = window.innerHeight - window.visualViewport.height;
                this.setKeyboardOpen(keyboardHeight);
            }
        });
    }

    initFallback() {
        window.addEventListener('resize', () => {
            const keyboardVisible = window.innerHeight < this.originalWindowHeight;
            const keyboardHeight = this.originalWindowHeight - window.innerHeight;
            this.switchKeyboard(keyboardVisible, keyboardHeight);
        });

        // iOS specific events
        document.body.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                this.setKeyboardOpen(270);
            }
        });

        document.body.addEventListener('focusout', () => {
            this.setKeyboardClosed();
        });
    }

    switchKeyboard(keyboardVisible, keyboardHeight) {
        if (keyboardVisible) {
            this.setKeyboardOpen(keyboardHeight);
        } else {
            this.setKeyboardClosed();
        }
    }
}

var FakeInput = function (el) {
    this.inp = el;
    this.placeholder = el.previousElementSibling;
    let self = this;

    this.setValue();

    this.inp.addEventListener('input', function (e) {
        if (this.value.length > 2) {
            this.value = this.value.substring(0, 2);
            return;
        }
        this.value = this.value.replace(/[^0-9]/g, '')
        self.placeholder.innerHTML = this.value;
    });

    this.inp.addEventListener('focus', function (e) {
        const length = this.value.length;
        setTimeout(() => this.setSelectionRange(length, length), 0);
    });

    this.inp.addEventListener('blur', function (e) {
        setTimeout(function () {
            self.setBlur();
        }, 1)
    });

    this.inp.parentNode.addEventListener('click', function (e) {
        if (self.focus) {
            return false;
        }
        self.setFocus();
    });
}
FakeInput.prototype = {
    focus: false,
    setValue: function () {
        let value = this.inp.value;
        if (value.length === 0 && false === this.focus) {
            this.placeholder.innerHTML = '<span>0</span>'
        } else {
            this.placeholder.innerHTML = value;
        }
    },
    setFocus: function () {
        this.inp.focus();

        this.focus = true;
        this.setValue();

        this.inp.dispatchEvent(new Event('Focused'));
    },
    setBlur: function () {
        this.focus = false;
        this.setValue();

        this.inp.dispatchEvent(new Event('Blured'));
    }
}

var mobileAndTabletCheck = function () {
    let check = false;
    (function (a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
};

var autoCleaningWatcher = {
    objects: null,
    currentValue: null,
    currentStatus: null,
    autoCleaningExclusiveValue: null,
    init(autoCleaningExclusiveValue) {
        var self = this;
        if (typeof autoCleaningExclusiveValue === 'undefined') {
            return;
        } else {
            self.autoCleaningExclusiveValue = autoCleaningExclusiveValue;
        }

        self.objects = document.querySelectorAll('.checkbox-widget input[type=checkbox]');
        for (let i = 0; i < self.objects.length; i++) {
            self.objects[i].addEventListener('change', function (e) {
                self.currentValue = this.value;
                self.currentStatus = this.checked;
                if (self.currentStatus) {
                    self.runCleaning();
                }
            });
        }
    },
    runCleaning() {

        if (this.currentValue === this.autoCleaningExclusiveValue) {
            this.cleanOther();
        } else {
            this.cleanExclusive();
        }

    },
    cleanExclusive() {
        for (let i = 0; i < this.objects.length; i++) {
            if (this.objects[i].value === this.autoCleaningExclusiveValue) {
                this.objects[i].checked = false;
            }
        }
    },
    cleanOther() {
        for (let i = 0; i < this.objects.length; i++) {
            if (this.objects[i].value === this.autoCleaningExclusiveValue) {
                continue;
            }
            this.objects[i].checked = false;
        }
    }
};

var canMakeApplePayments = function () {
    if (!(typeof window.ApplePaySession !== 'undefined' && ApplePaySession.canMakePayments())) {
        return false;
    }

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return isSafari && isAppleDevice();
}

function isAppleDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod|macintosh|mac os x/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function updateRangeProgress() {
    const rangeSlider = document.getElementById('range-slider');
    const pct = ((rangeSlider.value - rangeSlider.min) / (rangeSlider.max - rangeSlider.min)) * 100 + '%';
    rangeSlider.style.setProperty('--progress', pct);
}

var initMapWithMarkers = function () {
    const markers = Array.from(document.querySelectorAll('.marker'));
    markers.sort((a, b) => {
        return +a.dataset.order - +b.dataset.order;
    });

    markers.forEach((m, i) => {
        setTimeout(() => {
            m.classList.add('visible');
        }, 1000 + i * 200);
    });
}

var initPlanAnimation = function () {
    const chart = document.getElementById('chart');
    const tip = document.getElementById('goalTip');
    const dot = document.getElementById('goalDot');
    const bars = chart.querySelectorAll('.bar');

    chart.classList.remove('animate');
    tip.classList.remove('drop');
    dot.classList.remove('pop');
    bars.forEach(bar => bar.removeAttribute('style'));

    void chart.offsetWidth;

    chart.classList.add('animate');
    setTimeout(() => tip.classList.add('drop'), 400);
    setTimeout(() => dot.classList.add('pop'), 500);
}

var initAnxietyAnimation = function () {
    const chart = document.getElementById('chart');
    const wrappers = chart.querySelectorAll('.bar-wrapper');

    const delay = 700;
    wrappers.forEach((_wrapper, i) => {
        setTimeout(() => {
            _wrapper.classList.add('animate');
            _wrapper.querySelector('.label').classList.add('visible');
            setTimeout(() => _wrapper.querySelector('.tooltip').classList.add('drop'), 50);
        }, i * delay);
    });

    setTimeout(() => document.getElementById('chart-line').classList.add('visible'), 2000);
}

var initLightLineAnimation = function (drawDuration = null, _afterLabelDelay = null) {
    const path = document.getElementById('anxietyPath');
    const totalLength = path.getTotalLength();

    if (null === drawDuration) {
        drawDuration = 3000;
    }

    if (null === _afterLabelDelay) {
        _afterLabelDelay = 3200;
    }
    console.log(_afterLabelDelay);

    path.style.strokeDasharray = totalLength;
    path.style.strokeDashoffset = totalLength;

    const anim = path.animate(
        [{strokeDashoffset: totalLength}, {strokeDashoffset: 0}],
        {duration: drawDuration, fill: 'forwards'}
    );

    const elems = document.querySelectorAll('.point, .connector, .dot, .week');

    elems.forEach(el => {
        let x = getValX(el);

        let low = 0, high = totalLength, mid;
        while (high - low > 0.5) {
            mid = (low + high) / 2;
            path.getPointAtLength(mid).x < x ? low = mid : high = mid;
        }
        const lengthAt = (low + high) / 2;
        const delay = drawDuration * (lengthAt / totalLength);

        el.style.animationDelay = `${delay}ms`;
    });


    const todayLabel = document.querySelector('.today-label');
    const afterLabel = document.querySelector('.after-label');

    if (todayLabel) {
        setTimeout(() => {
            todayLabel.style.opacity = '1';
            todayLabel.classList.add('fade-in');
        }, 2600);
    }
    if (afterLabel) {
        setTimeout(() => {
            afterLabel.classList.add('fade-in');
        }, _afterLabelDelay);
    }

    anim.onfinish = () => {
        let arrowHead = document.getElementById('arrowHead');
        if (arrowHead) {
            arrowHead.style.opacity = '1';
        }
    };

}

var initLineAnimation = function () {
    const path = document.getElementById('anxietyPath');
    const totalLength = path.getTotalLength();
    const drawDuration = 3;

    path.style.strokeDasharray = totalLength;
    path.style.strokeDashoffset = totalLength;

    document.querySelectorAll('.point, .label, .connector').forEach(el => {
        let x = getValX(el);

        let low = 0, high = totalLength, mid;
        while (high - low > 0.5) {
            mid = (low + high) / 2;
            path.getPointAtLength(mid).x < x ? low = mid : high = mid;
        }
        const lengthAt = (low + high) / 2;
        const delay = drawDuration * (lengthAt / totalLength);
        el.style.animationDelay = `${delay.toFixed(2)}s`;
    });

    let arr = document.getElementById('arrowHead');
    if (arr) {
        setTimeout(() => {
            arr.style.opacity = '1';
        }, drawDuration * 950);
    }
}

var getValX = function (el) {
    let x;

    if (el.tagName === 'circle') {
        x = +el.getAttribute('cx')
    } else if (el.tagName === 'line') {
        x = +el.getAttribute('x1')
    } else {
        x = +el.getAttribute('x')
    }
    return x;
}

var truncateName = function (blockId, line1Id, line2Id, _prefix, _name, _suffix, _correction = 10) {
    const block = document.getElementById(blockId);
    const line1 = document.getElementById(line1Id);
    const line2 = document.getElementById(line2Id);

    var prefix = _prefix;
    var fullWord = _name;
    const suffix = _suffix;

    // Function to get clean text without HTML tags
    const stripHTML = (html) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    // Function to find unclosed tags in HTML
    const getUnclosedTags = (html) => {
        const tagRegex = /<(\w+)([^>]*)>|<\/(\w+)>/g;
        const tagStack = [];
        let match;
        
        while ((match = tagRegex.exec(html)) !== null) {
            if (match[1]) {
                // Opening tag
                const attrs = {};
                const attrRegex = /(\w+)="([^"]*)"/g;
                let attrMatch;
                while ((attrMatch = attrRegex.exec(match[2])) !== null) {
                    attrs[attrMatch[1]] = attrMatch[2];
                }
                tagStack.push({tag: match[1].toLowerCase(), attrs});
            } else if (match[3]) {
                // Closing tag
                const closeTag = match[3].toLowerCase();
                for (let i = tagStack.length - 1; i >= 0; i--) {
                    if (tagStack[i].tag === closeTag) {
                        tagStack.splice(i, 1);
                        break;
                    }
                }
            }
        }
        
        return tagStack;
    };

    // Function to wrap text in tags
    const wrapInTags = (text, tags) => {
        if (tags.length === 0) return text;
        
        const openingTags = tags.map(({tag, attrs}) => {
            const attrString = Object.keys(attrs).length > 0 
                ? ' ' + Object.entries(attrs).map(([k,v]) => `${k}="${v}"`).join(' ')
                : '';
            return `<${tag}${attrString}>`;
        }).join('');
        
        const closingTags = tags.slice().reverse().map(({tag}) => `</${tag}>`).join('');
        
        return openingTags + text + closingTags;
    };

    // Function to measure text width (without HTML)
    const measureTextWidth = (html, _line) => {
        const text = stripHTML(html);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = getCanvasFont(_line);
        const metrics = context.measureText(text);
        return metrics.width;
    };

    let containerW = block.offsetWidth - parseInt(getComputedStyle(block).paddingLeft) - parseInt(getComputedStyle(block).paddingRight);

    if (containerW < 1) {
        containerW = parseInt(block.style.width);
    }

    const safeWidth = containerW - _correction;

    const stabilizeContainer = () => {
        block.style.width = '100%';
        block.style.overflow = 'inherit';
        line1.style.overflow = 'inherit';
        line2.style.overflow = 'inherit';
    };

    // Find unclosed tags in prefix
    const unclosedTagsInPrefix = getUnclosedTags(prefix);

    // Function to truncate HTML to a specific text length
    const truncateHTML = (html, maxLength) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        
        let currentLength = 0;
        let result = '';
        
        const traverse = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                const remaining = maxLength - currentLength;
                
                if (remaining <= 0) return '';
                
                if (text.length <= remaining) {
                    currentLength += text.length;
                    return text;
                }
                
                currentLength = maxLength;
                return text.slice(0, remaining);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                const attributes = {};
                for (let attr of node.attributes) {
                    attributes[attr.name] = attr.value;
                }
                const attrString = Object.keys(attributes).length > 0 
                    ? ' ' + Object.entries(attributes).map(([k,v]) => `${k}="${v}"`).join(' ')
                    : '';
                
                let inner = '';
                for (let child of node.childNodes) {
                    if (currentLength >= maxLength) break;
                    inner += traverse(child);
                }
                
                if (inner) {
                    return `<${tagName}${attrString}>${inner}</${tagName}>`;
                }
                return '';
            }
            return '';
        };

        for (let child of tmp.childNodes) {
            if (currentLength >= maxLength) break;
            result += traverse(child);
        }
        
        return result;
    };

    // Insert "..." inside HTML before closing tags
    const insertEllipsis = (html) => {
        const closingTagsMatch = html.match(/(<\/[^>]+>)+$/);
        if (closingTagsMatch) {
            const closingTags = closingTagsMatch[0];
            const contentWithoutClosing = html.slice(0, -closingTags.length);
            return contentWithoutClosing + '...' + closingTags;
        }
        return html + '...';
    };

    // Check if prefix fits
    if (measureTextWidth(prefix, line1) > safeWidth) {
        const plainPrefix = stripHTML(prefix);
        let cutLength = plainPrefix.length;
        
        while (cutLength > 0) {
            const testPrefix = truncateHTML(prefix, cutLength);
            if (measureTextWidth(testPrefix, line1) <= safeWidth) {
                break;
            }
            cutLength--;
        }
        
        const keptPrefix = truncateHTML(prefix, cutLength);
        // Extract the excess from prefix and add it to fullWord
        const prefixPlain = stripHTML(prefix);
        const excessText = prefixPlain.slice(cutLength);
        fullWord = excessText + fullWord;
        prefix = keptPrefix;
    }

    const fullText = prefix + fullWord + suffix;
    if (measureTextWidth(fullText, line1) <= safeWidth) {
        line1.innerHTML = fullText;
        line2.innerHTML = '';
        stabilizeContainer();
        return;
    }

    // Binary search for the first line
    const plainFullWord = stripHTML(fullWord);
    let left = 0, right = plainFullWord.length;
    let firstPartLength = 0;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        // fullWord is plain text, so we just take substring
        const testWord = plainFullWord.slice(0, mid);
        const testText = prefix + testWord;

        if (measureTextWidth(testText, line1) <= safeWidth) {
            firstPartLength = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    const firstPart = plainFullWord.slice(0, firstPartLength);
    let remaining = plainFullWord.slice(firstPartLength);
    
    // Wrap remaining in unclosed tags from prefix
    if (unclosedTagsInPrefix.length > 0) {
        remaining = wrapInTags(remaining, unclosedTagsInPrefix);
    }

    const secondLineText = remaining + suffix;

    if (measureTextWidth(secondLineText, line2) <= safeWidth) {
        line1.innerHTML = prefix + firstPart;
        line2.innerHTML = secondLineText;
        stabilizeContainer();
        return;
    }

    // Binary search for the second line with "..."
    const plainRemaining = stripHTML(remaining);
    left = 0;
    right = plainRemaining.length;
    let secondPartLength = 0;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const testWord = truncateHTML(remaining, mid);
        const testTextWithEllipsis = insertEllipsis(testWord);
        const testText = testTextWithEllipsis + suffix;
        
        if (measureTextWidth(testText, line2) <= safeWidth) {
            secondPartLength = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    if (secondPartLength > 0) {
        const secondPart = truncateHTML(remaining, secondPartLength);
        const secondPartWithEllipsis = insertEllipsis(secondPart);
        
        line1.innerHTML = prefix + firstPart;
        line2.innerHTML = secondPartWithEllipsis + suffix;
    } else {
        // Fallback: truncate the first line with "..."
        left = 0;
        right = firstPartLength;
        let finalLength = 0;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const testWord = plainFullWord.slice(0, mid);
            const testText = prefix + testWord + '...';

            if (measureTextWidth(testText, line1) <= safeWidth) {
                finalLength = mid;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        const finalFirstPart = plainFullWord.slice(0, finalLength);
        
        if (plainFullWord.length > finalLength) {
            line1.innerHTML = prefix + finalFirstPart + '...';
        } else {
            line1.innerHTML = prefix + finalFirstPart;
        }

        line2.innerHTML = suffix.trim();
    }
    
    stabilizeContainer();
};

function getCssStyle(element, prop) {
    return window.getComputedStyle(element, null).getPropertyValue(prop);
}

function getCanvasFont(el = document.body) {
    const fontStyle = getCssStyle(el, 'font-style') || 'normal';
    const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
    const fontSize = getCssStyle(el, 'font-size') || '16px';
    const fontHeight = getCssStyle(el, 'line-height') || '1.4';
    const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';

    return `${fontStyle} ${fontWeight} ${fontSize}/${fontHeight} ${fontFamily}`;
}

var paymentFormMounted = function () {
    var form = document.getElementById('solid-widget');
    if (form) {
        form.classList.add('no-spinner');
    }
}

let popupAbortController = null;
var setAnswerPopup = function (_params) {
    if (!('elId' in _params)) {
        return;
    }

    const _el = document.getElementById(_params.elId);
    const _content = _params?.content;
    const _parent = _el.closest('.answers-widget');

    if (!_el || !_parent) return;

    _el.addEventListener('change', async function () {
        if (popupAbortController) popupAbortController.abort();
        popupAbortController = new AbortController();

        if (quiz.hasAnswers()) {
            quiz.hideSubmitButton();
        }

        let existingPopup = document.getElementById('popup-content');
        if (existingPopup) {
            existingPopup.parentElement.remove();
        }

        if (!_content) return;

        const wrapper = document.createElement('div');
        wrapper.style.overflow = 'hidden';
        wrapper.style.maxHeight = '0';
        wrapper.style.transition = 'max-height 0.7s ease';
        wrapper.classList.add('popup-content-wrapper');

        const popup = document.createElement('div');
        popup.id = 'popup-content';
        wrapper.appendChild(popup);
        _parent.prepend(wrapper);

        setTimeout(() => {
            wrapper.style.maxHeight = '45px';
        }, 1);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = _content;

        const updateMaxHeight = () => {
            wrapper.style.maxHeight = popup.scrollHeight + 'px';
        };

        for (const child of Array.from(tempDiv.children)) {
            const cloned = child.cloneNode(false);
            cloned.textContent = '';
            popup.appendChild(cloned);

            await typeText(
                cloned,
                child.textContent,
                20,
                popupAbortController.signal,
                updateMaxHeight
            );
        }
    });

    if (_el.checked && _content) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('popup-content-wrapper');
        const popup = document.createElement('div');
        popup.id = 'popup-content';
        popup.innerHTML = _content;
        wrapper.appendChild(popup);
        _parent.prepend(wrapper);
    }
};

const typeText = (element, text, delay = 40, signal = null, onChar = () => {
}) => {
    return new Promise((resolve) => {
        let i = 0;

        function type() {
            if (signal?.aborted) {
                element.textContent = '';
                return resolve();
            }

            if (i < text.length) {
                element.textContent += text[i];
                i++;
                onChar();
                setTimeout(type, delay);
            } else {
                resolve();
            }
        }

        type();
    });
};

const connectionTester = {
    interval: 20, // seconds
    started: false,
    start(delay) {
        if (typeof delay !== 'number') {
            delay = 0;
        }
        this.started = true;
        const address = window.location.href;
        if (typeof address === 'undefined' || address.length === 0) {
            console.error('ConnectionTester: URL is not defined!');
            return;
        }
        setTimeout(() => {
            this.check(address, this.interval);
        }, delay * 1000);
    },
    check(url, interval) {
        // stop if not started
        if (this.started === false) {
            return;
        }
        const sd = new Date();
        // console.log('ping');
        this.sendRequest(url, () => {
            const ed = new Date();
            const duration = (ed.getTime() - sd.getTime()) / 1000;
            // console.log('pong  ' + duration + 's');
            // initiate next check
            setTimeout(() => {
                this.check(url, interval);
            }, interval * 1000);
        });

    },
    sendRequest(url, callback, method) {
        if (typeof method === 'undefined') {
            method = 'HEAD';
        }
        const result = new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.open('HEAD', url, true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const headers = xhr.getAllResponseHeaders();
                        resolve({
                            status: xhr.status,
                            headers: headers
                        });
                    } else {
                        reject(new Error(`Request failed with status ${xhr.status}`));
                    }
                }
            };

            xhr.onerror = function () {
                reject(new Error('Network error occurred'));
            };

            xhr.send();
        });
        if (typeof callback === 'function') {
            result.finally(() => {
                callback();
            });
        }

        return result;
    }
}

const sliderAnimationManager = {
    animationHandler: [],
    animationClassHandler: [],
    spinnerHandler: null,
    spinnerElement: null,
    styleEl: null,
    init() {
        this.styleEl = document.createElement('style');
        this.styleEl.type = 'text/css';
        document.head.appendChild(this.styleEl);
    },
    setStyle(selector, property, value) {
        if (this.styleEl === null) {
            this.init();
        }
        const cssRule = `${selector} { ${property}: ${value}; }`;
        const pos = this.styleEl.sheet.cssRules.length;
        this.styleEl.sheet.insertRule(cssRule, pos);
    },
    registerAnimation(element, property, fromValue, toValue, duration, delay) {
        const oldAnimation = this.hasRegisteredAnimation(element, property);
        if (oldAnimation) {
            if (oldAnimation.timeoutHandler !== null && oldAnimation.fromValue === fromValue && oldAnimation.toValue === toValue && oldAnimation.duration === duration && oldAnimation.delay === delay) {
                return null;
            }
            clearTimeout(oldAnimation.timeoutHandler);
            oldAnimation.timeoutHandler = null;
            return oldAnimation;
        }
        const result = {
            element: element,
            property: property,
            timeoutHandler: null,
            fromValue: fromValue,
            toValue: toValue,
            duration: duration,
            delay: delay
        };
        this.animationHandler.push(result);
        return result;
    },
    registerAnimationClass(element, className, duration, delay, mode) {
        const oldAnimation = this.hasRegisteredAnimationClass(element, className);
        if (oldAnimation) {
            if (oldAnimation.timeoutHandler !== null && oldAnimation.duration === duration && oldAnimation.delay === delay && oldAnimation.mode === mode) {
                return null;
            }
            clearTimeout(oldAnimation.timeoutHandler);
            oldAnimation.timeoutHandler = null;
            return oldAnimation;
        }
        const result = {
            element: element,
            className: className,
            timeoutHandler: null,
            duration: duration,
            delay: delay,
            mode: mode
        };
        this.animationClassHandler.push(result);
        return result;
    },
    hasRegisteredAnimation(element, property) {
        return this.animationHandler.find(handler => handler.element === element && handler.property === property);
    },
    hasRegisteredAnimationClass(element, className) {
        return this.animationClassHandler.find(handler => handler.element === element && handler.className === className);
    },
    animate(element, property, fromValue, toValue, duration, delay) {
        const animationHandler = this.registerAnimation(element, property, fromValue, toValue, duration, delay);
        if (animationHandler === null) {
            return;
        }
        element.style[property] = fromValue; // set initial value
        element.style.transition = `${property} ${duration}ms ease`; // set transition parameters
        animationHandler.timeoutHandler = setTimeout(() => {
            element.style[property] = toValue;
            animationHandler.timeoutHandler = null;
        }, delay); // execute animation after delay
        const result = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, delay + duration); // wait for animation to finish
        });
        return result;
    },
    setAnimationClass(element, className, duration, delay, mode) {
        if (typeof mode === 'undefined') {
            mode = 'add';
        }
        const animationClassHandler = this.registerAnimationClass(element, className, duration, delay, mode);
        if (animationClassHandler === null) {
            return;
        }
        animationClassHandler.timeoutHandler = setTimeout(() => {
            if (mode == 'add') {
                element.classList.add(className);
            } else {
                element.classList.remove(className);
            }

            animationClassHandler.timeoutHandler = null;
        }, delay); // execute animation after delay
        const result = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, delay + duration); // wait for animation to finish
        });
        return result;
    },

    getSpinnerElement() {
        if (this.spinnerElement === null) {
            this.spinnerElement = document.querySelector('.waiting-spinner-wrapper');
        }
        return this.spinnerElement;
    },
    showSpinner(delay) {
        if (this.spinnerHandler !== null) {
            return;
        }
        this.spinnerHandler = setTimeout(() => {
            const spinner = this.getSpinnerElement();
            if (spinner) {
                spinner.classList.add('active');
            }
        }, delay);
    },
    cancelSpinner() {
        if (this.spinnerHandler !== null) {
            clearTimeout(this.spinnerHandler);
            this.spinnerHandler = null;
        }
    },
    hideSpinner() {
        if (this.spinnerHandler !== null) {
            clearTimeout(this.spinnerHandler);
            this.spinnerHandler = null;
        }
        const spinner = this.getSpinnerElement();
        if (spinner) {
            spinner.classList.remove('active');
        }
    }
};
// sliderAnimationManager.init();

const pageContentManager = {
    spinnerDelay: 200,
    spinnerHandler: null,
    frameEl: null,
    addUrl(url, content) {
        history.pushState({url: url}, '', url);
        const contentElement = document.querySelector('main .page-wrapper');
        if (contentElement) {
            contentElement.innerHTML = content;
        }
    },
    getFrame() {
        if (this.frameEl === null) {
            this.frameEl = document.getElementById('preloader-frame')
        }
        return this.frameEl;
    },
    openFrame(url) {
        // history.pushState({url: url}, '', url);
        //history.replaceState({url: url}, '', url);
        const result = new Promise((resolve, reject) => {
            const frame = this.getFrame();
            frame.onload = () => {
                resolve();
                setTimeout(() => {
                    history.replaceState({url: url}, '', url);
                }, 100);

            };
            frame.src = url;
        });
        return result;
    },
    getContent(url) {

        // start spinner if waiting for content longer than 200ms
        this.spinnerHandler = setTimeout(() => {
            sliderAnimationManager.showSpinner(100);
        }, this.spinnerDelay);

        const result = fetch(url, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-AJAX-Request': 'true',
                'Accept': 'application/json',
                'X-Mode': 'preloader'
            },
            redirect: 'follow'
        })
            .then(response => response.text().then(data => ({
                finalUrl: response.url,
                content: data
            })));

        result.then(result => {
            //this.addUrl(result.finalUrl, result.content);
            try {
                content = JSON.parse(result.content);
                content = content.data || {};
            } catch (e) {
                content = result.content;
            }

            if (typeof content == 'object' && content !== null) {
                this.processResponse(content);
            } else {
                console.log('unknown content type');
            }

        })
            .catch(error => {
                console.error('Fetch error:', error);
            });
    },
    processResponse(content) {
        const action = content.action || 'replace';
        switch (action) {
            case 'redirect':
                if (content.url) {
                    // window.location.href = content.url;
                    // return;
                    this.openFrame(content.url).then(() => {
                        clearTimeout(this.spinnerHandler);
                        this.spinnerHandler = null;
                        sliderAnimationManager.hideSpinner();
                        this.getFrame().classList.add('active');
                    });
                }
                break;
            default:
                break;
        }
    }
};


var initCustomAnimation = function (_elId, _elementClasses, _labels = [], drawDuration = null) {
    const path = document.getElementById(_elId);
    const totalLength = path.getTotalLength();
    if (null === drawDuration) {
        drawDuration = 3000;
    }

    path.style.strokeDasharray = totalLength;
    path.style.strokeDashoffset = totalLength;

    const anim = path.animate(
        [{strokeDashoffset: totalLength}, {strokeDashoffset: 0}],
        {duration: drawDuration, fill: 'forwards'}
    );

    // '.point, .connector, .dot, .week'
    const elems = document.querySelectorAll(_elementClasses);

    elems.forEach(el => {
        let x = getValX(el);

        let low = 0, high = totalLength, mid;
        while (high - low > 0.5) {
            mid = (low + high) / 2;
            path.getPointAtLength(mid).x < x ? low = mid : high = mid;
        }
        const lengthAt = (low + high) / 2;
        const delay = drawDuration * (lengthAt / totalLength);

        el.style.animationDelay = `${delay}ms`;
    });

    _labels.forEach(el => {
        showLabel(el);
    })

    anim.onfinish = () => {
        let arrowHead = document.getElementById('arrowHead');
        if (arrowHead) {
            arrowHead.style.opacity = '1';
        }
    };
};
var showLabel = function (_selector) {
    const _label = document.querySelector(_selector);
    if (_label) {
        setTimeout(() => {
            _label.style.opacity = '1';
            let animation = _label.dataset.animation;
            if (animation) {
                _label.style.animation = animation;
            }
            _label.classList.add('fade-in');
        }, _label.dataset.delay);
    }
}

var moveComments = {
    index: 0,
    comments: null,
    comment: null,
    prevBtn: null,
    nextBtn: null,
    commentWidth: null,
    init() {
        this.comments = document.querySelector('.comments');
        this.comment = document.querySelector('.feedback-widget');
        this.prevBtn = document.getElementById('prev');
        this.nextBtn = document.getElementById('next');
        this.commentWidth = this.comment.offsetWidth + 20;

        this.nextBtn.addEventListener('click', () => {
            if (this.index < this.comments.children.length - 1) {
                this.index++;
                this.comments.style.transform = `translateX(${-this.index * this.commentWidth}px)`;
            }
            this.setMoveBtnStatus();
        });

        this.prevBtn.addEventListener('click', () => {
            if (this.index > 0) {
                this.index--;
                this.comments.style.transform = `translateX(${-this.index * this.commentWidth}px)`;
            }
            this.setMoveBtnStatus();
        });
    },
    setMoveBtnStatus() {
        if (0 === this.index) {
            this.prevBtn.classList.remove('active');
        } else {
            this.prevBtn.classList.add('active');
        }

        if ((this.comments.children.length - 1) === this.index) {
            this.nextBtn.classList.remove('active');
        } else {
            this.nextBtn.classList.add('active');
        }
    }
};

var initRipples = function () {
    let ripples = document.querySelectorAll('.ripple');
    for (let i = 0; i < ripples.length; i++) {
        ripples[i].addEventListener('click', function (e) {
            let circle = this.firstElementChild;
            let rect = this.parentNode.getBoundingClientRect();
            let offset = {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
            };

            let x = e.pageX - offset.left;
            let y = e.pageY - offset.top;

            circle.style.top = y + 'px';
            circle.style.left = x + 'px';

            this.classList.add('active');
        });

        ripples[i].firstElementChild.addEventListener('animationend', function (e) {
            this.parentNode.classList.remove('active');
        })
    }
};
document.addEventListener('quizTemplateUpdated', function () {
    initRipples();
});
document.addEventListener('DOMContentLoaded', function () {
    initRipples();
});

// animate elements
if (typeof ButtonAnimationSpeed == 'undefined') {
    let ButtonAnimationSpeed = 0;
}

const animatedElements = [];
let currentPressedElement = null;
document.addEventListener('DOMContentLoaded', function() {
    ['mouseup', 'touchend', 'touchcancel'].forEach(function(evt) {
        document.body.addEventListener(evt, function() {
            const el = currentPressedElement;
            currentPressedElement = null;
            if (el) {
                setTimeout(function() {
                    el.dispatchEvent(new Event('press-cancel'));
                }, 100);
            }
        });
    });
});
const initElementsAnimation = function (query, buttonMode) {
    const elements = document.querySelectorAll(query);
    elements.forEach(element => {
        if (animatedElements.indexOf(element) > -1) {
            return;
        }
        animatedElements.push(element);

        if (buttonMode) {
            activateButtonAnimation(element);
        } else {
            activateElementAnimation(element);
        }
    });
};
const activateElementAnimation = function (element) {
    const totalAnimationDuration = ButtonAnimationSpeed;
    let status = 'inactive';
    let onclick = null;
    let input = element.querySelector('input');
    let inputName = null;
    let isRadio = false;
    let hasCheckedProperty = false;
    let isChecked;
    let currentState;

    if (input) {
        inputName = input.getAttribute('name');
        isRadio = input.getAttribute('type') === 'radio';
        hasCheckedProperty = input.getAttribute('type') === 'radio' || input.getAttribute('type') === 'checkbox';
        isChecked = currentState = input.checked;
    }
    element.addEventListener('touchstart', (e) => {
        currentPressedElement = element;
        setActive();
    });
    element.addEventListener('mousedown', (e) => {
        currentPressedElement = element;
        setActive();
    });
    element.addEventListener('press-cancel', () => {        
        if (status !== 'active') {
            setInactive();
        }
    });

    element.addEventListener('click', (e) => {
        processClick(e);
    });
    let setActive = function(){
        if(isActiveAnimation() === false){
            return;
        }
        element.classList.add('active');
    };
    let setInactive = function(){
        if(isActiveAnimation() === false){
            return;
        }
        element.classList.remove('active');
    };
    let processClick = function(e){
        //console.log('click event', status);
        if (status != 'active') {
            e.preventDefault();
            e.stopPropagation();
        }

        if (quiz && quiz.loading) {
            // console.log('animation load in progress');
            return;
        }

        if (status == 'active' || status === 'processing') {
            //console.log('already processing', element, isChecked, input);
            return;
        }
        // change status from inactive to processing
        if (status === 'inactive') {
            // console.log('set processing', element);
            status = 'processing';
        }
        if (hasCheckedProperty) {
            isChecked = !element.classList.contains('selected');

            if (isRadio) {
                isChecked = true;
            }
        }
        // do animation etc only for processing status
        if (status === 'processing') {
            status = 'active';
            if (ButtonAnimationSpeed != 0) {
                element.classList.add('active');
            }

            setTimeout(() => {
                // start animation second step
                element.classList.remove('active');

                // clear all selections from similar radio elements
                setTimeout(() => {
                    if (isRadio) {
                        document.querySelectorAll(`input[type="radio"][name="${inputName}"]`).forEach((el) => {
                            if (el === input) {
                                if (hasCheckedProperty) {
                                    el.checked = isChecked;
                                }

                                return;
                            }

                            let elCurrentState = el.checked;
                            el.checked = false;

                            if (elCurrentState !== el.checked) {
                                el.dispatchEvent(new Event('change'));
                            }

                            el.parentNode.classList.remove('selected');
                        });
                    } else {
                        if (hasCheckedProperty) {
                            input.checked = isChecked;
                        }
                    }

                    if (input && hasCheckedProperty) {
                        input.dispatchEvent(new Event('change'));
                    }

                    // for checkbox and radio inputs fix checked status and set selected classname
                    element.classList.toggle('selected', isChecked);

                    const newEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                    });

                    // console.log('dispatch click', element);
                    element.dispatchEvent(newEvent);
                    status = 'inactive';
                }, 20);
            }, totalAnimationDuration / 2);

        }
    };
};
const activateButtonAnimation = function (element) {
    // console.log('+++', element);
    if(typeof ButtonAnimationSpeed === 'undefined'){
        ButtonAnimationSpeed = 0;
    }
    const totalAnimationDuration = ButtonAnimationSpeed;
    if (ButtonAnimationSpeed == 0) {
        return;
    }
    let status = 'inactive';
    let onclick = null;
    element.classList.add('animated-button');

    if (element.onclick) {
        onclick = element.onclick;
        element.removeAttribute('onclick');
        element.onclick = null;
    }

    element.addEventListener('touchstart', (e) => {
        currentPressedElement = element;
        if (status === 'inactive') {
            element.classList.add('active');
        }
    });
    element.addEventListener('mousedown', (e) => {
        currentPressedElement = element;
        if (status === 'inactive') {
            element.classList.add('active');
        }
    });
    element.addEventListener('press-cancel', () => {
        if (status === 'inactive') {
            element.classList.remove('active');
        }
    });

    element.addEventListener('click', (e) => {
        if (status === 'active') {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        // console.log('click', e, element);
        if (status === 'processing') {
            // console.log('already processing', element);
            return;
        }
        // change status from inactive to processing
        if (status === 'inactive') {
            // console.log('set processing', element);
            status = 'processing';
        }

        // do animation etc only for processing status
        if (status === 'processing') {
            // console.log('do animation etc', element);
            // start animation first step
            // console.log('start animation', element);
            if (onclick !== null) {
                element.onclick = onclick;
            }
            element.classList.add('active');

            setTimeout(() => {
                // start animation second step
                element.classList.remove('active');
            }, totalAnimationDuration / 2);

            // dispatch new event click
            setTimeout(() => {
                status = 'active';

                const newEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                });

                // console.log('dispatch click', element);
                ButtonAnimationSpeed = 0;
                element.dispatchEvent(newEvent);
                ButtonAnimationSpeed = totalAnimationDuration;
                setTimeout(() => {
                    if (onclick !== null) {
                        element.onclick = null;
                    }
                    status = 'inactive';
                }, 10);
            }, totalAnimationDuration);
        }
    });
};
$animated_buttons = [
    'button',
    '.button',
    '.btn-skip-continue',
    '.btn-continue',
    '.btn-get-my-plan',
    '.btn-skip',
    '.btn-skip-3',
    '.btn-get-my-plan.buy-btn',
    '.animate'
];
$animated_widgets = [
    '.image-radio-widget', 
    '.image-checkbox-widget', 
    '.hidden-radio-widget', 
    '.checkbox-widget', 
    '.rate-widget li', 
    '.select-image-widget',
    '.select-option-widget',
    '.answers-rate-widget-item',
    '.select-multiple-option-widget'
];
const initAllAnimations = function () {
    initElementsAnimation($animated_buttons.join(','), true);
    initElementsAnimation($animated_widgets.join(','), false);
};
document.addEventListener('quizTemplateUpdated', function () {
    initAllAnimations();
});
document.addEventListener('DOMContentLoaded', function () {
    initAllAnimations();    
});
document.addEventListener('askWindowRender', function () {
    initAllAnimations();
});

let animationSpeed = null;
const getAnimationSpeedValue = function(){
    return getComputedStyle(document.documentElement).getPropertyValue('--button-animation-speed').trim();    
};
const getAnimationSpeed = function(){
    if(animationSpeed === null){
        const value = getAnimationSpeedValue();
        animationSpeed = value === '' || parseInt(value) == 0? 0 : parseInt(value);
    }
    return animationSpeed;
};
const isActiveAnimation = function(){
    const speed = getAnimationSpeed();
    return speed > 0;
};

const updateMilestoneProgress = function (milestones) {
    const progressBar = document.getElementById('slide-header-progress-complete');
    if(progressBar.hasAttribute('data-no-animate')) { return; }
    const lastProgressScreen = parseInt(document.getElementById('slide-header-numbers-total').innerHTML);
    const currentScreen = parseInt(document.getElementById('slide-header-numbers-current').innerHTML);
    if (!progressBar || !progressBar.classList.contains('milestone-bar') || (currentScreen < 1)) {
        return;
    }

    if (!milestones) {
        milestones = {
            0: 1,
            33: Math.round(lastProgressScreen * 0.33),
            66: Math.round(lastProgressScreen * 0.66),
            100: lastProgressScreen
        };
    }

    let progress = Math.floor((currentScreen) / lastProgressScreen * 100);

    if (progress < 10) {
        progressBar.style.width = 'calc(10% + ' + currentScreen + 'px)';
    } else {
        progressBar.style.width = progress + '%';
    }

    const milestoneElements = document.querySelectorAll('.milestone');
    milestoneElements.forEach(el => {
        const milestonePercent = parseInt(el.dataset.milestone);
        const milestoneScreen = milestones[milestonePercent];

        if (currentScreen == milestoneScreen) {
            el.classList.add('pulsating');
        }

        if (currentScreen >= milestoneScreen) {
            el.classList.add('completed');
        } else if (currentScreen === milestoneScreen - 1 || (milestonePercent > 0 && currentScreen >= milestones[Object.keys(milestones).map(Number).filter(p => p < milestonePercent).pop()] && currentScreen < milestoneScreen)) {
            el.classList.add('upcoming');
        }
    });
}

var changeLocation = function (url) {
    if (window.parent !== window) {
        window.parent.postMessage({'type': 'redirect', 'url': url});
    } else {
        location.href = url;
    }
}