import { JSLRender } from "../src/render";

export let settings = {
    MainDiv: "main"
};

export function compareResult(test: string, id: string) {
    const should = document.getElementById(id).innerHTML;
    const real = document.getElementById(settings.MainDiv).innerHTML;
    if (real === should) {
        console.info("Test " + test + " was successful");
    } else {
        console.error("Test " + test + " failed");
        console.warn("Should: " + should);
        console.warn("Was:    " + real);
    }
}

export function getRenderer() {
    return new JSLRender(document.getElementById(settings.MainDiv), true);
}

export function clear() {
    document.getElementById(settings.MainDiv).innerHTML = "";
}

export function assert(expression: boolean, text: string): boolean {
    if (expression) {
        return true;
    }
    console.error("Assert error: " + text);
    return false;
}
