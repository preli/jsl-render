import { IJSLComponent, IJSLVNode } from "./interfaces";

export function h(componentOrTag: string | IJSLComponent, attr, ...children) {
    if ((componentOrTag as any).render != null) {
        return componentOrTag;
    }
    const result: IJSLVNode = {
        tag: componentOrTag as string,
        attr
    };

    if (children.length > 0) {
        if (children.length === 1 && typeof children[0] === "string") {
            result.content = children[0];
        } else {
            result.children = [];
            for (const child of children) {
                if (Array.isArray(child)) {
                    child.map((c) => result.children.push(c));
                } else if (child != null && child.tag === undefined && child.render === undefined) {
                    // TODO: this is not what React does -> needs to change in future version
                    result.children.push({tag: "span", content: child.toString()});
                } else {
                    result.children.push(child);
                }
            }
        }
    }
    return result;
}

export let React = {
    createElement: h
};

(window as any).React = React;
