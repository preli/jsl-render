import { IJSLComponent, IJSLVNode, IJSLAnimation } from "./interfaces";



export function refresh() {
    if (JSLRender.lastCreatedRenderer != null) {
        JSLRender.lastCreatedRenderer.refresh();
    }
}

function isFnc(f: any): boolean {
    return typeof f === "function";
}

function isComponent(node: IJSLVNode | IJSLComponent): boolean {
    return node != null && isFnc((node as any).render);
}

function areEqual(a: IJSLComponent, b: IJSLComponent): boolean {
    if (b.isEqual != null) {
        return b.isEqual(a);
    }
    return a === b;
    // return (a as any).__proto__ !== (b as any).__proto__;
}

function swapDomElements(obj1: Element, obj2: Element) {
    // save the location of obj2
    const parent2 = obj2.parentElement;
    const next2 = obj2.nextElementSibling;
    // special case for obj1 is the next sibling of obj2
    if (next2 === obj1) {
        // just put obj1 before obj2
        parent2.insertBefore(obj1, obj2);
    } else {
        // insert obj2 right before obj1
        obj1.parentNode.insertBefore(obj2, obj1);

        // now insert obj1 where obj2 was
        if (next2) {
            // if there was an element after obj2, then insert obj1 right before that
            parent2.insertBefore(obj1, next2);
        } else {
            // otherwise, just append as last child
            parent2.appendChild(obj1);
        }
    }
}

function findComponentIdx(children: IJSLVNode[], component: IJSLComponent): number {
    for (let i = 0; i < children.length; i++) {
        if ((children[i].dom as any)._component === component) {
            return i;
        }
    }
    return -1;
}

function findNodeIdx(children: IJSLVNode[], node: IJSLVNode): number {
    for (let i = 0; i < children.length; i++) {
        if ((children[i].dom as any)._component == null) {
            if (node.attr != null && children[i].dom.id === node.attr.id) {
                return i;
            }
        }
    }
    return -1;
}

function switchChildren(newIdx, oldIdx, node: IJSLVNode): void {
    while (node.children.length <= newIdx) {
        // newIdx is outside of bounds of node.children
        const dummyDom = document.createElement("span");
        node.dom.appendChild(dummyDom);
        node.dom.insertBefore(dummyDom, node.dom.children[oldIdx]);
        node.children.splice(oldIdx, 0, { tag: "span", dom: dummyDom, children: [] });
        oldIdx++;
    }
    if (oldIdx === newIdx) {
        return;
    }

    swapDomElements(node.dom.children[newIdx], node.dom.children[oldIdx]);

    // switch in node.children as well (not just in DOM)
    const tmp = node.children[oldIdx];
    node.children[oldIdx] = node.children[newIdx];
    node.children[newIdx] = tmp;
}

function areAttributesEqual(attr, v, a): boolean {
    if (a === v) {
        return true;
    }
    if (attr === "style" && typeof v === "object" && typeof a === "string") {
        let s = "";
        for (const style in v) {
            if (v.hasOwnProperty(style) && v[style] != null) {
                s += v[s] + ";";
            }
        }
        return s === a;
    }
    return false;
}

export class JSLRender {

    public static MaxReorderChildren = 1000;

    public static DefaultAnimationDuration = 500;

    public static lastCreatedRenderer: JSLRender = null;

    public static PrintRenderTime = true;

    public static animate(vnode: IJSLVNode, animation: IJSLAnimation | IJSLAnimation[]): void {
        if (Array.isArray(animation)) {
            for (let i = 0; i < animation.length; i++) {
                JSLRender.animateSingle(vnode, animation[i]);
            }
        } else {
            JSLRender.animateSingle(vnode, animation);
        }
    }

    private renderedVNode: IJSLVNode;

    private rootNode: IJSLVNode | IJSLComponent;

    private repaintScheduled = false;

    constructor(private container: HTMLElement, globalRefresh?: boolean) {
        if (globalRefresh) {
            JSLRender.lastCreatedRenderer = this;
        }
    }

    public render(node?: IJSLVNode | IJSLComponent): void {
        if (JSLRender.PrintRenderTime) {
            // tslint:disable-next-line: no-console
            console.time("JSL render");
        }
        this.rootNode = node || this.rootNode;
        this.renderVNode(this.container, this.rootNode);
        if (JSLRender.PrintRenderTime) {
            // tslint:disable-next-line: no-console
            console.timeEnd("JSL render");
        }
    }

