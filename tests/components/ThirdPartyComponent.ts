import { IJSLComponent, IJSLVNode } from "../../src/interfaces";

export class ThirdPartyComponent implements IJSLComponent {

    private counter = 0;

    public constructor() {
    }

    public setCounter(c: number) {
        this.counter = c;
    }

    public onCreate() {
        document.body.classList.add("thirdPartyComp");
    }

    public onRemove() {
        document.body.classList.remove("thirdPartyComp");
        document.body.classList.remove("thirdPartyUpdate");
    }

    public onUpdate() {
        document.body.classList.add("thirdPartyUpdate");
    }

    public render(): IJSLVNode {
        return {tag: "div", content: "Third party " + this.counter};
    }

}
