const Formatters = (app) => {
  app.locale = navigator.language || navigator.browserLanguage || ( navigator.languages || [ "en" ] ) [ 0 ];
  app.Num = (n, minF, maxF) => isNaN(+n) || new Intl.NumberFormat('en-GB', {maximumFractionDigits:typeof(maxF)==='number'?maxF:2,minimumFractionDigits:typeof(minF)==='number'?minF:typeof(maxF)==='number'?maxF:2}).format(+n);
  app.Date = (d, dateStyle, timeStyle) => new Intl.DateTimeFormat('en-GB', {dateStyle:dateStyle || dateStyle==='none' ? undefined : 'short', timeStyle:timeStyle}).format(d);  
}
export {Formatters};