import { PNG } from 'pngjs/browser';
import { Buffer } from 'buffer';
import { NativeModules } from 'react-native';

/** 在字符串前面添加 0, 默认补充为2位 */
export function addZero(str: string, bit = 2) {
  for (let i = str.length; i < bit; i++) {
    str = '0' + str;
  }
  return str;
}

/** 字符串转换成 byte 数组 */
export function stringToByte(str: string) {
  var bytes = new Array();
  var len, c;
  len = str.length;
  for (var i = 0; i < len; i++) {
    c = str.charCodeAt(i);
    if (c >= 0x010000 && c <= 0x10ffff) {
      bytes.push(((c >> 18) & 0x07) | 0xf0);
      bytes.push(((c >> 12) & 0x3f) | 0x80);
      bytes.push(((c >> 6) & 0x3f) | 0x80);
      bytes.push((c & 0x3f) | 0x80);
    } else if (c >= 0x000800 && c <= 0x00ffff) {
      bytes.push(((c >> 12) & 0x0f) | 0xe0);
      bytes.push(((c >> 6) & 0x3f) | 0x80);
      bytes.push((c & 0x3f) | 0x80);
    } else if (c >= 0x000080 && c <= 0x0007ff) {
      bytes.push(((c >> 6) & 0x1f) | 0xc0);
      bytes.push((c & 0x3f) | 0x80);
    } else {
      bytes.push(c & 0xff);
    }
  }
  return bytes;
}

/** byte 数组转换成字符串 */
export function byteToString(arr: string | number[]) {
  if (typeof arr === 'string') {
    return arr;
  }
  var str = '',
    _arr = arr;
  for (var i = 0; i < _arr.length; i++) {
    var one = _arr[i].toString(2),
      v = one.match(/^1+?(?=0)/);
    if (v && one.length == 8) {
      var bytesLength = v[0].length;
      var store = _arr[i].toString(2).slice(7 - bytesLength);
      for (var st = 1; st < bytesLength; st++) {
        store += _arr[st + i].toString(2).slice(2);
      }
      str += String.fromCharCode(parseInt(store, 2));
      i += bytesLength - 1;
    } else {
      str += String.fromCharCode(_arr[i]);
    }
  }
  return str;
}


/**
 * 将整型数组转换为16进制字符串表示
 * @param {number[]} intArray - 包含整数的数组
 * @return {string} - 表示整型数组的16进制字符串
 */
export function intArrayToHex(intArray: number[]) {
  return intArray.map(byte => {
    return byte.toString(16).padStart(2, '0');
  }).join('');
}


const BitmapModule = NativeModules.BitmapModule;
export async function rgbaToBase(data:any,index:number){ 

 
 const height = 477
  const width = 200
  let argbArray= new Array(height * width).fill(index)
  /*const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const argb = argbArray[width * y + x];

      png.data[idx] = argb & 0xff; // Red
      png.data[idx + 1] = argb  & 0xff; // Green
      png.data[idx + 2] = argb & 0xff; // Blue
      png.data[idx + 3] = 255; // Alpha
    }
  }
   const buffer = PNG.sync.write(png);*/
  const base64Image = await BitmapModule.getBitmapFromPath(data,width,height);
  const base88 = 'data:image/png;base64,'+base64Image; //`data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
  console.log('index='+index+' base='+base88)
  return base88;
}
