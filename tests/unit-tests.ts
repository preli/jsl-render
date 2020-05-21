import { getRenderer, compareResult, clear, assert } from "./test";
import { TextComponent } from "./components/TextComponent";
import { CountCreateComponent } from "./components/CountCreateComponent";
import { ThirdPartyComponent } from "./components/ThirdPartyComponent";
import { IJSLComponent, IJSLVNode } from "../src/interfaces";
import { ChildComponent } from "./components/ChildComponent";
import { OverviewComponent } from "./components/OverviewComponent";
import { refresh } from "../src/render";
import { ImmutableComponent } from "./components/ImmutableComponent";


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

    const node: IJSLVNode = { tag: "div", children: [{ tag: "span", content: "Heho", attr: { class: "span09", style: "background:red;", click: clickme } }] };
    const render = getRenderer();
    render.render(node);
    compareResult("09", "test09");

    let result = true;
    (document.querySelector("#main .span09") as HTMLSpanElement).click();
    result = result && assert(clickCounter === 1, "test09 - 01");

    delete (node.children[0] as IJSLVNode).attr.click;
    (document.querySelector("#main .span09") as HTMLSpanElement).click();
    result = result && assert(clickCounter === 2, "test09 - 02");

    (node.children[0] as IJSLVNode).attr.id = "yoyoyo";
    delete (node.children[0] as IJSLVNode).attr.class;
    render.render();
    (document.querySelector("#main #yoyoyo") as HTMLSpanElement).click();
    result = result && assert(clickCounter === 2, "test09 - 03");

    (node.children[0] as IJSLVNode).attr.style = "background:green;";
    render.render();
    compareResult("09-2", "test09-2");

    if (result) {
        console.info("Test 09-3 was successful");
    }

}

clear();
test09();


// tests raw vs escaped
function test10() {
    let node: IJSLVNode = { tag: "div", content: "Hello world<span>he</span>" };
    const render = getRenderer();
    render.render(node);
    compareResult("10", "test10");
    node = { tag: "div", content: "Hello world<span>he</span>", raw: true };
    render.render(node);
    compareResult("10-2", "test10-2");
}

clear();
test10();


// isEqual test
function test12() {
    const comps = [
        new CountCreateComponent("ONE")
    ];
    (comps[0] as any).isEqual = () => {
        return false;
    };
    const node = { tag: "div", children: comps };
    const render = getRenderer();
    render.render(node);
    render.render();
    render.render();
    if (assert(comps[0].getCounter() === 3, "test12-1")) {
        console.info("test 12 was successful");
    }
}

clear();
console.time("test12");
test12();
console.timeEnd("test12");


// table example
function test13() {
    const render = getRenderer();
    render.render(new OverviewComponent());
    render.render();
    (document.querySelector("#main button") as HTMLButtonElement).click();
    render.render();
    compareResult("13", "test13");
}

clear();
console.time("test13");
test13();
console.timeEnd("test13");


// table example
function test14() {
    const render = getRenderer();
    const children = [{ tag: "div", content: "Hello" }, new ChildComponent([{
        tag: "div", children: [
            new ThirdPartyComponent()
        ]
    }])];
    const c = new ChildComponent(children);
    render.render(c);
    let result = assert(document.body.classList.contains("thirdPartyComp"), "test14-1");
    c.setChildren([]);
    render.render();
    result = result && assert(!document.body.classList.contains("thirdPartyComp"), "test14-2");
    c.setChildren(children);
    render.render();
    result = assert(document.body.classList.contains("thirdPartyComp"), "test14-3");
    if (result) {
        console.info("test 14 was successful");
    }
}

clear();
console.time("test14");
test14();
console.timeEnd("test14");



// test life cycle events
function test15() {

    const comps: Array<IJSLVNode |IJSLComponent> = [{tag: "div", content: "yo"}, new ImmutableComponent(), {tag: "div", content: "yo"}];

    const node = new ChildComponent(comps);
    const render = getRenderer();
    render.render(node);
    comps.splice(0, 1);
    render.render(node);

    console.info("Test 15 was successful - if no errors appeard");

}

clear();
console.time("test15");
test15();
console.timeEnd("test15");


// tests refresh vs render
function testLast() {
    const c = new CountCreateComponent("A");
    const node: IJSLVNode = { tag: "div", children: [c] };
    const render = getRenderer();
    render.render(node);
    assert(c.getCounter() === 1, "11-1");
    render.refresh();
    node.children.length = 0;
    render.refresh();
    node.children.push(c);
    render.refresh();
    assert(c.getCounter() === 1, "11-2");
    node.children.length = 0;
    render.render();
    node.children.push(c);
    render.render();
    assert(c.getCounter() === 2, "11-3");
    setTimeout(() => {
        assert(c.getCounter() === 2, "11-4");
        node.children.length = 0;
        render.render();
        node.children.push(c);
        refresh();
        assert(c.getCounter() === 2, "11-5");
        setTimeout(() => {
            assert(c.getCounter() === 3, "11-6 ... make sure the browser window is visible for the last unit test");
            console.info("ALL TEST COMPLETED - check console errors to see if all passed");
        }, 500);
    }, 1000);
}

clear();
testLast();

// TODO: #) test mit tief verschachtelten Componenten / Nodes
//       #) test mit Componenten und VNodes gemischt (auch reorder test mit gemischten Children)
//       #) test with real world render example / data ?
//       #) event handler testen und ob refresh danach aufgerufen wird
//       +) Test onInit
//       +) Test were children of a component are "manually" removed