    public refresh(): void {
        if (this.repaintScheduled) {
            return;
        }
        this.repaintScheduled = true;
        window.requestAnimationFrame(() => {
            if (!this.repaintScheduled) {
                return;
            }
            this.repaintScheduled = false;
            this.render();
        });
    }

    private renderVNode(container: HTMLElement, node: IJSLVNode | IJSLComponent): void {
        if (this.renderedVNode == null) {
            this.renderedVNode = this.createNode(container, node);
        } else {
            this.renderedVNode = this.updateNode(this.renderedVNode, node);
        }
    }

    private createNode(container: HTMLElement, node: IJSLVNode | IJSLComponent, replaceWith?: HTMLElement): IJSLVNode {
        // console.log("createNode");
        let vnode: IJSLVNode;
        const isComp = isComponent(node);
        if (isComp) {
            // we have a component
            if ((node as IJSLComponent).onInit) { // if (replaceWith == null && (node as IJSLComponent).onInit) {
                (node as IJSLComponent).onInit.call(node, this);
            }
            vnode = (node as IJSLComponent).render();
        } else {
            // we have a vNode
            vnode = this.cloneVNode(node as IJSLVNode);
        }
        this.sanitize(vnode);
        const dom = vnode.dom = document.createElement(vnode.tag);
        for (const attr in vnode.attr) {
            if (vnode.attr.hasOwnProperty(attr)) {
                this.setAttribute(vnode, node, attr);
            }
        }
        if (vnode.children.length > 0) {
            for (let idx = 0; idx < vnode.children.length; idx++) {
                if (vnode.children[idx] != null) {
                    vnode.children[idx] = this.createNode(dom, vnode.children[idx]);
                }
            }
        } else {
            if (vnode.raw) {
                dom.innerHTML = vnode.content || "";
            } else {
                dom.textContent = vnode.content || "";
            }
        }
        if (isComp) {
            (dom as any)._component = node;
        }
        if (replaceWith != null) {
            container.insertBefore(dom, replaceWith.nextSibling);
            container.removeChild(replaceWith);
        } else {
            container.appendChild(dom);
        }
        if (isComp && (node as IJSLComponent).onCreate) {
            (node as IJSLComponent).onCreate.call(node, vnode);
        }
        if (vnode.animation != null) {
            JSLRender.animate(vnode, vnode.animation);
        }
        return vnode;
    }

    private cloneVNode(vnode: IJSLVNode): IJSLVNode {
        return {
            tag: vnode.tag,
            attr: { ...vnode.attr },
            children: (vnode.children || []).slice(),
            dom: vnode.dom,
            raw: vnode.raw,
            content: vnode.content,
            animation: vnode.animation
        };
    }

    private sanitize(vnode: IJSLVNode) {
        if (!isComponent(vnode)) {
            vnode.children = (vnode.children || []).filter((c) => c != null);
            vnode.attr = vnode.attr || [];
        }
    }

    private updateNode(renderedNode: IJSLVNode, node: IJSLVNode | IJSLComponent): IJSLVNode {
        if (renderedNode.dom.parentElement == null) {
            // does not exist anymore
            // -> was probably modified outside of jsl-render code
            // -> needs to be removed now, so return undefined
            return;
        }

        let vnode: IJSLVNode;
        const isComp = isComponent(node);
        {
            const oldComponent = (renderedNode.dom as any)._component;
            const isOldNodeAComponent = oldComponent != null;
            if (isOldNodeAComponent || isComp) {
                let recreateNode = false;
                if (!isComp || !isOldNodeAComponent) {
                    recreateNode = true;
                } else {
                    // we had a component in last render cycle and we still have a component
                    // ... but is it the same component or do we need to recreate it
                    if (!areEqual(node as IJSLComponent, oldComponent)) {
                        recreateNode = true;
                    }
                }
                if (recreateNode) {
                    this.callRemoveEvents(renderedNode, true);
                    const parent = renderedNode.dom.parentElement;
                    return this.createNode(parent, node, renderedNode.dom);
                }
            }
        }

        if (isComp) {
            vnode = (node as IJSLComponent).render();
        } else {
            // we have a vNode
            vnode = this.cloneVNode(node as IJSLVNode);
        }
        this.sanitize(vnode);
        vnode.dom = renderedNode.dom;
        // if (isComp) {
        (vnode.dom as any)._component = isComp ? node : undefined;
        // }

        if (renderedNode.tag !== vnode.tag || renderedNode.raw !== vnode.raw) {
            // tag changed -> delete and recreate
            this.callRemoveEvents(renderedNode, true);
            const parent = renderedNode.dom.parentElement;
            return this.createNode(parent, node, renderedNode.dom);
        }

        const attributesChanged = this.updateAttributes(renderedNode, vnode, node);
        const contentChanged = this.updateContent(renderedNode, vnode);
        if ((contentChanged || attributesChanged) && isComp && (node as IJSLComponent).onUpdate) {
            (node as IJSLComponent).onUpdate.call(node, vnode);
        }
        return vnode;
    }


