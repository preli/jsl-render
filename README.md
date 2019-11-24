# JSL-Render
JSL-Render is a lightweight and fast virtual dom render engine für building modern HTML5 applications.

Size: < 3kb minified and gzipped

Browser Support: Chrome, Firefox, Edge, Internet Explorer 10+

## Hello World example

```typescript
import { JSLRender } from "jsl-render";

// create a JSLRender instance and bind it to the body tag of the page
const view = new JSLRender(document.body);

// render a h1-tag with "hello world"
view.render({
    tag: "h1",
    content: "hello world"
});
```

### JSL-Render also support JSX / TSX Syntax


```typescript
const view = new JSLRender(document.body);

view.render(<h1>hello world</h1>);
```

## Getting Started

### Install

```
npm install jsl-render
```

### Create a component

In order to create larger applications create "components". A component is any object with a render function that returns a virtual node (ISJLVNode).

```typescript
import { JSLRender, IJSLComponent } from "jsl-render";

class HelloWorldComponent implements IJSLComponent {

    private counter = 0;

    public render() {
        return {
            tag: "div",
            children: [
                {tag: "button", content: "click", attr: {click: this.increment}},
                {tag: "span", content: "Button was clicked (" + this.counter + ") times"},
            ]
        };
    }

    private increment() {
        this.counter++;
    }

}

const view = new JSLRender(document.body);
view.render(new HelloWorldComponent());
```

When the button is clicked JSL-Render will automatically refresh the content to display the number of times the button was clicked. The refresh happens because the click handler that updates the counter is bound through the JSL-Render engine.

in case the counter is updated outside of the JSL-Render scope (for example a setTimeout function) refresh has to be executed manually.

```typescript
import { refresh } from "jsl-render";
refresh();
```
