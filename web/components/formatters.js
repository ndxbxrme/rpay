const Formatters = (app) => {
  app.locale = navigator.language || navigator.browserLanguage || ( navigator.languages || [ "en" ] ) [ 0 ];
  app.Num = (n, minF, maxF) => isNaN(+n) || new Intl.NumberFormat('en-GB', {maximumFractionDigits:typeof(maxF)==='number'?maxF:2,minimumFractionDigits:typeof(minF)==='number'?minF:typeof(maxF)==='number'?maxF:2}).format(+n);
  app.Date = (d, dateStyle, timeStyle) => new Intl.DateTimeFormat('en-GB', {dateStyle:dateStyle || dateStyle==='none' ? undefined : 'short', timeStyle:timeStyle}).format(d); 
  app.Address = (address) => new Array(2).fill(address).map((add, i) => i===0 ? add.substr(0,6) : add.substr(-4)).join('&nbsp;...&nbsp;');
}
export {Formatters};