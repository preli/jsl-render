import { JSLRender } from "../src/render";

export let settings = {
    MainDiv: "main"
};

export function compareResult(test: string, id: string) {
    const should = document.getElementById(id).innerHTML;
    const real = document.getElementById(settings.MainDiv).innerHTML;
    debugger;
    if (real === should) {
        console.info("Test " + test + " was successful");
    } else {
        console.error("Test " + test + " failed");
        console.warn("Should: " + should);
        console.warn("Was: " + real);
    }
}

export function getRenderer() {
    return new JSLRender(document.getElementById(settings.MainDiv));
}
