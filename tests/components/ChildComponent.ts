import { IJSLComponent, IJSLVNode } from "../../src/interfaces";


export class ChildComponent implements IJSLComponent {

    public constructor(private children: Array<IJSLVNode | IJSLComponent>) {
    }

    public setChildren(children: Array<IJSLVNode | IJSLComponent>) {
        this.children = children;
    }

    public render(): IJSLVNode {
        return {tag: "div", children: this.children};
    }

}