    // private refreshHandlers(renderedNode: IJSLVNode, vnode: IJSLVNode, node: IJSLVNode | IJSLComponent) {
    //     for (const attr in vnode.attr) {
    //         if (isFnc(vnode.attr[attr]) &&
    //             renderedNode.attr[attr] !== vnode.attr[attr]) {
    //             if (renderedNode.dom["_" + attr + "_"] != null) {
    //                 renderedNode.dom.removeEventListener(attr, renderedNode.dom["_" + attr + "_"]);
    //             }
    //             this.setAttribute(vnode, node, attr);
    //         }
    //     }
    // }

    private updateContent(renderedNode: IJSLVNode, vnode: IJSLVNode): boolean {
        this.tryToReorderChildren(renderedNode, vnode);
        if (renderedNode.children.length !== vnode.children.length ||
            renderedNode.content !== vnode.content) {
            if (renderedNode.children.length > 0) {
                this.callRemoveEvents(renderedNode);
            }
            if (vnode.children.length > 0) {
                vnode.dom.innerHTML = "";
                for (let idx = 0; idx < vnode.children.length; idx++) {
                    vnode.children[idx] = this.createNode(vnode.dom, vnode.children[idx]);
                }
            } else {
                if (vnode.raw) {
                    vnode.dom.innerHTML = vnode.content || "";
                } else {
                    vnode.dom.textContent = vnode.content || "";
                }
            }
            return true;
        } else {
            const newChildren = [];
            for (let idx = 0; idx < renderedNode.children.length; idx++) {
                const tmp = this.updateNode(renderedNode.children[idx] as IJSLVNode, vnode.children[idx]);
                if (tmp != null) {
                    newChildren.push(tmp);
                }
            }
            vnode.children = newChildren;
            return false;
        }
    }

    private tryToReorderChildren(renderedNode: IJSLVNode, vnode: IJSLVNode): void {
        if (renderedNode.children.length > 0 && vnode.children.length > 0 && vnode.children.length <= JSLRender.MaxReorderChildren) {
            let idx: number;
            let l: number;
            let anyMatchesFound = false;
            for (idx = 0, l = vnode.children.length; idx < l; idx++) {
                const c = vnode.children[idx];
                if (isComponent(c)) {
                    let oldCompIdx = idx;
                    if ((renderedNode.children[oldCompIdx] as any)?.dom?._component !== c) {
                        oldCompIdx = findComponentIdx(renderedNode.children as IJSLVNode[], c as IJSLComponent);
                    }
                    if (oldCompIdx >= 0) { // found
                        if (oldCompIdx !== idx) {
                            switchChildren(idx, oldCompIdx, renderedNode);
                        }
                        anyMatchesFound = true;
                    }
                } else {
                    if (c != null && (c as IJSLVNode).attr != null && (c as IJSLVNode).attr.id != null) {
                        let oldNodeIdx = idx;
                        if (renderedNode.attr != null && renderedNode.attr.id !== (c as IJSLVNode).attr.id) {
                            oldNodeIdx = findNodeIdx(renderedNode.children as IJSLVNode[], c as IJSLVNode);
                        }
                        if (oldNodeIdx >= 0) {
                            if (oldNodeIdx !== idx) {
                                switchChildren(idx, oldNodeIdx, renderedNode);
                            }
                            anyMatchesFound = true;
                        }
                    }
                }
            }
            if (anyMatchesFound) {
                if (l < renderedNode.children.length) {
                    // dispose everything that is "left" and shorten renderedNode.children array to size l
                    for (let i = l; i < renderedNode.children.length; i++) {
                        this.callRemoveEvents(renderedNode.children[i] as IJSLVNode, true);
                        const dom = (renderedNode.children[i] as IJSLVNode).dom;
                        if (dom != null && dom.parentElement != null) {
                            dom.parentElement.removeChild(dom);
                        }
                    }
                    renderedNode.children.length = l;
                } else if (l > renderedNode.children.length) {
                    // add dummy nodes to make renderedNode same size
                    for (let i = renderedNode.children.length; i < l; i++) {
                        const dummyDom = document.createElement("span");
                        renderedNode.children.push({ tag: "span", dom: dummyDom, children: [] });
                        renderedNode.dom.appendChild(dummyDom);
                    }
                }
            }
        }
    }

