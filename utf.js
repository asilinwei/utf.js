;(function(root) {
  "use strict";

  var codePointAt = ''.codePointAt,
      charCodeAt = ''.charCodeAt,
      fromCodePoint = String.fromCodePoint,
      isArray = Array.isArray,
      isInteger = Number.isInteger;

  var at;

  var BASE64_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
      BASE32_SET = '0123456789abcdefghjkmnpqrtuvwxyz';

  var BASE64_FLAG = 'BASE_64',
      BASE32_FLAG = 'BASE_32';    

  var UTF = function() {
    if (!(this instanceof UTF)) {
      return new UTF();
    }
    this.VERSION = '0.0.1';
    this.base32 = { 'encode': base32Encode, 'decode': base32Decode };
    this.base64 = { 'encode': base64Encode, 'decode': base64Decode };
  };

  var createByte = function(code, shift) {
    return fromCodePoint(0x80 | (code >> shift) & 0x3F);
  };

  var nextByte = function(string) {
    if (!string[at]) {
      throw new Error('Invalid UTF-8 sequence');
    }
    var codePoint = codePointAt.call(string[at++], 0) & 0xFF;
    if ((codePoint & 0xC0) === 0x80) {
      return codePoint & 0x3F;
    }
    throw new Error('Invalid UTF-8 sequence');
  };

  var baseNEncode = function(flag) {
    return function(string) {
      if (typeof string !== 'string') {
        return '';
      }
      if (/[^\u0000-\u00FF]+/.test(string)) {
        throw new Error('Non-ASCII character');
      }
      switch (flag) {
        case 'BASE_32': return baseBase32Encode(string);
        case 'BASE_64': return baseBase64Encode(string);
      }
    };
  };

  var base64Encode = baseNEncode(BASE64_FLAG),
      base32Encode = baseNEncode(BASE32_FLAG);

  var base64Decode = function(string) {
    if (typeof string !== 'string') {
      return '';
    }
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(string) && !(string.length % 4)) {
      return baseBase64Decode(string);
    }
    throw new Error('Invalid base64 sequence');
  }; 

  var base32Decode = function(string) {};

  var utf8Encode = function(string) {
    if (typeof string !== 'string') {
      return '';
    }
    return baseUtf8Encode(string);
  };

  var utf8Decode = function(string) {
    if (typeof string !== 'string') {
      return '';
    }
    var result = [], char;
    at = 0;
    while (char = baseUtf8Decode(string)) {
      result.push(char);
    }
    return result.join('');
  };

  var ucs2Encode = function(array) {
    if (!isArray(array)) {
      return '';
    }
    return baseUcs2Encode(array);
  };

  var ucs2Decode = function(string) {
    if (typeof string !== 'string') {
      return [];
    }
    return baseUcs2Decode(string);
  };

  var baseUtf8Encode = function(string) {
    var chars = string.match(/[\s\S]/gu) || [],
        length = chars.length,
        result = [];

    for (var index = 0; index < length; index += 1) {
      var codePoint = codePointAt.call(chars[index], 0), surrFlag;     
      switch (0x0) {
        case codePoint & 0xFFFFFF80:
          result.push(fromCodePoint(codePoint));
          break;
        case codePoint & 0xFFFFF800:
          result.push(fromCodePoint(0xC0 | (codePoint >> 6)));
          break;
        case codePoint & 0xFFFF0000:
          surrFlag = codePoint & 0xFC00;
          if (surrFlag === 0xD800 || surrFlag === 0xDC00) {
            throw new Error('Lone surrogate U+' + codePoint.toString(16).toUpperCase() + ' is not a Unicode Scalar Value');
          }   
          result.push(fromCodePoint(0xE0 | (codePoint >> 12)));
          break;
        default:
          result.push(fromCodePoint(0xF0 | (codePoint >> 18)), createByte(codePoint, 12));  
      }
      if (codePoint > 0x7FF) {
        result.push(createByte(codePoint, 6));
      }
      if (codePoint > 0x7F) {
        result.push(fromCodePoint(0x80 | (codePoint & 0x3F)));
      }
    }  
    return result.join('');  
  };

  var baseUtf8Decode = function(string) {
    var codePoint, surrFlag,
        byte1, byte2,
        byte3, byte4;

    if (!string[at]) {
      return false;
    }    
    byte1 = codePointAt.call(string[at++], 0) & 0xFF;
    if ((byte1 & 0x80) === 0x0) {
      return fromCodePoint(byte1);
    }
    if ((byte1 & 0xE0) === 0xC0) {
      byte2 = nextByte(string);
      codePoint = ((byte1 & 0x1F) << 6) | byte2;
      if (codePoint >= 0x80 && codePoint <= 0x7FF) {
        return fromCodePoint(codePoint);
      }
    } 
    if ((byte1 & 0xF0) === 0xE0) {
      byte2 = nextByte(string);
      byte3 = nextByte(string);
      codePoint = ((byte1 & 0xF) << 12) | (byte2 << 6) | byte3;
      if (codePoint >= 0x800 && codePoint <= 0xFFFF) {
        surrFlag = codePoint & 0xFC00;
        if (surrFlag === 0xD800 || surrFlag === 0xDC00) {
          throw new Error('Lone surrogate U+' + codePoint.toString(16).toUpperCase() + ' is not a Unicode Scalar Value');
        }
        return fromCodePoint(codePoint);
      }  
    }
    if ((byte1 & 0xF8) === 0xF0) {
      byte2 = nextByte(string);
      byte3 = nextByte(string);
      byte4 = nextByte(string);
      codePoint = ((byte1 & 0x7) << 18) | (byte2 << 12) | (byte3 << 6) | byte4;
      if (codePoint >= 0x10000 && codePoint <= 0x10FFFF) {
        return fromCodePoint(codePoint);
      }
    }
    throw new Error('Invalid UTF-8 sequence');
  };

  var baseUcs2Encode = function(array) {
    var result = '',
        length = array.length, diff;

    for (var index = 0; index < length; index += 1) {
      var codePoint = array[index];
      if (!isInteger(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) {
        throw new Error('Invalid Unicode code point');
      }
      if (codePoint > 0xFFFF) {
        diff = codePoint - 0x10000;
        result += fromCodePoint(0xD800 | (diff >> 10)) + fromCodePoint(0xDC00 | (diff & 0x3FF));
      } else {
        result += fromCodePoint(codePoint);
      }
    }    
    return result;
  };

  var baseUcs2Decode = function(string) {
    var result = [],
        length = string.length, next;
    for (var index = 0; index < length; index += 1) {
      var value = charCodeAt.call(string[index], 0);
      if ((value & 0xFC00) === 0xD800) {
        index += 1;
        next = charCodeAt.call(string[index], 0);
        if ((next & 0xFC00) === 0xDC00) {
          result.push((((value & 0x3FF) << 10) | (next & 0x3FF)) + 0x10000);
        } else {
          index -= 1;
          result.push(value);
        }
      } else {
        result.push(value);
      }
    } 
    return result;   
  };

  var baseBase64Encode = function(string) {
    var result = [],
        cur, prev, byteNum,
        length = string.length;

    for (var index = 0; index < length; index += 1) {
      byteNum = index % 3;
      cur = codePointAt.call(string[index], 0);
      switch (byteNum) {
        case 0:
          result.push(BASE64_SET.charAt(cur >> 2));
          break;
        case 1:
          result.push(BASE64_SET.charAt(((prev & 0x3) << 4) | (cur >> 4)));
          break;
        case 2:
          result.push(BASE64_SET.charAt(((prev & 0xF) << 2) | (cur >> 6)), BASE64_SET.charAt(cur & 0x3F));    
      }
      prev = cur;
    }   
    switch (byteNum) {
      case 0:
        result.push(BASE64_SET.charAt((prev & 0x3) << 4), '==');
        break;
      case 1:
        result.push(BASE64_SET.charAt((prev & 0xF) << 2), '=');  
    } 
    return result.join('');
  };

  var baseBase64Decode = function(string) {
    var result = [],
        prev, cur, byteNum, length;

    string = string.replace(/=/g, '');
    length = string.length;
    for (var index = 0; index < length; index += 1) {
      byteNum = index % 4;
      cur = BASE64_SET.indexOf(string.charAt(index));
      switch (byteNum) {
        case 1:
          result.push(fromCodePoint((prev << 2) | (cur >> 4)));
          break;
        case 2:
          result.push(fromCodePoint(((prev & 0xF) << 4) | (cur >> 2))); 
          break;
        case 3:
          result.push(fromCodePoint(((prev & 0x3) << 6) | cur));   
      }
      prev = cur;
    } 
    return result.join('');   
  };

  var baseBase32Encode = function(string) {
    var result = [],
        prev, cur, byteNum,
        length = string.length;
    for (var index = 0; index < length; index += 1) {
      cur = codePointAt.call(string[index], 0);
      byteNum = index % 5;
      switch (byteNum) {
        case 0:
          result.push(BASE32_SET.charAt(cur >> 3));
          break;
        case 1:
          result.push(BASE32_SET.charAt(((prev & 0x7) << 2) | (cur >> 6)));
          break;
        case 2:
          result.push(BASE32_SET.charAt((prev & 0x3F) >> 1), BASE32_SET.charAt(((prev & 0x1) << 4) | (cur >> 4)));
          break;
        case 3:
          result.push(BASE32_SET.charAt(((prev & 0xF) << 1) | (cur >> 7)));
          break;
        case 4:
          result.push(
            BASE32_SET.charAt((prev & 0x7F) >> 2),
            BASE32_SET.charAt(((prev & 0x3) << 3) | (cur >> 5)),
            BASE32_SET.charAt(cur & 0x1F)
          );
      }
      prev = cur;
    } 
    switch (byteNum) {
      case 0:
        result.push(BASE32_SET.charAt((prev & 0x7) << 2));
        break;
      case 1:
        result.push(BASE32_SET.charAt((prev & 0x3F) >> 1), BASE32_SET.charAt((prev & 0x1) << 4));
        break;
      case 2:
        result.push(BASE32_SET.charAt((prev & 0xF) << 1));
        break;
      case 3:
        result.push(BASE32_SET.charAt((prev & 0x7F) >> 2), BASE32_SET.charAt((prev & 0x3) << 3));      
    }   
    return result.join('');
  };

  var baseBase32Decode = function(string) {};

  UTF.prototype = {
    'utf8Encode': utf8Encode,
    'utf8Decode': utf8Decode,
    'ucs2Encode': ucs2Encode,
    'ucs2Decode': ucs2Decode
  };

  Object.defineProperty(UTF.prototype, 'constructor', {
    'value': UTF
  });

  var utf = UTF();

  if (typeof root === 'object' && root && root.utf == null) {
    root.utf = utf;
  }
})(this);