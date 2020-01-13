import { getRenderer, compareResult, clear } from "./test";
import { TextComponent } from "./components/TextComponent";
import { CountCreateComponent } from "./components/CountCreateComponent";

// run test 1

// tests rendering of a single VNode and that children should have presedence over content
function test01() {
    const node = { tag: "div", contet: "Hello world", children: [{ tag: "span", content: "Heho" }] };
    const render = getRenderer();
    render.render(node);
    compareResult("01", "test01");
}

clear();
test01();

// tests rendering of a single Component
function test02() {
    const comp = new TextComponent("Hello World 02");
    const render = getRenderer();
    render.render(comp);
    compareResult("02", "test02");
}

clear();
test02();

// tests basic reordering
function test03() {
    const comps = [
        new CountCreateComponent("ONE"),
        new CountCreateComponent("TWO"),
        new CountCreateComponent("THREE"),
        new CountCreateComponent("FOUR")
    ];
    const node = {tag: "div", children: comps};
    const render = getRenderer();
    render.render(node);
    comps.reverse();
    render.render();
    render.render();
    compareResult("03", "test03");
}

clear();
test03();

// tests reordering with more elements than previously rendered
function test04() {
    const comps = [
        new CountCreateComponent("ONE"),
        // new CountCreateComponent("TWO"),
        // new CountCreateComponent("THREE"),
        new CountCreateComponent("FOUR")
    ];
    const node = {tag: "div", children: comps};
    const render = getRenderer();
    render.render(node);
    comps.splice(1, 0, new CountCreateComponent("TWO"), new CountCreateComponent("THREE"));

    render.render();
    render.render();
    compareResult("04", "test04");
}

clear();
test04();

// tests reordering with less elements than previously rendered
function test05() {
    const comps = [
        new CountCreateComponent("ONE"),
        new CountCreateComponent("TWO"),
        new CountCreateComponent("THREE"),
        new CountCreateComponent("FOUR")
    ];
    const node = {tag: "div", children: comps};
    const render = getRenderer();
    render.render(node);
    comps.splice(1, 2);

    render.render();
    render.render();
    compareResult("05", "test05");
}

clear();
test05();
