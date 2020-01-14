import { getRenderer, compareResult, clear, assert } from "./test";
import { TextComponent } from "./components/TextComponent";
import { CountCreateComponent } from "./components/CountCreateComponent";
import { ThirdPartyComponent } from "./components/ThirdPartyComponent";
import { IJSLComponent, IJSLVNode } from "../src/interfaces";
import { ChildComponent } from "./components/ChildComponent";


// tests rendering of a single VNode and that children should have presedence over content
function test01() {
    const node = { tag: "div", contet: "Hello world", children: [{ tag: "span", content: "Heho" }] };
    const render = getRenderer();
    render.render(node);
    compareResult("01", "test01");
}

clear();
console.time("test01");
test01();
console.timeEnd("test01");

// tests rendering of a single Component
function test02() {
    const comp = new TextComponent("Hello World 02");
    const render = getRenderer();
    render.render(comp);
    compareResult("02", "test02");
}

clear();
console.time("test02");
test02();
console.timeEnd("test02");

// tests basic reordering
function test03() {
    const comps = [
        new CountCreateComponent("ONE"),
        new CountCreateComponent("TWO"),
        new CountCreateComponent("THREE"),
        new CountCreateComponent("FOUR")
    ];
    const node = { tag: "div", children: comps };
    const render = getRenderer();
    render.render(node);
    comps.reverse();
    render.render();
    render.render();
    compareResult("03", "test03");
}

clear();
console.time("test03");
test03();
console.timeEnd("test03");

// tests reordering with more elements than previously rendered
function test04() {
    const comps = [
        new CountCreateComponent("ONE"),
        // new CountCreateComponent("TWO"),
        // new CountCreateComponent("THREE"),
        new CountCreateComponent("FOUR")
    ];
    const node = { tag: "div", children: comps };
    const render = getRenderer();
    render.render(node);
    comps.splice(1, 0, new CountCreateComponent("TWO"), new CountCreateComponent("THREE"));

    render.render();
    render.render();
    compareResult("04", "test04");

    comps.push(new CountCreateComponent("FIFE"));
    render.render();
    render.render();
    compareResult("04-2", "test04-2");
}

clear();
console.time("test04");
test04();
console.timeEnd("test04");

// tests reordering with less elements than previously rendered
function test05() {
    const comps = [
        new CountCreateComponent("ONE"),
        new CountCreateComponent("TWO"),
        new CountCreateComponent("THREE"),
        new CountCreateComponent("FOUR")
    ];
    const node = { tag: "div", children: comps };
    const render = getRenderer();
    render.render(node);
    comps.splice(1, 2);

    render.render();
    render.render();
    compareResult("05", "test05");
}

clear();
console.time("test05");
test05();
console.timeEnd("test05");

// go from 4 to no children and back to 4
function test06() {
    const comps = [
        new CountCreateComponent("ONE"),
        new CountCreateComponent("TWO"),
        new CountCreateComponent("THREE"),
        new CountCreateComponent("FOUR")
    ];
    const node = { tag: "div", children: comps };
    const render = getRenderer();
    render.render(node);
    node.children = [];
    render.render();
    compareResult("06", "test06");

    node.children = comps;
    render.render();
    render.render();
    compareResult("06", "test06-2");
}

clear();
console.time("test06");
test06();
console.timeEnd("test06");


// test with 1000 components
function test07() {

    const dom = document.getElementById("test07");

    const comps = [];
    let str = "<div>";
    for (let i = 0; i < 10000; i++) {
        comps.push(new TextComponent("hello " + i));
        str += "<div>hello " + i + "</div>";
    }
    str += "</div>";
    dom.innerHTML = str;

    const node = { tag: "div", children: comps };
    const render = getRenderer();
    render.render(node);

    compareResult("07", "test07");
    document.getElementById("test07").innerHTML = "";
}

clear();
console.time("test07");
test07();
console.timeEnd("test07");


// test life cycle events
function test08() {

    const comps: IJSLComponent[] = [new ThirdPartyComponent()];

    const node = new ChildComponent(comps);
    const render = getRenderer();
    render.render(node);

    let result = true;

    result = result && assert(document.body.classList.contains("thirdPartyComp"), "test08 - 01");

    comps[0] = new ThirdPartyComponent();
    render.render();
    result = result && assert(document.body.classList.contains("thirdPartyComp"), "test08 - 02");
    result = result && assert(!document.body.classList.contains("thirdPartyUpdate"), "test08 - 03");

    (comps[0] as ThirdPartyComponent).setCounter(100);
    render.render(node);
    result = result && assert(document.body.classList.contains("thirdPartyUpdate"), "test08 - 04");

    comps[0] = new TextComponent("test");
    render.render();
    result = result && assert(!document.body.classList.contains("thirdPartyComp"), "test08 - 05");

    if (result) {
        console.info("Test 08 was successful");
    }
}

clear();
console.time("test08");
test08();
console.timeEnd("test08");



// tests attributes and event handlers
function test09() {

    let clickCounter = 0;

    function clickme() {
        clickCounter++;
    }

    const node: IJSLVNode = { tag: "div", children: [{ tag: "span", content: "Heho", attr: { id: "span09", style: "background:red;", click: clickme } }] };
    const render = getRenderer();
    render.render(node);
    compareResult("09", "test09");

    let result = true;
    document.getElementById("span09").click();
    result = result && assert(clickCounter === 1, "test09 - 01");

    delete (node.children[0] as IJSLVNode).attr.click;
    render.render();
    document.getElementById("span09").click();

    result = result && assert(clickCounter === 1, "test09 - 01");
    if (result) {
        console.info("Test 09-2 was successful");
    }
}

clear();
test09();


// TODO: #) test mit tief verschachtelten Componenten / Nodes
//       #) test mit Componenten und VNodes gemischt (auch reorder test mit gemischten Children)
//       #) test with real world render example / data ?
//       #) isEquals test
//       #) event handler testen und ob refresh danach aufgerufen wird
//       +) Test refresh
//       +) Test onInit
//       +) Test attributes
//       +) Test raw vs escaped
//       +) Test were children of a component are "manually" removed
//       +) Test tag change

