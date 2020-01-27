import { IJSLComponent, IJSLVNode } from "../../src/interfaces";

export class ImmutableComponent implements IJSLComponent {

    private isCreated = false;

    public render(): IJSLVNode {
        return {
            tag: "div",
            attr: { style: "position:relative;width:100%;height:25rem;max-width:55rem;margin:0 auto;" },
            content: "Hello World"
        };
    }

    public onUpdate() {
        console.log("update");
        throw new Error("No update should be called");
    }

    public onCreate(node: IJSLVNode) {
        node.dom.innerHTML = "";
        if (this.isCreated) {
            console.log("create");
            throw new Error("No create should be called");
        }
        this.isCreated = true;
    }

}
