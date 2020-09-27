---
title: webpack原理 - 作者教你手把手打包
date: 2020-09-27 13:40:28
tags:
  - webpack
  - 笔记
categories: 前端
---
> 本质上，webpack 是一个用于现代 JavaScript 应用程序的静态模块打包工具。当 webpack 处理应用程序时，它会在内部构建一个 依赖图(dependency graph)，此依赖图对应映射到项目所需的每个模块，并生成一个或多个 bundle。

为了更好地理解模块打包工具背后的理念，以及在底层它们是如何运作的，在观看 Tobias Koppers 放在油管的视频后整理本文，后续将录制视频帮助理解，demo地址将在底部放出。

- [Demo介绍](#demo介绍)
- [手动模拟打包流程](#手动模拟打包流程)
  - [第一步：生成模块依赖图 （module-graph）](#第一步生成模块依赖图-module-graph)
  - [第二步：生成区块图（chunk graph）](#第二步生成区块图chunk-graph)
  - [第三步：优化可用模块（optimize）](#第三步优化可用模块optimize)
  - [第四步：串联模块（concatenate-modules）](#第四步串联模块concatenate-modules)
  - [第五步：标号](#第五步标号)
  - [第六步：模块代码生成 （code-generation-modules）](#第六步模块代码生成-code-generation-modules)
  - [第七步：资源整合（asstes）](#第七步资源整合asstes)
- [Demo地址](#demo地址)
- [参考链接](#参考链接)


## Demo介绍

视频[1](https://www.youtube.com/watch?v=UNMkLHzofQI)从开头介绍了整个项目的大体内容，位于 `src` 文件中：项目以 `React` 作为示范，引入一个异步懒加载组件（`lazy component`）展示到根组件中。

项目目录如下：

```jsx
├── README.md
├── index.html
├── one-day-bundler // 按照打包流程顺序整理
├── react-bundle
	├── webpack.config.js // 预打包 webpack 配置
├── src // 源文件
├── webpack.config.js // 主 webpack 配置
```

1. 主 `webpack` 配置

    文件位于 `wepback.config.js` ，主要内容是使用 `babel-loader` 解析 `js` 文件，然后配置了 3 个 `alias` 解析 `react`、`react-dom` 以及 `react-bundle` 

2. 预打包 `webpack` 配置

    文件位于 `react-bundler/webpack.config.js` 用于将 `react` 和 `react-dom` 以 `commonjs` 规范打包到 `react-bundler/dist/react-bundle.js` 中，这个地址也是主 `webpack` 中最后的 `alias` 指定的地址。这一步预打包是为了更方便后续的演示。

<!--more-->

安装完依赖之后，我们可以先执行一波 `yarn webpack --display-modules` 查看 `webpack` 打包后的结果

![image](1.png)

使用 webpack —display-modules 查看打包结果

## 手动模拟打包流程

`webpack` 的打包流程如 `one-day-bundler` 中的各文件夹所示，接下来我们将手动模拟打包流程

### 第一步：生成模块依赖图 （module-graph）

自 `webpack4` 开始，大部分的配置都内置了，这里的解析入口从 `src/index.js` 开始：

```jsx
Modules:

* src/index.js (ESM)

TODO-List:

* ./src in .../ --> .../src/index.js
```

找到入口文件后我们的 `rules` 会解析到 `.js` 后缀的文件，通过 `babel-loader` 转译到 `modules` 中，我们可以手动模拟这个过程：

`yarn babel src/index.js -d one-day-bundler/10-module-graph/modules`

接着以 `src/index.js` 开始，静态分析 `ESM` 的 `import` 发现引用了 `react`、`react-dom` 和 `./HelloWorld`。由于 `react`、`react-dom` 已经在前面预编译为 `commonjs` 规范，这里就不需要继续往下解析了。

在 `./HelloWorld` 中解析到以下三处，加入到 `module graph` 中

```jsx
import React from "react"; // line: 9
import BigText from "./BigText"; // line: 10

import( /* webpackChunkName: "async" */"./Lazy").then(function (_ref) { // line:31
```

与前面相同，继续手动模拟 `babel-loader` 的过程

`yarn babel src/HelloWorld.js -d one-day-bundler/10-module-graph/modules`

`yarn babel src/BigText.js -d one-day-bundler/10-module-graph/modules`

`yarn babel src/Lazy.js -d one-day-bundler/10-module-graph/modules`

经历以上三步内容，我们可以在目录中看到以下结构：

```jsx
one-day-bundler/10-module-graph/modules/src
├── BigText.js
├── HelloWorld.js
├── Lazy.js
└── index.js
```

再进入 `src/BigText.js` 以及 `src/Lazy.js` 分析，最终的 `module graph` 图如下：

```jsx
Modules:

* src/index.js (ESM)
    # react
    # react-dom
    # ./HelloWorld
    - react-bundle.js
    - src/HelloWorld.js
* react-bundle.js
* src/HelloWorld.js (ESM)
    # react
    # ./BigText
    # (async) ./Lazy
    - react-bundle.js
    - src/BigText.js
    - (async) src/Lazy.js
* src/BigText.js (ESM)
    # react
    - react-bundle.js
* src/Lazy.js (ESM)
    # react
    # ./BigText
    - react-bundle.js
    - src/BigText.js

TODO-List:

x ./src in .../ --> .../src/index.js
x react-bundle in .../src --> react-bundle
x ./HelloWorld in .../src --> .../src/HelloWorld.js
x ./BigText in .../src --> .../src/BigText.js
x ./Lazy in .../src --> .../src/Lazy.js
```

### 第二步：生成区块图（chunk graph）

这一步将各个模块分发到chunk中，chunk 有两种形式：

- `initial(初始化)` 是入口起点的 main chunk。此 chunk 包含为入口起点指定的所有模块及其依赖项。
- `non-initial` 是可以延迟加载的块。可能会出现在使用 [动态导入(dynamic imports)](https://webpack.docschina.org/guides/code-splitting/#dynamic-imports) 或者 [SplitChunksPlugin](https://webpack.docschina.org/plugins/split-chunks-plugin/) 时。

分发完毕后 `chunk graph` 如下

```jsx
ChunkGroups:

* EntryPoint main
  + Chunk main
    - src/index.js
    - react-bundle.js
    - src/HelloWorld.js
    - src/BigText.js
* ChunkGroup async (parent: main)
  + Chunk asnyc
    - src/Lazy.js
		- react-bundle.js
		- src/BigText.js
```

### 第三步：优化可用模块（optimize）

在上一步的基础上，我们继续优化可用模块；在这个Demo中，这一步的作用是剔除 `async` 中已经存在的 `module` 。

`main chunk` 由于是入口，无任何已获取的 `module`，所以为空；但是到 `async chunk`，在加载这个 `chunk` 时我们已经获取了 `main chunk` 中所有的 `module`，我们可以将其中的 `module` 都复制到 `async` 的 `availableModules` 中，同时剔除重复出现的 `react-bundle.js` 和 `src/BigText.js` ，优化完毕后的区块图（`chunk graph`）如下：

```jsx
optimization.availableModules

ChunkGroups:

* EntryPoint main
    availableModules: []
  + Chunk main
    - src/index.js
    - react-bundle.js
    - src/HelloWorld.js
    - src/BigText.js
* ChunkGroup async (parent: main)
  availableModules:
    - src/index.js
    - react-bundle.js
    - src/HelloWorld.js
    - src/BigText.js
  + Chunk async
    - src/Lazy.js
```

### 第四步：串联模块（concatenate-modules）

这一步会按以下规则将模块串联到一起：

首先确保入口是 `ESM` 的规范，在此基础上检查它的依赖模块是否符合：

1. 同样也是 `ESM` 规范
2. 正常的 `import` （不是异步 `import` ）
3. 处于同一个区块（`chunk`）
4. all importer must be included （这条没懂，求读者理解）

最后一条规则是尝试所有的依赖，经过以上条件筛选后仅有 `src/HelloWorld.js` 与 `src/index.js` 同为 `ESM` 规范；`src/index.js` 正常引用 `src/HelloWorld.js` 且两者处于同一区块（`chunk`），因此我们可以将两者串联

```jsx
Modules:

* src/index.js (ESM) {main}
    # react
    # react-dom
    # ./HelloWorld
    - react-bundle.js <- not ESM
    - src/HelloWorld.js <- ok
        - react-bundle.js <- not ESM
        - src/BigText.js <- Lazy is not same chunks
        - (async) src/Lazy.js <- not normal import
x react-bundle.js {main} <- not ESM
* src/HelloWorld.js (ESM) {main}
    # react
    # ./BigText
    # (async) ./Lazy
    - react-bundle.js <- not ESM
    - src/BigText.js <- Lazy is not same chunks
    - (async) src/Lazy.js <- not normal import
* src/BigText.js (ESM) {main}
    # react
    - react-bundle.js <- not ESM
* src/Lazy.js (ESM) {async}
    # react
    # ./BigText
    - react-bundle.js <- not ESM
    - src/BigText.js <- not same chunks
```

串联后模块依赖图（ `module graph` ）变为如下所示：

```jsx
* src/index.js + 1 module
    # react
    # react-dom
    # ./HelloWorld
    # ./BigText
    # (async) ./Lazy
    - react-bundle.js
    - src/HelloWorld.js
    - src/BigText.js
    - (async) src/Lazy.js
    + src/index.js (ESM)
    + src/HelloWorld.js (ESM)
* react-bundle.js
* src/BigText.js (ESM)
    # react
    - react-bundle.js
* src/Lazy.js (ESM)
    # react
    # ./BigText
    - react-bundle.js
    - src/BigText.js
```

### 第五步：标号

这一步将 `module` 和 `chunk` 按序标记，方便后续引用；实际 `wepback` 按照 `production mode` 进行打包的产物，也是以数字标记的。如果按照 `development mode` 打包则是以解析的相对路径命名的。

```jsx
Modules:

* [0] src/index.js + 1 module
    # react
    # react-dom
    # ./HelloWorld
    # react
    # ./BigText
    # (async) ./Lazy
    - react-bundle.js
    - src/HelloWorld.js
    - src/BigText.js
    - (async) src/Lazy.js
    + src/index.js (ESM)
    + src/HelloWorld.js (ESM)
* [1] react-bundle.js
* [2] src/BigText.js (ESM)
    # react
    - react-bundle.js
* [3] src/Lazy.js (ESM)
    # react
    # ./BigText
    - react-bundle.js
    - src/BigText.js

ChunkGroups:

* EntryPoint main
  + [1] Chunk main
    - src/index.js + 1 modules
    - react-bundle.js
    - src/BigText.js
* ChunkGroup async (parent: main)
  + [0] Chunk async
    - src/Lazy.js
```

### 第六步：模块代码生成 （code-generation-modules）

这里是**关键**的一步，从此处开始将会将所有的 `module` 包裹一层**蛋清加面包糠**然后炸至金黄（🐶），完成后会将所有模块打包至 `chunk` 中，此处即为 `demo` 里给的 `runtime.js` 和 `chunk.js`。

这里的**蛋清加面包糠**由于前面预处理 `react-bundle` 时使用的是 `commonjs2` 规范，所以与其相关的 `runtime.js` 也要和 `exports`、 `module` 打交道。

`runtime.js` 在浏览器运行过程中，`webpack` 用来连接模块化应用程序所需的所有代码。它包含：在模块交互时，连接模块所需的加载和解析逻辑。其实无论使用什么模块规范，所有的 `import` 或者 `require` 、`define` 都会转变为 `__webpack_require__` （本文既视频和demo中提到的 `__magic__`），通过 `__webpack_require__` 和对应的模块标识符（这里是第五步标注的数字）来找到对应的模块

在模块代码生成的过程中参考的都是已经在第五步标号完的 `Module Graph` 和 `Chunk Graph`。

首先我们复制由第一步 `babel-loader` 转译的文件夹到目录，依次对如下文件做包装处理：

```jsx
one-day-bundler/60-code-generation-modules/modules/src
├── BigText.js
├── HelloWorld.js
├── Lazy.js
└── index.js
```

`BigText.js` 中引用 `React`，根据 `Module Graph` 得出从 `module [1]` 得到模块的导出内容

原 `BigText.js` 中的内容：

```jsx
import React from "react";

export default (function (_ref) {
    var children = _ref.children;

    return React.createElement(
        "h1",
        null,
        children
    );
});
```

使用一个魔术方法 （视频中作者称之为 `__magic__`) 对其进行改造，将其包装在一个函数中并且传入 `commonjs` 规范导出模块所需的 `exports` 对象；

替换 `import React from "react";` 变为 `var X = __magic__(1);`

这里值得一提的是 `ESM` 的默认导出内容会挂载在 `X.default` 上，因此需要把 `React` 变量都替换为 `X.default`

替换完毕后的内容如下：

```jsx
(function(__magic__, exports) {
    var X = __magic__(1);

    exports.default = (function (_ref) {
        var children = _ref.children;

        return X.default.createElement(
            "h1",
            null,
            children
        );
    });
})
```

接着处理 `Lazy.js` ，与 `BigText.js` 相似，唯一的不同在于多导入了一个 `BigText.js` ，包装完毕后如下：

```jsx
(function (__magic__, exports, module) {
    var X = __magic__(1);
    var Y = __magic__(2);
    
    exports.default = (function () {
        return X.default.createElement(
            Y.default,
            null,
            "Lazy Loaded!"
        );
    });
})
```

最后需要处理的就是 `index.js + 1 module` 这一部分，在第四步中已经通过串联模块将`HelloWorld.js` 和 `index.js` 合并到一起了，这一部分的代码比较多，但是做的事情与前面两步没有什么不同，依旧是根据 `import` 的来源找到 `Module Graph` 的序号，用 `__magic__` 引用后使用，将文件整合完毕后就可以删除 `HelloWorld.js` 了。

值得一提的是在 `31 行` 出现的：

```jsx
import( /* webpackChunkName: "async" */"./Lazy").then(function (_ref) {
```

这里涉及到异步模块的加载，也就是需要第二个 `chunk` 的参与，即可以延迟加载的 `async chunk` ，其背后的核心原理就是 `jsonp`。

一般我们如何实现一个 `jsonp` ？抛开一堆过期时间、回调名称等等的拓展，核心的内容无非就是如下所示：

```jsx
var script = document.createElement('script') // 创建一个标签
script.src = 'urls' // 指定资源地址，这即为第二个chunk地址
document.head.appendChild(script) // 插入文档中触发加载
```

那如何完成 `31 行` 中对 `import( /* webpackChunkName: "async" */"./Lazy")` 的改造呢？

我们观察到这句动态导入语句后使用了 `Promise.then` 实例方法，于是这个 `jsonp` 的实现应当用 `Promise` 包装一下，将 `resolve` 的控制权交出；同时在 `async chunk` 中调用 `resolve` 并将 `async chunk` 中的模块都加入到 `module`s 中。

这些工具函数都放置在 `runtime.js` 文件中，核心实现如下：

```jsx
__magic__.loadChunk = function(chunkId) {
    return new Promise((resolve) => {
        chunkResolves[chunkId] = resolve // 移交控制权
        var script = document.createElement('script')
        script.src = "one-day-bundler/70-assets" + {0: "async"}[chunkId] + ".js";
        document.head.appendChild(script)
    })
}

window.magicJsonp = function(chunkId, newModules) {
    for (var id in newModules) {
        modules[id] = newModules[id] // 将这个async chunk的所有模块加入到 modules
    }
    chunkResolves[chunkId](); // resolve 这次 loadChunk，完成动态导入
}
```

经过改造后 `31 行` 的代码就变为如下

```jsx
__magic__.loadChunk(0).then(__magic__.bind(null, 3)).then(function (_ref) {
```

### 第七步：资源整合（asstes）

这一步的主要工作就是缝合怪，把第六步打包出来的 `Modules` 文件下的内容填充到 `runtime` 和 `chunk` 中。

`runtime` 文件：

```jsx
!(function (modules) {
    var cache = {} // 缓存
    var chunkResolves = {};

    window.magicJsonp = function(chunkId, newModules) {
        for (var id in newModules) {
            modules[id] = newModules[id]
        }
        chunkResolves[chunkId]();
    }
    function __magic__(id) {
        if(cache[id]) return cache[id].exports;
        var module = {
            exports: {}
        };
        modules[id](__magic__, exports, module);
        cache[id] = module;
        return module.exports;
    }
    __magic__.loadChunk = function(chunkId) {
        return new Promise((resolve) => {
            chunkResolves[chunkId] = resolve
            var script = document.createElement('script')
            script.src = "one-day-bundler/70-assets" + {0: "async"}[chunkId] + ".js";
            document.head.appendChild(script)
        })
    }

    __magic__(0) // 根入口，module 0 即 index.src + 1 module (HelloWorld)
}({
		// 即将填充的内容 modules
	0: (), // modules/src/index.js 内容
	1: (), // modules/src/react-bundle.js 内容
	2: (), // modules/src/BigText.js 内容
}))
```

`chunk` 文件：

```jsx
window.magicJsonp(0, {
    3: (), // modules/src/Lazy.js 内容
});
```

这里还有一个知识点，在 `index.js` 的 `31行` 有个这样的注释

```jsx
/* webpackChunkName: "async" */
```

所以需要将 `chunk` 命名为 `async`；同时根目录的入口文件 `index.html` 中引用的是 `main.js` ，所以 `runtime.js` 也需要更名。

修改完毕后，在浏览器打开 `index.html` 我们就能看到以下内容：

![https://s3-us-west-2.amazonaws.com/secure.notion-static.com/0bf1081c-17be-4404-8f88-a3a198e80896/Untitled.png](2.png)

## Demo地址

原作者 demo 地址：[https://github.com/sokra/webpack-meetup-2018-05](https://github.com/sokra/webpack-meetup-2018-05)

本文 Fork 整理后： [https://github.com/hemisu/webpack-meetup-2018-05](https://github.com/hemisu/webpack-meetup-2018-05)

## 参考链接

[1]: Webpack founder Tobias Koppers demos bundling live by hand, [https://www.youtube.com/watch?v=UNMkLHzofQI](https://www.youtube.com/watch?v=UNMkLHzofQI)

[2]: webpack docs, [https://webpack.docschina.org/](https://webpack.docschina.org/)