---
title: 排序展示效果
date: 2018-09-04 22:48:19
tags:
---
目的呢是做一个类似如图的样子 有意思就记录一下
![](http://www.hemisu.com/demo/bubbleDemo.gif)

```js
// 生成一个长度为10的数组
const testArr = Array.from({length: 10}).map(()=> Math.round(Math.random() * 10));

// 一个冒泡排序？（大雾） 会返回每次的排序的移动方式 和 排序完之后的数组
function bubble(testArr) {
  const arr = testArr.slice();
  const operationList = [];
  for(let i = 0; i < testArr.length; i++) {
    for(let j = i + 1; j < testArr.length; j++) {
      if(arr[i] > arr[j]){
        [arr[i], arr[j]] = [arr[j], arr[i]]
        // 记录了每次移动的方式
        operationList.push({
          from: i,
          to: j,
          array: arr.slice(),
        })
      }
    }
  }
  return operationList;
}

var container = document.getElementById('container');
// 放入fragment统一插入 减少dom操作
var collect = document.createDocumentFragment('div');
var spanList = [];
for(let i = 0; i < testArr.length; i++) {
  var span = document.createElement('span');
  span.className = 'square';
  span.innerText = testArr[i];
  span.style.left = i * 40 + 'px';
  spanList[i] = span; // 保存对各个span的引用
  collect.appendChild(span);
}

container.appendChild(collect);

for(let j = 0; j < result.length; j++) { // 定时任务
  setTimeout(function() {
    const fromIndex = result[j].from;
    const toIndex = result[j].to;
    const tmp = spanList[toIndex].style.left;

    spanList[toIndex].style.left = spanList[fromIndex].style.left;
    spanList[fromIndex].style.left = tmp;
    [spanList[toIndex], spanList[fromIndex]] = [spanList[fromIndex], spanList[toIndex]]
  }, 1000 * j)//0.5秒动画 1秒延迟
}
```

配合上css的transition属性，就可以做到简单的动画效果啦

演示地址：![点击查看](http://www.hemisu.com/demo/sortDemo.html)
// 打开控制台 数据显示更清晰