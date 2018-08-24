---
title: js练习两则
date: 2018-05-11 10:24:10
tags: 
  - js
  - 前端
categories: 
  - 前端
---

<!-- more -->

```js
/* 
  请使用JavaScript实现一个getIntersection函数，可获取多个区间的交集，规则如下：
  区间用长度为2的数字数组表示，如[2, 5]表示区间2到5（包括2和5）；区间不限定方向，如[5, 2]等同于[2, 5];
  该方法可接受多个区间，并返回所有区间的交集（用区间表示），如空集用null表示。并能正确通过以下测试用例
*/
 function getIntersection(...args) {
  // your code here
  const minArr = [];
  const maxArr = [];
  // 验证输入
  const length = args.length;
  for(let i = 0; i < length; i++) {
    if(typeof args[i][0] !== 'number' || typeof args[i][1] !== 'number') return null;
  }
  // 取左边和右边
  args.forEach(v => {
    minArr.push(Math.min(...v));
    maxArr.push(Math.max(...v));
  });
  const left = Math.max(...minArr);
  const right = Math.min(...maxArr);
  if(left <= right) return [left, right];
  return null;
}

getIntersection([1, 4], [3, 5]); // [3, 4]
getIntersection([5, 2], [4, 9], [3, 6]); // [4, 5]
getIntersection([1, 7], [8, 9]); // null
getIntersection(['x', 7], [4, 9]); // null
getIntersection([1, 2]); // [1, 2]
getIntersection([1, 2], [2, 3]); // [2, 2]
```

```js
/*
  请使用 JavaScript 编写一个树的深度优先遍历函数（节点最深的最先访问到，依次类推），满足以下测试用例：
  假设树的结构如下
 */
const tree = [
  {
    id: 1,
    name: '张三',
    children: [
    	{
    		id: 2,
    		name: '李四',
    		children: [
    			{
    				id: 5,
    				name: '张五'
    			}
    		]
    	}
    ]
  },
  {
    id: 6,
    name: '玛丽'
  }
]

// 测试用例：

// 1. 生成一颗新树，将所有节点的id，加1
console.log(treeMap(tree, node => {
	let newNode = { ...node }
	newNode.id = node.id + 1
	return newNode
}))
// 打印的新树，应该与tree的结构一致，只是每个id自增1，老的tree，应该没有任何改动

// 2. 打印每个节点的id
treeMap(tree, node => {
	console.log(node.id)
	return node
});
// 应打印顺序应该是： 5，2，1，6

// 3. 对于非法输入，应直接返回第一个入参
console.log(treeMap(null)) // 输出null
console.log(treeMap(tree, true/*不是函数*/)) //输出tree


// 解答：
const deepClone = tree => {
  let newTree = [];
  tree.forEach(node => {
    let newnode = {}
    newnode.id = node.id;
    newnode.name = node.name;
    if(node.children) {
      newnode.children = deepClone(node.children);
    }
    newTree.push(newnode);
  })
  return newTree;
}

const treeMap = (root, fn) => {
  // 验证是否为数组
  if(!Array.isArray(root)) {
    return root;
  }
  // 验证是否是函数
  if({}.toString.call(fn) !== '[object Function]') {
    // 不是函数
    fn = f => f;
  }

  const deepCloneTree = deepClone(root);
  deepCloneTree.forEach((child, index, array) => {
    if(child.children) {
      dfs(child, fn);
    }
    array[index] = fn(child);
  })
  return deepCloneTree;
}

const dfs = (root, fn) => {
  if(root.children){
    root.children.forEach((child, index, array) => {
      dfs(child, fn);
      array[index] = fn(child);
    })
  }
}
```
