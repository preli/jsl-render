import { IJSLComponent, IJSLVNode } from "../../src/interfaces";

export class ThirdPartyComponent implements IJSLComponent {

    private counter = 0;

    public setCounter(c: number) {
        this.counter = c;
    }

    public onCreate() {
        if (!document.body.classList.contains("thirdPartyInit")) {
            throw new Error("problem with onInit");
        }
        document.body.classList.add("thirdPartyComp");
    }

    public onInit() {
        document.body.classList.add("thirdPartyInit");
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
