---
title: '一次打包错误 引起的对 React Components, Elements, Instance三者的认识'
date: 2018-10-17 10:37:36
tags:
---

在一次项目重构中，我将filter组件需要的`Input`、`Select`之类通过`Connect`包裹后，通过`<MyFromItem />`这种形式当作参数传入。

大致的数据结构如下，component可以传入自定义组件或者直接传入`<Input />`这种形式；

```js
[
  {
    name: 'name',
    label: '姓名',
    component: <StaffFormItem />,
  }
  ...
]

```

在本地跑的时候，并没有发现问题；然后打包之后就发现跑不通，报错`n is not a function`之类的错误；

打开sourcemap之后定位到这个n是rc-form中的getFieldDecorator函数，遂寻找这个值未传入的原因。

调试了多次（打包实在是太慢了……），终于发现是判断类型的时候发生了问题：

```js
// 这里传入了<StaffFormItem />
const type = component.type.name;
swith(type) {
  case 'Connect': // 判断受控组件
    return //...
}
```

打包之后，这里的type会从`Connect`变为`n`, `j`这种混淆后的形式，万万没想到。

解决问题之后去搜索了一下，出来了3个概念:

- Components

- Component Instances

- Elements

在其他UI框架中的，一般只有模板（`Class`）和实例（`new Class()`）这样的概念；而在React中，`Component Instances`和`Elements`不是同一种类型的东西，它们之间没有一对一的关系；

看下面一段代码:

```js
import React, { Component } from 'react';

class MyComponent extends Component {
  constructor(props) {
    super(props);
    console.log('这时候是Component Instance', this);
  }

  render() {
    const another_element = <div>Hello World!</div>;
    console.log('这里是一个element', another_element);
    return another_element;
  }
}

console.log('这是一个Component', MyComponent);

const element = <MyComponent />;

console.log('这是一个element', element);

```

上述这段代码，可以得出：

- `MyComponent`(这个class自身)是一个Component

- `element`是一个对象，但是它不是MyComponent的一个实例。它仅仅描述了一个对象实例(`Component Instance`)被创建了，它是一个拥有`key`、`props`、`ref`、`type`这些属性的一个对象。在这里，`key`和`ref`的值为`null`,`props`是一个空对象，`type`即为`MyComponent`字符串。

- 一个`MyComponent`的实例将会在`element`被render之后被创建(在上述代码中，实例在构造函数中打印)

- `anthor_element`也是一个对象，它的`key`、`props`、`ref`和上面所述的一样，但是它的`type`为`div`

具体可以看[React Components, Elements, and Instances](https://reactjs.org/blog/2015/12/18/react-components-elements-and-instances.html)

总结一下，可以看出React官方对这几个概念的定义非常清楚：
- `An element is a plain object describing a component instance or DOM node and its desired properties.`

- `A ReactElement is a light, stateless, immutable, virtual representation of a DOM Element`

`Component`可以被用来创建一个`Instance`，当`Instance`被render之后就创建了一个`Element`。

创建实例的过程不需要我们手动进行；
多个Element可以描述同一个实例（比如`<Parent />`组件的`render()`返回了`<Child />`，每次触发`render`时都会返回一个新的`element`，但是已经存在`Child`实例可能被复用）；
一个Elmenet也可以用于描述多个实例（比如把一个`element`存储到一个变量中`const a = <Child />`,然后调用多次`<div>{a} {a} {a}</div>`）

