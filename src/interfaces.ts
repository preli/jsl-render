import { JSLRender } from "./render";

export interface IJSLAnimation {
    attr: string;
    from: any;
    to: any;
    duration?: number;
    delay?: number;
    easing?: "linear" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad" | "easeInCubic" | "easeOutCubic" | "easeInOutCubic" | "easeInQuart" | "easeOutQuart" | "easeInOutQuart" | "easeInQuint" | "easeOutQuint" | "easeInOutQuint" | "easeInSine" | "easeOutSine" | "easeInOutSine" | "easeInExpo" | "easeOutExpo" | "easeInOutExpo" | "easeInCirc" | "easeOutCirc" | "easeInOutCirc" | "easeInElastic" | "easeOutElastic" | "easeInOutElastic" | /* "easeInBack" | "easeOutBack" | "easeInOutBack" | */ "easeInBounce" | "easeOutBounce" | "easeInOutBounce";
    // TODO: more
}

export interface IJSLVNode {
    tag: string;
    content?: string;
    children?: Array<IJSLVNode | IJSLComponent>;
    attr?: any;
    raw?: boolean;
    dom?: HTMLElement;
    animation?: IJSLAnimation | IJSLAnimation[];
}

export interface IJSLComponent {

    render: () => IJSLVNode;

    isEqual?: (comp: IJSLComponent) => boolean;

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
