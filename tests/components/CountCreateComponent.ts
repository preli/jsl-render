import { IJSLComponent, IJSLVNode } from "../../src/interfaces";
import { refresh } from "../../src/render";

export class CountCreateComponent implements IJSLComponent {

    protected counter = 0;

    public constructor(private id: string) {
    }

    public onCreate() {
        this.counter++;
    }

    public getCounter() {
        return this.counter;
    }

    public render(): IJSLVNode {
        return {tag: "div", content: this.id + " " + this.counter};
    }

}
