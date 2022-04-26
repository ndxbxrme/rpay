const TurboMini = ((basePath) => {
  const useHash = /\.html/.test(document.baseURI);
  const state = {};
  const controllers = {};
  const templates = {};
  const context = {page:'default',params:[],controller:null};
  const $ = (s, e, a) => {
    const obj = (e || document)['querySelector' + (a ? 'All' : '')](s) || {};
    return Object.assign(obj, {
      addClass: (name) => {obj.className = obj.className.replace(new RegExp(`\s*\W${name}\W`), '') + ' ' + name;},
      removeClass: (name) => {obj.className = obj.className.replace(new RegExp(`\s*\W${name}\W`), '');}
    });
  }
  const $t = (s, data, isText) => (isText ? s : templates[s] || $(`script[name="${s}"]`).innerText || $(`template[name="${s}"]`).innerHTML).replace(/\{\{(.+?)\}\}/g, (all, m) => (new Function(`with(this) {` + (m.includes('return') ? m : `return (${m})`) + '}').call(data)));
  const refresh = () => ($('page').innerHTML = $t(context.page, context.controller));
  const start = async () => {
    try {
      context.controller && context.controller.unload && await context.controller.unload();
      [context.page, ...context.params] = (app.useHash ? window.location.hash : window.location.pathname).replace(basePath,'').replace(/^[\/#]/, '').split(/\//g);
      context.page = context.page || 'default';
      context.controller = controllers[context.page] && await controllers[context.page](context.params);
      refresh();
      context.controller && context.controller.postLoad && await context.controller.postLoad();
      (window.scrollRoot || document.body).scrollIntoView();
    } catch(e) {app.errorHandler && app.errorHandler(e)}
  }
  const goto = (route) => {
    if(app.useHash) document.location.hash = route;
    else {
      route = document.location.origin + '/' + route.replace(/^\//, '');
      route !== document.location.pathname && window.history.pushState(route, null, route);
      start();
    }
  };
  const controller = (name, fn) => {controllers[name] = fn; return app};
  const template = (name, text) => {templates[name] = text; return app};
  const run = async (fn) => {await fn(app); return app};
  window.addEventListener('popstate', start);
  const app = {$,$t,goto,start,run,refresh,controller,template,context,state,useHash};
  return app;
});
export {TurboMini};