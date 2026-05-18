var FacebookManager = function (params) {
    this.dataset = params.dataset;
    this.userParameters = params.userParameters;
    this.frontEnable = !!params.frontEnable;
    this.apiEnable = !!params.apiEnable;
    this.sendGender = !!params.sendGender;
    this.signalsGateWay = params.signalsGateWay;
    window.addEventListener('FacebookManager.initPixel', (e) => {
        this.initPixel(e.detail?.sendPageView);
    });
};


FacebookManager.prototype = {
    dataset: null,
    userParameters: null,
    frontEnable: false,
    apiEnable: false,
    sendGender: false,
    debug: false,
    signalsGateWay: null,
    initiated: false,

    library: {
        PageView: function (eventData, eventType) {
            this.track('PageView');
        },
        SubmitApplication: function (eventData, eventType) {
            let customData = {};

            if ('gender' in eventData) {
                customData = deepMerge(customData, {
                    user_data: {
                        ge: eventData.gender.substring(0, 1).toLowerCase()
                    }
                });

            } else if (eventData.slide && eventData.slide.type === 'gender') {
                let answer = eventData.answers;
                if (answer.length > 0) {
                    answer = answer[0].answers.join(',');
                } else {
                    answer = '';
                }

                if (answer.length > 0) {
                    customData = deepMerge(customData, {
                        user_data: {
                            ge: answer.substring(0, 1).toLowerCase()
                        }
                    });
                }
            }

            this.track('SubmitApplication', customData);
        },
        Contact: function (eventData, eventType) {
            let customData = {};
            if ('email' in eventData) {
                customData = {
                    user_data: {
                        em: eventData.email
                    },
                    answers:0
                };
            } else if (eventData.slide && eventData.slide.type === 'email_input') {
                let answer = eventData.answers;
                if (answer.length > 0) {
                    answer = answer[0].answers.join(',');
                } else {
                    answer = '';
                }

                if (answer.length > 0) {
                    customData = {
                        user_data: {
                            em: answer
                        },
                        answers: answer.length
                    };
                }
            }

            this.track('Contact', customData);
        },
        InitiateCheckout: function (eventData, eventType) {
            let product = eventData.product;

            this.track('InitiateCheckout', {
                custom_data: {
                    content_category: product.category,
                    content_ids: product.solidProductID,
                    currency: product.currency
                }
            });
        },
        AddToCart: function (eventData, eventType) {
            let product = eventData.product;
            this.track('AddToCart', {
                custom_data: {
                    content_category: product.category,
                    value: product.price,
                    currency: product.currency

                }
            });
        },
        Purchase: function (eventData, eventType, context) {
            let product = eventData.product;
            let eventID = eventData.context.eventID;
            this.track('Purchase', {
                custom_data: {
                    value: product.LTV,
                    currency: product.currency,
                    content_category: product.category,
                    content_ids: product.solidProductID
                }
            }, eventID);
        },
        CompleteRegistration: function (eventData, eventType) {
            let customData = {};
            if ('email' in eventData) {
                customData = deepMerge(customData, {
                    user_data: {
                        em: eventData.email
                    }
                });
            } else if (eventData.slide && eventData.slide.type === 'email_input') {
                let answer = eventData.answers;
                if (answer.length > 0) {
                    answer = answer[0].answers.join(',');
                } else {
                    answer = '';
                }

                if (answer.length > 0) {
                    customData = deepMerge(customData, {
                        user_data: {
                            em: answer
                        }
                    });
                }
            }

            if ('category' in eventData) {
                customData = deepMerge(customData, {custom_data: {content_category: eventData.category}});
            }

            this.track('CompleteRegistration', customData);
        }
    },

    /**
     * Initializes Pixel
     * This method ensures the tracking code is loaded only once and is functional.
     * It checks conditions such as whether tracking is enabled and if the Pixel has already been initialized.
     *
     * @return {void} No return value. Sets up the Facebook Pixel for the provided dataset and optional user parameters.
     */
    initPixel: function (sendPageView) {
        if (!this.dataset || this.frontEnable === false) {
            return;
        }

        if (this.initiated === true) {
            return;
        }

        this.initiated = true;

        if(this.isSignalsGateWayEnabled()) {
            this.initMetaSignalsGateWayPixel();
        }else{
            this.initMetaPixel();
        }

        if(this.debug) {
            console.log('FBQ.INITIATED');
        }

        if(sendPageView === true) {
            this.track('PageView');
        }
    },

    /**
     * Initializes the Facebook Pixel tracking code.
     * This method ensures the tracking code is loaded only once and is functional.
     * It checks conditions such as whether tracking is enabled and if the Pixel has already been initialized.
     *
     * @return {void} No return value. Sets up the Facebook Pixel for the provided dataset and optional user parameters.
     */
    initMetaPixel: function () {
        (function (f, b, e, v, n, t, s) {
            if (f.fbq) {
                return;
            }
            n = f.fbq = function () {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
            };
            if (!f._fbq) {
                f._fbq = n;
            }
            n.push = n;
            n.loaded = !0;
            n.version = '2.0';
            n.queue = [];
            t = b.createElement(e);
            t.async = !0;
            t.src = v;
            s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', this.dataset, this.userParameters);

    },

    /**
     * Initializes the Facebook and Signals Gateway Hybrid  Pixel tracking code.
     * This method ensures the tracking code is loaded only once and is functional.
     * It checks conditions such as whether tracking is enabled and if the Pixel has already been initialized.
     *
     * @return {void} No return value. Sets up the Facebook Pixel for the provided dataset and optional user parameters.
     */
    initMetaSignalsGateWayPixel: function () {
        function assign(t){for(var i=1;i<arguments.length;i++){var s=arguments[i];if(s)for(var k in s)if(Object.prototype.hasOwnProperty.call(s,k))t[k]=s[k]}return t;}
        !(function(f,b,e,v,vv,n,nn,t,s,tt,ss){
            if (!f.cbq){nn = f.cbq = function(){nn.initialized ? nn.apply(f.cbq, arguments) : nn.queue.push(arguments);};
                if(!f._cbq) f._cbq = nn;
                nn.push = nn; nn.loaded = !0; nn.version = '2.0'; nn.queue = [];
                tt = b.createElement(e); tt.async = !0; tt.src = vv; ss=b.getElementsByTagName(e)[0]; ss.parentNode.insertBefore(tt,ss);}
            if (f.xbq) return; if (f.fbq) f.xbq=f.fbq;
            n = f.fbq = function()
            { var args = Array.prototype.slice.call(arguments);
                var m = args[0];
                var isT = m === 'track' || m === 'trackCustom';
                var isS = m === 'trackSingle' || m === 'trackSingleCustom';

                var mId;
                mId = args[2].event_id;

                if (isT && args.length < 4)
                    arguments = args.concat((args.length < 3 ? [{}, { eventID: mId }] : [{ eventID: mId }]));
                else if (isS && arguments.length < 5)
                    arguments = args.concat((args.length < 4 ? [{}, { eventID: mId }] : [{ eventID: mId }]));
                if (isT && (!arguments[3] || !arguments[3].eventID)) arguments[3] = assign({}, arguments[3] || {}, { eventID: mId });
                if (isS && (!arguments[4] || !arguments[4].eventID)) arguments[4] = assign({}, arguments[4] || {}, { eventID: mId });
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
                if (typeof m === 'string' && m.indexOf('track') === 0) {
                    if (isS) arguments[1] = f.fbq.instance.pixelsByID[arguments[1]].cId;
                    if (arguments[1]) (f.cbq.initialized ? f.cbq.apply(f.cbq, arguments) : f.cbq.queue.push(arguments));}
            }
            if(!f._fbq) f._fbq = n;
            n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = (f.xbq)?f.xbq.queue:[];
            t = b.createElement(e); t.async = !0; t.src = v;s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);
        })
        (window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js', 'https://sg.getrelatio.com/sdk/' + this.signalsGateWay.dataset + '/events.js');
        fbq('init', this.dataset, this.userParameters);
        cbq('setHost', 'https://sg.getrelatio.com/');
        cbq('init', this.signalsGateWay.dataset);
        cbq('set', 'integrationMethod', 'forkFromSnippetCode@1.0');
    },

    isSignalsGateWayEnabled: function () {
        if(!this.signalsGateWay) {
            return false;
        }
        if(!this.signalsGateWay.enabled) {
            return false;
        }
        if(!this.signalsGateWay.dataset) {
            return  false;
        }
        if(!this.signalsGateWay.publicDomain) {
            return  false;
        }
        if(this.debug) {
            console.log('Signals Gateway enabled');
        }
        return true;

    },
    /**
     * Tracks an event by sending data to configured endpoints (e.g., Facebook Pixel or custom API).
     * Handles different configurations based on available dataset, API settings, and frontend enablement.
     *
     * @function
     * @param {string} name - The name of the event to be tracked.
     * @param {Object} [data={}] - The optional object containing event-related data.
     * @param {Object} [data.user_data] - An object containing user-specific data.
     * @param {Object} [data.custom_data] - Additional custom data for the event.
     * @param {string} [eventID] - An optional unique identifier for the event. If not provided,
     * it will be generated automatically.
     */
    track: function (name, data, eventID) {
        if (data === undefined) {
            data = {};
        }

        let eventData = {};
        if ('user_data' in data) {
            eventData.user_data = data.user_data;
        }

        if ('custom_data' in data) {
            eventData = Object.assign(eventData, data.custom_data);
        }

        if(!eventID){
            eventID = makeid(10) + Date.now();
        }


        if (this.frontEnable) {
            let _tmpGe = null;
            if ('user_data' in eventData && 'ge' in eventData.user_data && !this.sendGender) {
                _tmpGe = eventData.user_data.ge;
                delete eventData.user_data.ge;
            }
            if (this.apiEnable) {
                if (typeof fbq !== 'undefined') {
                    if(this.debug) {
                        console.log('FBQ.TRACK');
                    }

                    // fbq('track', name, JSON.parse(JSON.stringify(eventData)), {event_id: eventID});
                    //fbq('track', name, deepMerge(eventData, {event_id: eventID}));
                    fbq('track', name, deepMerge(eventData, {event_id: eventID}), {event_id: eventID});
                }

                if (null != _tmpGe) {
                    eventData.user_data.ge = _tmpGe;
                }

                this.sendToApi(name, deepMerge(eventData, {event_id: eventID}));
            } else if (typeof fbq !== 'undefined') {
                if(this.debug) {
                    console.log('FBQ.TRACK');
                }
                // fbq('track', name, deepMerge(eventData, {event_id: eventID}));
                fbq('track', name, deepMerge(eventData, {event_id: eventID}), {event_id: eventID});

            }
        } else if (this.apiEnable) {
            this.sendToApi(name, deepMerge(eventData, {event_id: eventID}));
        }
    },
    /**
     * Dispatches a custom event to send tracking information to the API.
     *
     * The event contains tracking details, which include the provider name ('fbq'),
     * and the event object with the specified name and data.
     *
     * @param {string} name - The name of the event to be tracked.
     * @param {Object} data - The additional data associated with the event.
     */
    sendToApi: function (name, data) {
        if(this.debug) {
            console.log('FBQ.CAPI');
        }
        window.dispatchEvent(new CustomEvent('TrackingManager.track', {
            detail: {
                provider: 'fbq',
                event: {name: name, data: data}
            }
        }));
    }
};

var initFacebookManager = function (params) {
    return new FacebookManager(params);
}