    private callRemoveEvents(vnode: IJSLVNode, includeOwnTag?: boolean) {
        for (let idx = 0; idx < vnode.children.length; idx++) {
            const cnode: IJSLVNode = vnode.children[idx] as IJSLVNode;
            if (cnode && (cnode as IJSLVNode).dom) {
                execute(cnode);
                this.callRemoveEvents(cnode);
            }
        }

        if (includeOwnTag && (vnode as IJSLVNode).dom) {
            execute(vnode);
        }

        function execute(node: IJSLVNode) {
            const component: IJSLComponent = (node.dom as any)._component;
            if (component && component.onRemove) {
                component.onRemove.call(component, {
                    container: node.dom.parentElement,
                    dom: node.dom,
                    node
                });
            }
        }
    }

    private updateAttributes(rendered: IJSLVNode, vnode: IJSLVNode, node: IJSLVNode | IJSLComponent): boolean {
        let result = false;
        for (const attribute in vnode.attr) {
            if (vnode.attr.hasOwnProperty(attribute) && !areAttributesEqual(attribute, vnode.attr[attribute], rendered.attr[attribute])) {
                if (isFnc(rendered.attr[attribute])) {
                    if (rendered.dom["_" + attribute + "_"] != null) {
                        rendered.dom.removeEventListener(attribute, rendered.dom["_" + attribute + "_"]);
                    }
                } else {
                    result = true;
                }
                this.setAttribute(vnode, node, attribute);
            }
        }
        // check for attributes present in rendered but not in vnode (new node)
        for (const attribute in rendered.attr) {
            if (rendered.attr.hasOwnProperty(attribute) && !vnode.attr.hasOwnProperty(attribute)) {
                if (isFnc(rendered.attr[attribute])) {
                    if (rendered.dom["_" + attribute + "_"] != null) {
                        rendered.dom.removeEventListener(attribute, rendered.dom["_" + attribute + "_"]);
                    }
                } else {
                    rendered.dom.removeAttribute(attribute);
                    result = true;
                }
            }
        }
        return result;
    }

    private setAttribute(vnode: IJSLVNode, node: IJSLComponent | IJSLVNode, attr: string) {
        if (isFnc(vnode.attr[attr])) {
            const eventHandler = (args) => {
                let closestComponent = args.currentTarget;
                let component;
                // tslint:disable-next-line: no-conditional-assignment
                while (!(component = closestComponent._component)) {
                    closestComponent = closestComponent.parentElement;
                    if (closestComponent == null) {
                        break;
                    }
                }
                const fnc = vnode.attr[attr];
                if (fnc != null) {
                    if (fnc.call(component || node, args, vnode) !== false) {
                        this.refresh();
                    }
                } else { // this should probably not happen anyway
                    vnode.dom.removeEventListener(attr, eventHandler);
                }
            };
            vnode.dom.addEventListener(attr, eventHandler);
            vnode.dom["_" + attr + "_"] = eventHandler;
        } else {
            let value = vnode.attr[attr];
            if (attr === "style" && typeof value === "object") {
                let s = "";
                for (const style in value) {
                    if (value.hasOwnProperty(style) && value[style] != null) {
                        s += style + ":" + value[style] + ";";
                    }
                }
                value = s;
            }
            if (value != null) {
                vnode.dom.setAttribute(attr, value);
            } else {
                vnode.dom.removeAttribute(attr);
            }
        }
    }

