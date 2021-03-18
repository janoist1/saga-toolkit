# redux-toolkit

## introduction

提供实用的工具函数，改善使用redux的开发体验，提供代码可读性。

* `createReducer` a functional way to write reducer
* `createAction`  a simple way to write action
* `debugMiddleware` a useful debug middleware

## installation

`mnpm install redux-toolkit`

## Usage

`import { createAction, createReducer, debugMiddleware } from 'redux-toolkit'`

### createReducer

避免使用switch碰到的问题：

* 不用担心各个`case`下的变量冲突问题
* 可以解构`action` 和 `state`
* 使用箭头函数
* 当swtich case 过多时，object 的速度会比 switch 更快
* 不再会被 `break` 和 `default` 恶心

下面是一个简单的reducer例子

```
import { ADD_TODO, DELETE_TODO, EDIT_TODO, COMPLETE_TODO, COMPLETE_ALL, CLEAR_COMPLETED } from '../constants/ActionTypes';

const initialState = [{
  text: 'Use Redux',
  completed: false,
  id: 0
}];

export default createReducer({
  [ADD_TODO]: (state, { text }) => [{
    id: state.reduce((maxId, todo) => Math.max(todo.id, maxId), -1) + 1,
    completed: false,
    text
  }, ...state],

  [DELETE_TODO]: (state, { id }) => state.filter(todo =>
    todo.id !== action.id
  ),

  [EDIT_TODO]: (state, { id, text }) => state.map(todo =>
    todo.id === id ?
      Object.assign({}, todo, { text }) :
      todo
  ),

  [COMPLETE_ALL]: state => {
    const areAllMarked = state.every(todo => todo.completed);
    return state.map(todo => Object.assign({}, todo, {
      completed: !areAllMarked
    }));
  },

  [CLEAR_COMPLETED]: state => state.filter(todo => todo.completed === false)
}, initialState)
```

### createAction

提供更简单的方法去创建actionCreator。下面是通过actionCreator和普通方法进行对比。

**创建没有payload的action**

```
createAction('showAll');

function() {
  return {
    type: 'showAll'
  }
}
```

**只有一个携带值**

当只有一个需要传递给`reducer`的值时，接受一个key。

```
createAction('add', 'value');

function(value) {
  return {
    type: 'add',
    payload: {
      value: value
    }
  };
}
```

**传递多个值**

接受一个keys数组，会将参数按顺序放置在`action`的`payload`属性中。

```
createAction('add', ['num1', 'num2']);

function (num1, num2) {
  return {
    type: 'add',
    payload: {
      num1: num1,
      num2: num2  
    }
  };
}
```

**根据函数创建action**

接受一个将参数处理为`payload`的函数

```
createAction('add', (num1, num2) => {
  number1: num1,
  number2: num2,
  other: num1 * num2
})

function (num1, num2) {
  var getAction = (num1, num2) => {
    number1: num1,
    number2: num2,
    other: num1 * num2
  };
  return {
    type: 'add',
    payload: getAction(num1, num2)
  };
}
```

## debugMiddleware

提供一个debug的middleware

### features

* if dispatched action don't match [FSA](https://github.com/acdlite/flux-standard-action) rules, will throw Error
* print the info of actions
* print the old state after action dispatched
