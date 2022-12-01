const parseCookies = (req, res, next) => {
  var cookiesObj = {}
  var cookiesStr = req.headers.cookie;
  if (cookiesStr) {
    var cookieArray = cookiesStr.split('; ');
    cookieArray.forEach((cookie) => {
      var cookiePair = cookie.split('=');
      cookiesObj[cookiePair[0]] = cookiePair[1];
    })
  }

  req.cookies = cookiesObj;
  next();
};

module.exports = parseCookies;