    private static animateSingle(vnode: IJSLVNode, animation: IJSLAnimation) {

        const status = { current: animation.from, timeout: 20, start: 0, now: 0 };
        if (vnode.attr.style == null) {
            vnode.attr.style = {};
        }
        const fnc = () => {
            status.now = performance.now();
            if (!status.start) {
                status.start = status.now;
            }
            addStep(animation, status);
            const done = status.now - status.start >= (animation.duration ?? JSLRender.DefaultAnimationDuration);
            if (done) {
                status.current = animation.to;
            }
            if (typeof vnode.attr.style === "string") {
                const parts = vnode.attr.style.split(";");
                vnode.attr.style = "";
                let found = false;
                for (let i = 0; i < parts; i++) {
                    const entry = parts[i].split(":");
                    if (entry.length === 2) {
                        const key = entry[0];
                        let value = entry[1];
                        if (key.trim() === animation.attr) {
                            found = true;
                            value = status.current;
                        }
                        vnode.attr.style += key + ":" + value + ";";
                    } else {
                        vnode.attr.style += parts[i] + ";";
                    }
                }
                if (!found) {
                    vnode.attr.style += animation.attr + ":" + status.current;
                }
            } else {
                vnode.attr.style[animation.attr] = status.current;
            }
            vnode.dom.style[animation.attr] = status.current;
            if (!done) {
                requestAnimationFrame(fnc);
            }
        };
        if (animation.delay) {
            setTimeout(fnc, animation.delay);
        } else {
            fnc();
        }
    }
}

function addStep(animation: IJSLAnimation, status: { current: any, start: number, now: number }): void {
    const easingFnc = easingFunctions[animation.easing ?? "linear"];
    if (easingFnc == null) {
        throw new Error("easing function " + animation.easing + " does not exist");
    }
    const duration = animation.duration ?? JSLRender.DefaultAnimationDuration;

    if (typeof status.current === "number") {
        status.current = easingFnc(status.now - status.start, animation.from, animation.to - animation.from, duration);
    }

    let value = parseFloat(status.current);
    if (status.current.toString().indexOf(value.toString()) === 0) {
        value = easingFnc(status.now - status.start, parseFloat(animation.from), parseFloat(animation.to) - parseFloat(animation.from), duration);
        status.current = value + (status.current.toString().replace(/[0-9.-]/g, ""));
    }

    if (status.current && status.current[0] === "#") {
        // color
        const rval = parseInt(animation.from.substr(1, 2), 16);
        const gval = parseInt(animation.from.substr(3, 2), 16);
        const bval = parseInt(animation.from.substr(5, 2), 16);
        const rval2 = parseInt(animation.to.substr(1, 2), 16);
        const gval2 = parseInt(animation.to.substr(3, 2), 16);
        const bval2 = parseInt(animation.to.substr(5, 2), 16);
        const rval3 = easingFnc(status.now - status.start, rval, rval2 - rval, duration);
        const gval3 = easingFnc(status.now - status.start, gval, gval2 - gval, duration);
        const bval3 = easingFnc(status.now - status.start, bval, bval2 - bval, duration);
        status.current = "#" + padLeft(Math.round(rval3).toString(16), "0", 2) + padLeft(Math.round(gval3).toString(16), "0", 2) +
            padLeft(Math.round(bval3).toString(16), "0", 2);
    }

    // TODO: not supported -> for example color in other format than '#xxxxxx' or anything that does not start with a number
}

function padLeft(str: string, padStr: string, minLength: number): string {
    let result = str;
    while (result.length < minLength) {
        result = padStr + result;
    }
    return result;
}

