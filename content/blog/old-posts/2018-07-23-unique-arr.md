---
title: 复杂数组去重
date: 2018-07-23 23:27:28
tags: javascript
---

数组去重 内部可能会有数组，对象

<!-- more -->

用例
```js
var arr1 = [1, 1, '1', '1']
var arr2 = [
	{},
	{},
	{
		a: 1,
		b: 1
	},
	{
		a: 1,
		b: 1
	},
	[1, 2],
	[1, 2]
];
var arr3 = [
  {
		a: 1,
		b: {
      a: 1,
      b: {
        a: 1,
        b: 1
      },
    },
  },
  {
		a: 1,
		b: {
      a: 1,
      b: {
        a: 1,
        b: 1
      },
    },
	},
];

```
<!--more-->
结果
```js
arr1 = [1, '1'];
arr2 = [
	{},
	{
		a: 1,
		b: 1
	},
  [1, 2],
];
arr3 = [
  {
		a: 1,
		b: {
      a: 1,
      b: {
        a: 1,
        b: 1
      },
    },
  },
]
```

代码
```js

console.log(unique(arr1));
console.log(unique(arr2));
console.log(unique(arr3));

function unique(arr) {
	var result = [];
	var len = arr.length;
	for (var i = 0; i < len; i++) {
		var isExist = false;
		for (var j = i + 1; j < len; j++) {
			if (isEqual(arr[i],arr[j])) {
				isExist = true;
			}
		}
		if (isExist) {
			isExist = false;
			continue;
		}
		result.push(arr[i]);
	}
	return result;
}

// isEqual typeof null, object, arr
/**
 * isEqual
 * [] object
 * [] arr
 */
function isEqual(a, b) {
	var toString = Object.prototype.toString;
	var typeA = toString.call(a);
	var typeB = toString.call(b);
	if (typeof a === 'object' && typeof b === 'object') {
		if (typeA === '[object Number]' && a !== b) return true; // NaN
		if (typeA === '[object Array]') {
			var aLen = a.length;
			var bLen = b.length;
			if (a === b) return true;
			if (aLen !== bLen) return false;
			if (a == null || b == null) return false;
			var newa = a.slice();
			var newb = b.slice();
			newa.sort();
			newb.sort();
			while(aLen--) {
				if(!isEqual(newa[aLen], newb[aLen])) return false;
			}
			return true;
		}
		if (typeA === '[object Object]') {
			for (var propA in a) {
				if (a.hasOwnProperty(propA)) {
					if (!b.hasOwnProperty(propA)) {
						return false;
					} else {
						return isEqual(a[propA], b[propA]);
					}
				}
			}
			// 判断是否为空对象
			for (var propB in b) {
				return false;
			}
			return true;
		}
	} else if (a === b) {
		return true;
	} else {
		return false;
	}
}

function isEmptyObj(a) {
	var toString = Object.prototype.toString;
	if (toString.call(a) !== '[object Object]') throw new Error(a +' is not a object');
	for(var prop in a) {
		return false;
	}
	return true;
}

// console.log(isEqual(1, 1)) // t
// console.log(isEqual(1, 2)) // f
// console.log(isEqual([], [])) // t
// console.log(isEqual([1, 1], [1, 1])) // t
// console.log(isEqual([1, 1], [1, 2])) // f
// console.log(isEqual({
// 	a: 1,
// 	b: 1
// }, {
// 	a: 1,
// 	b: 1
// })) // t
// console.log(isEqual({
// 	a: 1,
// 	b: 1
// }, {
// 	a: 1,
// 	b: 2
// })) // f
```