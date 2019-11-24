import { JSLRender } from "./render";

export interface IJSLVNode {
    tag: string;
    content?: string;
    children?: Array<IJSLVNode | IJSLComponent>;
    attr?: {};
    raw?: boolean;
    dom?: HTMLElement;
}


export interface IJSLComponent {

    render: () => IJSLVNode;

    hasChanged?: () => boolean;

    /*
     * Executed after a change/update to the virtual dom is detected and the dom
     * was updated
     */
    onUpdate?: (vnode: IJSLVNode) => void;

    /*
     * Executed after the dom is created
     */
    onCreate?: (vnode: IJSLVNode) => void;

    /*
     * Executed before the dom is removed
     */
    onRemove?: (vnode: IJSLVNode) => void;

    /*
     * Executed before the virtual dom for the component is created
     * Basically like onCreate but runs before any render calls or actual dom manipulation
     */
    onInit?: (renderer: JSLRender) => void;
}