// t: current time, b: begInnIng value, c: change In value, d: duration
/* BSD Licensed - taken from https://github.com/danro/jquery-easing/blob/master/jquery.easing.js */
const easingFunctions = {
    linear(t, b, c, d) {
        return c / d * t + b; // correct?
    },
    easeInQuad(t, b, c, d) {
        return c * (t /= d) * t + b;
    },
    easeOutQuad(t, b, c, d) {
        return -c * (t /= d) * (t - 2) + b;
    },
    easeInOutQuad(t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t + b;
        return -c / 2 * ((--t) * (t - 2) - 1) + b;
    },
    easeInCubic(t, b, c, d) {
        return c * (t /= d) * t * t + b;
    },
    easeOutCubic(t, b, c, d) {
        return c * ((t = t / d - 1) * t * t + 1) + b;
    },
    easeInOutCubic(t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
        return c / 2 * ((t -= 2) * t * t + 2) + b;
    },
    easeInQuart(t, b, c, d) {
        return c * (t /= d) * t * t * t + b;
    },
    easeOutQuart(t, b, c, d) {
        return -c * ((t = t / d - 1) * t * t * t - 1) + b;
    },
    easeInOutQuart(t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
        return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
    },
    // easeInQuint(t, b, c, d) {
    //     return c * (t /= d) * t * t * t * t + b;
    // },
    // easeOutQuint(t, b, c, d) {
    //     return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
    // },
    // easeInOutQuint(t, b, c, d) {
    //     if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
    //     return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
    // },
    easeInSine(t, b, c, d) {
        return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
    },
    easeOutSine(t, b, c, d) {
        return c * Math.sin(t / d * (Math.PI / 2)) + b;
    },
    easeInOutSine(t, b, c, d) {
        return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
    },
    easeInExpo(t, b, c, d) {
        return (t == 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
    },
    easeOutExpo(t, b, c, d) {
        return (t == d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    },
    easeInOutExpo(t, b, c, d) {
        if (t == 0) return b;
        if (t == d) return b + c;
        if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
        return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
    },
    // easeInCirc(t, b, c, d) {
    //     return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
    // },
    // easeOutCirc(t, b, c, d) {
    //     return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
    // },
    // easeInOutCirc(t, b, c, d) {
    //     if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
    //     return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
    // },
    easeInElastic(t, b, c, d) {
        var s = 1.70158; var p = 0; var a = c;
        if (t == 0) return b; if ((t /= d) == 1) return b + c; if (!p) p = d * .3;
        if (a < Math.abs(c)) { a = c; var s = p / 4; }
        else var s = p / (2 * Math.PI) * Math.asin(c / a);
        return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
    },
    easeOutElastic(t, b, c, d) {
        var s = 1.70158; var p = 0; var a = c;
        if (t == 0) return b; if ((t /= d) == 1) return b + c; if (!p) p = d * .3;
        if (a < Math.abs(c)) { a = c; var s = p / 4; }
        else var s = p / (2 * Math.PI) * Math.asin(c / a);
        return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
    },
    easeInOutElastic(t, b, c, d) {
        var s = 1.70158; var p = 0; var a = c;
        if (t == 0) return b; if ((t /= d / 2) == 2) return b + c; if (!p) p = d * (.3 * 1.5);
        if (a < Math.abs(c)) { a = c; var s = p / 4; }
        else var s = p / (2 * Math.PI) * Math.asin(c / a);
        if (t < 1) return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
        return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * .5 + c + b;
    },
    // easeInBack: function (t, b, c, d, s) {
    //     if (s == undefined) s = 1.70158;
    //     return c * (t /= d) * t * ((s + 1) * t - s) + b;
    // },
    // easeOutBack: function (t, b, c, d, s) {
    //     if (s == undefined) s = 1.70158;
    //     return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
    // },
    // easeInOutBack: function (t, b, c, d, s) {
    //     if (s == undefined) s = 1.70158;
    //     if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
    //     return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
    // },
    easeInBounce(t, b, c, d) {
        return c - easingFunctions.easeOutBounce(d - t, 0, c, d) + b;
    },
    easeOutBounce(t, b, c, d) {
        if ((t /= d) < (1 / 2.75)) {
            return c * (7.5625 * t * t) + b;
        } else if (t < (2 / 2.75)) {
            return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
        } else if (t < (2.5 / 2.75)) {
            return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
        } else {
            return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
        }
    },
    easeInOutBounce(t, b, c, d) {
        if (t < d / 2) return easingFunctions.easeInBounce(t * 2, 0, c, d) * .5 + b;
        return easingFunctions.easeOutBounce(t * 2 - d, 0, c, d) * .5 + c * .5 + b;
    }
};
