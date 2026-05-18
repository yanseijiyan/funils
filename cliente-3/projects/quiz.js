/**
 * @project quiz
 * @version v20250912092913
 */
const EventJournal = (function(){
    const getCookieName = function(name){
        return '_rej_'+name;
    };
    const getCookie = function(name){
        name = getCookieName(name);
        const cookieArray = document.cookie.split('; ');
        for (let cookie of cookieArray) {
            const [cookieName, cookieValue] = cookie.split('=');
            if (cookieName === name) {
                return decodeURIComponent(cookieValue);
            }
        }
        return undefined;
    };
    const setCookie = function(name, value, days = 30){
        name = getCookieName(name);
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/`;
    };
    const getDeviceData = function(){
        return {
            id: generateDeviceId(),
            language: navigator.language || navigator.userLanguage,
        };
    };
    const sendRequest = function(url, data, retryLimit, retryInterval){
        retryLimit = parseInt(retryLimit);
        retryInterval = parseInt(retryInterval);
        return new Promise((resolve, reject) => {
            const tryRequest = (attemptsRemaining) => {
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                })
                    .then(response => {
                        if (response.ok) {
                            resolve(response);
                        } else {
                            if (attemptsRemaining > 1) {
                                setTimeout(() => tryRequest(attemptsRemaining - 1), retryInterval);
                            } else {
                                reject(new Error('Request failed with status ' + response.status));
                            }
                        }
                    })
                    .catch(error => {
                        if (attemptsRemaining > 1) {
                            setTimeout(() => tryRequest(attemptsRemaining - 1), retryInterval);
                        } else {
                            reject(error);
                        }
                    });
            };
            tryRequest(retryLimit);
        });
    };
    const getUUID = function(prefix){
        return prefix+'-'+manager.code+'-'+(new Date()).getTime()+'-'+Math.random().toString(36).substr(2, 9);
    };
    const getOrCreate = function(name){
        let value = getCookie(name);
        if(typeof value == 'undefined'){
            value = getUUID(name);
            setCookie(name, value);
        }
        return value;
    };
    const getSessionId = function(){
        return getOrCreate('sess');
    };
    const generateDeviceId = function(){
        return getOrCreate('dev');
    };
    const set = function (name, value){
        manager.variables[name] = value;
    };
    const setSource = function(value){
        manager.source = value;
    };
    const ref = {
        value: null,
        init(){
            this.value = getCookie('ref');
        },
        read(){
            return this.value;
        },
        set(value){
            this.value = value;
            this.save();
        },
        setCurrent(){
            this.set(document.location.href);
        },
        save(){
            setCookie('ref', this.value);
        },
        initialValue(){
            const result = this.read();
            this.setCurrent();
            return result;
        }
    };
    ref.init();

    const setRef = function(value){
        if(typeof value == 'undefined'){
            value = document.location.href;
        }
        manager.ref = value;
        ref.set(value);
    };

    const manager = {
        code: "quiz",
        url: "https://track.getrelatio.com/event/quiz",
        retryLimit: "1",
        retryInterval: "0",
        source: null,
        ref: null,
        sendTimeout: 1,
        sessionID: null,
        device: null,
        variables: null,
        trackQueue: null,
        trackPromise: null,
        botCheckerNames: ["isFbBot"],
        init(){
            this.trackQueue = [];
            this.variables = {};
            this.sessionID = getSessionId();
            this.device = getDeviceData();
            this.ref = ref.initialValue();
        },
        getEventId(){
            return getUUID('evt');
        },
        getData(events){
            const result = {
                session_id: this.sessionID,
                events: events,
                device:this.device,
            };

            for(let i in this.variables){
                if(i in result){
                    continue;
                }
                result[i] = this.variables[i];
            }
            return result;
        },
        createEvent(eventName, eventParameters){
            return {
                id: this.getEventId(),
                time: (new Date()).getTime(),
                name: eventName,
                parameters: eventParameters,
                source: this.source,
                ref: this.ref
            };
        },
        addOrder(eventName, eventParameters){
            this.trackQueue.push(this.createEvent(eventName, eventParameters));
        },
        getPromise(){
            if(this.trackPromise === null){
                this.trackPromise = new Promise((resolve, reject)=>{
                    setTimeout(()=>{
                        const events = this.trackQueue;
                        this.trackQueue = [];
                        this.trackPromise = null;
                        const data = this.getData(events);
                        sendRequest(this.url, data, this.retryLimit, this.retryInterval)
                            .then(()=>{ resolve(); })
                            .catch(()=>{ reject(); });
                    }, this.sendTimeout);
                });
            }
            return this.trackPromise;
        },
        track(eventName, eventParameters){

            if (this.ejIsBot()) {
                return null;
            }

            this.addOrder(eventName, eventParameters);
            return this.getPromise();
        },
        ejIsBot: function () {
            for (var i = 0; i < this.botCheckerNames.length; i++) {
                try {
                    if (typeof window[this.botCheckerNames[i]] === 'function' && window[this.botCheckerNames[i]]()) {
                        return true;
                    }
                } catch (e) {
                    console.warn('Bot checker error for ' + this.botCheckerNames[i] + ':', e);
                }
            }
            
            return false;
        }
    };
    manager.init();

    const code = function(){ return manager.code; };
    const track = function(eventName, eventParameters){
        return manager.track(eventName, eventParameters);
    };
    return {
      'code': code,
      'track': track,
      'set': set,
      'setSource': setSource,
      'setRef': setRef,
    };
})();

            window.isFbBot = function(){
                let _agentList = ["facebookexternalhit\/1.1 (+http:\/\/www.facebook.com\/externalhit_uatext.php)","facebookexternalhit\/1.1","facebookcatalog\/1.0","meta-externalagent\/1.1 (+https:\/\/developers.facebook.com\/docs\/sharing\/webmasters\/crawler)","meta-externalagent\/1.1","meta-externalfetcher\/1.1 (+https:\/\/developers.facebook.com\/docs\/sharing\/webmasters\/crawler)","meta-externalfetcher\/1.1"];
                const _userAgent = navigator?.userAgent?.toLowerCase() || '';
                return _agentList.some(pattern => _userAgent.includes(pattern));
            };