import { IJSLComponent, IJSLVNode } from "../../src/interfaces";



export class TableComponent implements IJSLComponent {

    private loaded: boolean;

    public render(): IJSLVNode {
        return {
            tag: "table", children: [{tag: "tbody", children: [{
                tag: "tr", children: [
                    { tag: "th", content: "A" }, { tag: "th", content: "B" }
                ]
            }, {
                tag: "tr", children: [
                    {
                        tag: "td", children: [{ tag: "span", attr: { style: "font-weight:bold;" }, content: "Content" },
                        { tag: "span", attr: { class: "nr" }, content: "A" }]
                    },
                    {
                        tag: "td", children: [{ tag: "span", attr: { style: "font-weight:bold;" }, content: "Content" },
                        { tag: "span", attr: { class: "nr" }, content: "B" }]
                    }
                ]
            }
            ]
        }]};
    }

}
