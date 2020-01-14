import { IJSLComponent, IJSLVNode } from "../../src/interfaces";
import { TableComponent } from "./TableComponent";

export class OverviewComponent implements IJSLComponent {

    private loaded: boolean;

    public render(): IJSLVNode {
        return {
            tag: "div", children: [ {tag: "h1", content: "Test Overview<span>" + (this.loaded ? "2" : "1") + "</span>", raw: true, attr: {
                class: !this.loaded ? "still-loading" : undefined}},
                !this.loaded ?
                {
                    tag: "button",
                    attr: {
                        click: !this.loaded ? () => {
                            this.loaded = true;
                        } : null
                    }
                } : new TableComponent()]
        };
    }

}
