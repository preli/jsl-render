import { getRenderer, compareResult } from "./test";

// run test 1

function test01() {

    const node = {tag: "div", contet: "Hello world", children: [{tag: "span", content: "Heho"}]};
    const render = getRenderer();
    render.render(node);
    compareResult("01", "test01");
}

test01();
