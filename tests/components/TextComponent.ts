import { IJSLComponent, IJSLVNode } from "../../src/interfaces";


export class TextComponent implements IJSLComponent {

    public constructor(private text: string) {
    }

    public render(): IJSLVNode {
        return {tag: "div", content: this.text};
    }

}
