(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.XcShare = factory());
}(this, (function () { 'use strict';

  function setPublicPath (name) {
    if (window.singleSpaNavigate && window.System) {
      window.SystemjsWebapckInterop.setPublicPath(name);
    }
  }

  function boot(store, router, Root) {
    if (typeof window.Vue === 'undefined') {
      throw new ReferenceError('No Gobal Vue found!');
    }

    VuexRouterSync.sync(store, router);
    var bootstrap;
    var mount;
    var unmount;
    var options = {
      router: router,
      store: store,
      render: function render(h) {
        return h(Root);
      }
    };

    if (window.singleSpaNavigate && window.singleSpaVue) {
      var vueLifecycles = window.singleSpaVue({
        Vue: Vue,
        appOptions: options
      });
      bootstrap = vueLifecycles.bootstrap;
      mount = vueLifecycles.mount;
      unmount = vueLifecycles.unmount;
    } else {
      new Vue(options).$mount('#app');
    }

    return {
      bootstrap: bootstrap,
      mount: mount,
      unmount: unmount
    };
  }

  !function () {
    if (typeof window.Vue === 'undefined') {
      return;
    }

    var toQueryString = function toQueryString(params) {
      return Object.keys(params).reduce(function (target, key) {
        target.push("".concat(key, "=").concat(params[key]));
        return target;
      }, []).join('&');
    };

    Vue.mixin({
      beforeMount: function beforeMount() {
        var asyncData = this.$options.asyncData;

        if (asyncData) {
          asyncData({
            store: this.$store,
            route: this.$route
          });
        }
      },
      beforeRouteUpdate: function beforeRouteUpdate(to, from, next) {
        var asyncData = this.$options.asyncData;

        if (asyncData) {
          asyncData({
            store: this.$store,
            route: to
          });
        }

        next();
      }
    });
    Vue.mixin({
      methods: {
        navigateToUrl: function navigateToUrl(url) {
          var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
          var querystr = toQueryString(params);
          var fullUrl = querystr ? "".concat(url, "?").concat(querystr) : url;

          if (window.singleSpaNavigate) {
            window.singleSpa.navigateToUrl(fullUrl);
          } else {
            var protocol = location.protocol;
            var host = location.host;
            location.href = "".concat(protocol, "//").concat(host).concat(fullUrl);
          }
        }
      }
    });
  }();

  var webStorage;

  try {
    webStorage = localStorage;
  } catch (e) {
    console.log('localStorage not available, fallback to sessionStorage');
    webStorage = sessionStorage;
  } //暴露webStorage


  window.webStorage = webStorage;
  var webStorage$1 = webStorage;

  var TOKEN_KEY = 'token';
  var REFRESH_TOKEN_KEY = 'refreshToken';

  var getItem = function getItem(key) {
    return webStorage$1.getItem(key) || '';
  };

  var setItem = function setItem(key, value) {
    return webStorage$1.setItem(key, value);
  };

  var getToken = function getToken() {
    var token = getItem(TOKEN_KEY);
    return token ? 'Bearer ' + token : '';
  };

  var setToken = function setToken(token) {
    return setItem(TOKEN_KEY, token);
  };

  var getRefreshToken = function getRefreshToken() {
    return getItem(REFRESH_TOKEN_KEY);
  };

  var setRefreshToken = function setRefreshToken(refreshToken) {
    return setItem(REFRESH_TOKEN_KEY, refreshToken);
  };

  var clearToken = function clearToken() {
    webStorage$1.removeItem(TOKEN_KEY);
    webStorage$1.removeItem(REFRESH_TOKEN_KEY);
  };

  var token = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getToken: getToken,
    setToken: setToken,
    getRefreshToken: getRefreshToken,
    setRefreshToken: setRefreshToken,
    clearToken: clearToken
  });

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  var instance = axios.create({
    baseURL: '/api/v1',
    headers: {
      'Content-Type': 'application/json'
    },
    transformRequest: [function transformRequest(data) {
      return JSON.stringify(data);
    }],
    // transformResponse: [function transformResponse (data) {
    //   alert('data:' + data)
    //   return data.data
    // }],
    responseType: 'json'
  });
  instance.interceptors.request.use(function (config) {
    var token = getToken();

    if (token) {
      config.headers.Authorization = token;
    }

    if (config.method === 'post' || config.method === 'put') {
      config.data = _objectSpread2(_objectSpread2({}, config.data), {}, {
        _t: Date.parse(new Date()) / 1000
      });
    } else if (config.method === 'get' || config.method === 'delete') {
      config.params = _objectSpread2(_objectSpread2({}, config.params), {}, {
        _t: Date.parse(new Date()) / 1000
      });
    }

    return config;
  });

  var retry = function retry(config) {
    return instance.post('/sysUserLogin/refreshToken', {
      refreshToken: getRefreshToken()
    }).then(function (res) {
      setToken(res.access_token);
      setRefreshToken(res.refresh_token);
      return instance.request(config);
    });
  };

  var isTokenExpries = function isTokenExpries(response) {
    return response.status === 401 && response.request.response.code === 403 && getRefreshToken();
  };

  instance.interceptors.response.use(function (response) {
    if (response.data) {
      return response.data.data;
    }
  }, function (error) {
    if (isTokenExpries(error.response)) {
      return retry(error.config);
    } else {
      if (error.response.status === 401) {
        clearToken();
        window.singleSpa.navigateToUrl('/user/login');
      }

      return Promise.reject(error);
    }
  });

  var XcShare = {
    setPublicPath: setPublicPath,
    boot: boot,
    axios: instance,
    token: token,
    webStorage: instance
  };

  return XcShare;

})));
